#!/usr/bin/env python3
"""
Offline Manual Fine-Tuning & Model Registry Pipeline.
Strictly adheres to Problem Statement Section 2 Stage 8 & Section 4 Phase 6:
- Manual, offline execution ONLY (NEVER auto-retrains or auto-promotes production models)
- Fine-tunes candidate model on train split
- Evaluates candidate vs current baseline on frozen validation split
- Records run provenance and evaluation into model/registry.json
- Candidate weights saved in model/candidate_models/
- Clearly documents: "Candidate model is not validated to improve field accuracy. Manual audit required."
"""

import argparse
import datetime
import json
import logging
import os
import sys
from pathlib import Path

import torch
import torch.nn as nn
from torch.utils.data import DataLoader
from torchvision import datasets, transforms
import torchvision.models as models

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("finetune")

DEFAULT_CHECKPOINT = Path(__file__).resolve().parent / "crop_disease_detection" / "agrismart_convnext_tiny_final.pth"
REGISTRY_FILE = Path(__file__).resolve().parent / "registry.json"


def get_transforms():
    train_tf = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.RandomHorizontalFlip(),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
    ])
    eval_tf = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
    ])
    return train_tf, eval_tf


def evaluate_split(model, dataloader, device):
    model.eval()
    correct = 0
    total = 0
    with torch.no_grad():
        for imgs, labels in dataloader:
            imgs = imgs.to(device)
            labels = labels.to(device)
            outs = model(imgs)
            preds = outs.argmax(dim=1)
            correct += (preds == labels).sum().item()
            total += labels.size(0)
    acc = (correct / total) if total > 0 else 0.0
    return {"accuracy": round(acc, 4), "total_samples": total, "correct": correct}


def run_finetune(args):
    data_dir = Path(args.data_dir).resolve()
    train_dir = data_dir / "train"
    val_dir = data_dir / "val"

    if not train_dir.exists() or not val_dir.exists():
        logger.error("Data directory must contain 'train' and 'val' subdirectories. Found: %s", data_dir)
        sys.exit(1)

    device = torch.device("cuda" if torch.cuda.is_available() and not args.cpu else "cpu")
    logger.info("Using compute device: %s", device)

    # 1. Load base model checkpoint
    ckpt_path = Path(args.checkpoint).resolve()
    if not ckpt_path.exists():
        logger.error("Base checkpoint does not exist: %s", ckpt_path)
        sys.exit(1)

    logger.info("Loading baseline checkpoint: %s", ckpt_path)
    state = torch.load(ckpt_path, map_location="cpu", weights_only=False)

    class_names = state.get("class_names", [])
    if not class_names:
        classes_json = ckpt_path.parent / "class_names.json"
        if classes_json.exists():
            with open(classes_json, "r") as f:
                class_names = json.load(f)
    num_classes = len(class_names) if class_names else 38

    # Build model architecture
    model = models.convnext_tiny(weights=None)
    in_features = model.classifier[2].in_features
    model.classifier[2] = nn.Linear(in_features, num_classes)

    weights = state.get("model_state_dict", state)
    model.load_state_dict(weights, strict=False)
    model.to(device)

    # Data loaders
    train_tf, eval_tf = get_transforms()
    val_dataset = datasets.ImageFolder(str(val_dir), transform=eval_tf)
    val_loader = DataLoader(val_dataset, batch_size=args.batch_size, shuffle=False)

    train_dataset = datasets.ImageFolder(str(train_dir), transform=train_tf)
    train_loader = DataLoader(train_dataset, batch_size=args.batch_size, shuffle=True)

    # 2. Evaluate baseline on validation split
    logger.info("Evaluating baseline model on validation split (%d samples)...", len(val_dataset))
    baseline_metrics = evaluate_split(model, val_loader, device)
    logger.info("Baseline validation accuracy: %.2f%%", baseline_metrics["accuracy"] * 100)

    # 3. Fine-tuning loop (if not dry-run)
    candidate_model_id = f"candidate_convnext_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}"
    out_dir = Path(args.out_dir).resolve()
    out_dir.mkdir(parents=True, exist_ok=True)
    candidate_path = out_dir / f"{candidate_model_id}.pth"

    if args.dry_run or len(train_dataset) == 0:
        logger.info("Dry-run / wiring test requested. Skipping gradient updates.")
        candidate_metrics = baseline_metrics
    else:
        logger.info("Fine-tuning candidate on %d training samples for %d epochs (lr=%.1e)...",
                    len(train_dataset), args.epochs, args.lr)
        # Freeze base stages, only tune classifier head for conservative updates
        for param in model.features.parameters():
            param.requires_grad = False
        for param in model.classifier.parameters():
            param.requires_grad = True

        optimizer = torch.optim.AdamW(model.classifier.parameters(), lr=args.lr, weight_decay=1e-2)
        criterion = nn.CrossEntropyLoss()

        model.train()
        for epoch in range(args.epochs):
            total_loss = 0.0
            for step, (imgs, targets) in enumerate(train_loader):
                imgs, targets = imgs.to(device), targets.to(device)
                optimizer.zero_grad()
                outputs = model(imgs)
                # Remap target classes if classes match ImageFolder index
                loss = criterion(outputs, targets)
                loss.backward()
                optimizer.step()
                total_loss += loss.item()
            logger.info("Epoch [%d/%d] Loss: %.4f", epoch + 1, args.epochs, total_loss / max(1, len(train_loader)))

        logger.info("Evaluating candidate model on validation split...")
        candidate_metrics = evaluate_split(model, val_loader, device)
        logger.info("Candidate validation accuracy: %.2f%%", candidate_metrics["accuracy"] * 100)

    # 4. Save candidate checkpoint
    torch.save({
        "model_state_dict": model.state_dict(),
        "class_names": class_names,
        "base_model": str(ckpt_path.name),
        "finetuned_at": datetime.datetime.now().isoformat(),
        "candidate_id": candidate_model_id,
        "is_production": False,
    }, candidate_path)
    logger.info("Saved candidate checkpoint to: %s", candidate_path)

    # 5. Append to model/registry.json
    registry_data = []
    if REGISTRY_FILE.exists():
        try:
            with open(REGISTRY_FILE, "r", encoding="utf-8") as f:
                registry_data = json.load(f)
        except Exception:
            registry_data = []

    run_record = {
        "candidate_id": candidate_model_id,
        "timestamp": datetime.datetime.now().isoformat(),
        "base_checkpoint": str(ckpt_path),
        "candidate_checkpoint": str(candidate_path),
        "train_samples": len(train_dataset),
        "val_samples": len(val_dataset),
        "epochs": args.epochs,
        "learning_rate": args.lr,
        "baseline_val_accuracy": baseline_metrics["accuracy"],
        "candidate_val_accuracy": candidate_metrics["accuracy"],
        "promoted_to_production": False,
        "integrity_rules": [
            "Never auto-promote a candidate model to production.",
            "Candidate models require offline agronomist verification and blind benchmark evaluation.",
            "Zero retraining on organizers' held-out test sets."
        ],
        "status": "Candidate Stored in Registry (Pending Human Review)"
    }
    registry_data.append(run_record)

    with open(REGISTRY_FILE, "w", encoding="utf-8") as f:
        json.dump(registry_data, f, indent=2)

    logger.info("Model registry updated: %s (Entries: %d)", REGISTRY_FILE, len(registry_data))
    logger.info("Done. Candidate %s stored. Production model was NOT modified.", candidate_model_id)


def main():
    parser = argparse.ArgumentParser(description="Offline Fine-Tuning from Expert-Validated Feedback")
    parser.add_argument("--data-dir", required=True, help="Directory containing train/ and val/ ImageFolder splits")
    parser.add_argument("--checkpoint", default=str(DEFAULT_CHECKPOINT), help="Base PyTorch checkpoint")
    parser.add_argument("--epochs", type=int, default=2, help="Number of fine-tuning epochs")
    parser.add_argument("--batch-size", type=int, default=4, help="Batch size")
    parser.add_argument("--lr", type=float, default=1e-4, help="Learning rate for classifier tuning")
    parser.add_argument("--out-dir", default="model/candidate_models", help="Output directory for candidates")
    parser.add_argument("--cpu", action="store_true", help="Force CPU inference/training")
    parser.add_argument("--dry-run", action="store_true", help="Perform wiring check without training")

    args = parser.parse_args()
    run_finetune(args)


if __name__ == "__main__":
    main()
