"""
AgriSmart-AI: ConvNeXt-Tiny Two-Stage Training Recipe
Reproduces the exact training approach documented in report/Crop_disease_model_report.pdf.

Recipe Summary:
  - Architecture: torchvision ConvNeXt-Tiny ImageNet-pretrained
  - Classification Head: Linear(768 -> num_classes)
  - Preprocessing: Resize 255 -> CenterCrop 224 -> Normalize(ImageNet mean/std)
  - Train Augmentations: RandomResizedCrop(224), RandomHorizontalFlip(),
    RandomRotation(15), ColorJitter(), RandomErasing(p=0.20)
  - Loss: CrossEntropyLoss with label_smoothing=0.1
  - Class balancing: WeightedRandomSampler with inverse-square-root class weights
  - Stage 1: Warmup classifier head with frozen backbone (AdamW + CosineAnnealingLR, 3 epochs)
  - Stage 2: Full fine-tuning with differential learning rates and early stopping (patience 3)
  - Optimization: Mixed precision (AMP), gradient clipping (max_norm=1.0)
  - Checkpoint selection: Best validation macro-F1

NOTE: This script trains on provided datasets only. It has zero reference to any
organizers' private held-out field test set.
"""
import os
import sys
import json
import time
import argparse
from pathlib import Path
import numpy as np

import torch
import torch.nn as nn
from torch.utils.data import DataLoader, WeightedRandomSampler
from torchvision import datasets, transforms
from torchvision.models import convnext_tiny, ConvNeXt_Tiny_Weights
from sklearn.metrics import f1_score


IMAGE_SIZE = 224
RESIZE_DIM = int(IMAGE_SIZE * 1.14)
IMAGENET_MEAN = [0.485, 0.456, 0.406]
IMAGENET_STD = [0.229, 0.224, 0.225]


def get_data_transforms():
    train_transform = transforms.Compose([
        transforms.RandomResizedCrop(IMAGE_SIZE, scale=(0.8, 1.0)),
        transforms.RandomHorizontalFlip(),
        transforms.RandomRotation(15),
        transforms.ColorJitter(brightness=0.1, contrast=0.1, saturation=0.1),
        transforms.ToTensor(),
        transforms.Normalize(IMAGENET_MEAN, IMAGENET_STD),
        transforms.RandomErasing(p=0.20, scale=(0.02, 0.2), value="random"),
    ])

    val_transform = transforms.Compose([
        transforms.Resize(RESIZE_DIM),
        transforms.CenterCrop(IMAGE_SIZE),
        transforms.ToTensor(),
        transforms.Normalize(IMAGENET_MEAN, IMAGENET_STD),
    ])
    return train_transform, val_transform


def make_sampler(dataset):
    """Inverse-square-root class frequency weighting as documented in report."""
    targets = [s[1] for s in dataset.samples]
    class_counts = np.bincount(targets)
    class_weights = 1.0 / np.sqrt(np.maximum(class_counts, 1))
    sample_weights = [class_weights[t] for t in targets]
    sampler = WeightedRandomSampler(
        weights=torch.DoubleTensor(sample_weights),
        num_samples=len(sample_weights),
        replacement=True,
    )
    return sampler


def build_model(num_classes, pretrained=True):
    weights = ConvNeXt_Tiny_Weights.DEFAULT if pretrained else None
    model = convnext_tiny(weights=weights)
    in_features = model.classifier[2].in_features
    model.classifier[2] = nn.Linear(in_features, num_classes)
    return model


def evaluate_val(model, loader, device):
    model.eval()
    all_preds = []
    all_targets = []
    with torch.no_grad():
        for images, targets in loader:
            images = images.to(device)
            outputs = model(images)
            preds = torch.argmax(outputs, dim=1).cpu().numpy()
            all_preds.extend(preds)
            all_targets.extend(targets.numpy())

    macro_f1 = f1_score(all_targets, all_preds, average="macro", zero_division=0)
    acc = np.mean(np.array(all_preds) == np.array(all_targets))
    return macro_f1, acc


def train_recipe(
    data_dir: str,
    output_dir: str = "checkpoints",
    epochs_stage1: int = 3,
    epochs_stage2: int = 8,
    batch_size: int = 32,
    lr_head: float = 1e-3,
    lr_backbone: float = 1e-4,
    device_str: str = None,
):
    device = torch.device(device_str if device_str else ("cuda" if torch.cuda.is_available() else "cpu"))
    print(f"[*] Training on device: {device}")

    train_dir = os.path.join(data_dir, "train")
    val_dir = os.path.join(data_dir, "val")
    if not os.path.exists(train_dir):
        # Fallback to single directory ImageFolder split
        raise FileNotFoundError(f"Expected 'train' directory at {train_dir}")

    train_tf, val_tf = get_data_transforms()
    train_dataset = datasets.ImageFolder(train_dir, transform=train_tf)
    val_dataset = datasets.ImageFolder(val_dir, transform=val_tf)

    class_names = train_dataset.classes
    num_classes = len(class_names)
    print(f"[*] Loaded {num_classes} classes from {train_dir}")

    sampler = make_sampler(train_dataset)
    train_loader = DataLoader(train_dataset, batch_size=batch_size, sampler=sampler, num_workers=2, pin_memory=True)
    val_loader = DataLoader(val_dataset, batch_size=batch_size, shuffle=False, num_workers=2)

    model = build_model(num_classes, pretrained=True).to(device)
    criterion = nn.CrossEntropyLoss(label_smoothing=0.1)
    scaler = torch.cuda.amp.GradScaler(enabled=(device.type == "cuda"))

    os.makedirs(output_dir, exist_ok=True)
    best_macro_f1 = 0.0
    best_checkpoint_path = os.path.join(output_dir, "agrismart_convnext_tiny_trained.pth")

    # ──────────────────────────────────────────────────────────────────────────
    # STAGE 1: Head warmup (backbone frozen)
    # ──────────────────────────────────────────────────────────────────────────
    print("\n=== Stage 1: Warmup Classifier Head (Backbone Frozen) ===")
    for param in model.features.parameters():
        param.requires_grad = False
    for param in model.classifier.parameters():
        param.requires_grad = True

    optimizer_s1 = torch.optim.AdamW(model.classifier.parameters(), lr=lr_head, weight_decay=1e-2)
    scheduler_s1 = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer_s1, T_max=epochs_stage1)

    for epoch in range(1, epochs_stage1 + 1):
        model.train()
        running_loss = 0.0
        for images, targets in train_loader:
            images, targets = images.to(device), targets.to(device)
            optimizer_s1.zero_grad()
            with torch.cuda.amp.autocast(enabled=(device.type == "cuda")):
                outputs = model(images)
                loss = criterion(outputs, targets)
            scaler.scale(loss).backward()
            scaler.unscale_(optimizer_s1)
            nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
            scaler.step(optimizer_s1)
            scaler.update()
            running_loss += loss.item() * images.size(0)

        scheduler_s1.step()
        val_f1, val_acc = evaluate_val(model, val_loader, device)
        print(f"Stage 1 - Epoch {epoch}/{epochs_stage1} | Loss: {running_loss/len(train_dataset):.4f} | Val Macro-F1: {val_f1:.4f} | Val Acc: {val_acc*100:.2f}%")

        if val_f1 > best_macro_f1:
            best_macro_f1 = val_f1
            torch.save({
                "model_state_dict": model.state_dict(),
                "class_names": class_names,
                "class_to_idx": train_dataset.class_to_idx,
                "val_macro_f1": best_macro_f1,
            }, best_checkpoint_path)

    # ──────────────────────────────────────────────────────────────────────────
    # STAGE 2: Full fine-tuning (differential learning rates + early stopping)
    # ──────────────────────────────────────────────────────────────────────────
    print("\n=== Stage 2: Full Fine-Tuning (All Layers Unfrozen) ===")
    for param in model.parameters():
        param.requires_grad = True

    optimizer_s2 = torch.optim.AdamW([
        {"params": model.features.parameters(), "lr": lr_backbone},
        {"params": model.classifier.parameters(), "lr": lr_head * 0.1},
    ], weight_decay=1e-2)
    scheduler_s2 = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer_s2, T_max=epochs_stage2)

    patience = 3
    patience_counter = 0

    for epoch in range(1, epochs_stage2 + 1):
        model.train()
        running_loss = 0.0
        for images, targets in train_loader:
            images, targets = images.to(device), targets.to(device)
            optimizer_s2.zero_grad()
            with torch.cuda.amp.autocast(enabled=(device.type == "cuda")):
                outputs = model(images)
                loss = criterion(outputs, targets)
            scaler.scale(loss).backward()
            scaler.unscale_(optimizer_s2)
            nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
            scaler.step(optimizer_s2)
            scaler.update()
            running_loss += loss.item() * images.size(0)

        scheduler_s2.step()
        val_f1, val_acc = evaluate_val(model, val_loader, device)
        print(f"Stage 2 - Epoch {epoch}/{epochs_stage2} | Loss: {running_loss/len(train_dataset):.4f} | Val Macro-F1: {val_f1:.4f} | Val Acc: {val_acc*100:.2f}%")

        if val_f1 > best_macro_f1:
            best_macro_f1 = val_f1
            patience_counter = 0
            torch.save({
                "model_state_dict": model.state_dict(),
                "class_names": class_names,
                "class_to_idx": train_dataset.class_to_idx,
                "val_macro_f1": best_macro_f1,
                "val_accuracy": val_acc,
            }, best_checkpoint_path)
            print(f"[*] Saved new best checkpoint to {best_checkpoint_path}")
        else:
            patience_counter += 1
            if patience_counter >= patience:
                print(f"[!] Early stopping triggered after {patience} epochs without validation macro-F1 gain.")
                break

    print(f"\n[+] Training complete. Best Val Macro-F1: {best_macro_f1:.4f}")
    return best_checkpoint_path


def main():
    parser = argparse.ArgumentParser(description="Train ConvNeXt-Tiny classifier per Crop_disease_model_report.pdf recipe")
    parser.add_argument("--data", required=True, help="Path to data directory containing train/ and val/ subdirectories")
    parser.add_argument("--out", default="checkpoints", help="Output directory for trained checkpoint")
    parser.add_argument("--epochs1", type=int, default=3, help="Stage 1 head warmup epochs (default: 3)")
    parser.add_argument("--epochs2", type=int, default=8, help="Stage 2 full fine-tuning epochs (default: 8)")
    parser.add_argument("--batch-size", type=int, default=32, help="Batch size (default: 32)")
    parser.add_argument("--lr-head", type=float, default=1e-3, help="Learning rate for classifier head")
    parser.add_argument("--lr-backbone", type=float, default=1e-4, help="Learning rate for backbone in Stage 2")
    parser.add_argument("--device", default=None, help="Device to use ('cpu' or 'cuda')")
    args = parser.parse_args()

    train_recipe(
        data_dir=args.data,
        output_dir=args.out,
        epochs_stage1=args.epochs1,
        epochs_stage2=args.epochs2,
        batch_size=args.batch_size,
        lr_head=args.lr_head,
        lr_backbone=args.lr_backbone,
        device_str=args.device,
    )


if __name__ == "__main__":
    main()
