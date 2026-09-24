"""
AgriSmart-AI Model Evaluation Script (SIH 2026 Core Task)
Evaluates ConvNeXt-Tiny crop disease classifier on an ImageFolder directory.
Computes:
  - Macro-F1 (primary metric)
  - Raw Accuracy and Weighted F1
  - Per-class Precision, Recall, F1, and Support
  - Confusion Matrix (CSV and PNG)
Writes results to output directory (default: report/).
"""
import os
import sys
import json
import argparse
import numpy as np
import torch
import torch.nn as nn
from torchvision import transforms, datasets
from torchvision.models import convnext_tiny
from torch.utils.data import DataLoader
from sklearn.metrics import classification_report, confusion_matrix, f1_score, accuracy_score
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DEFAULT_MODEL_PATH = os.path.join(SCRIPT_DIR, "crop_disease_detection", "agrismart_convnext_tiny_final.pth")
DEFAULT_OUT_DIR = os.path.join(os.path.dirname(SCRIPT_DIR), "report")

IMAGE_SIZE = 224
RESIZE_DIM = int(IMAGE_SIZE * 1.14)
IMAGENET_MEAN = [0.485, 0.456, 0.406]
IMAGENET_STD = [0.229, 0.224, 0.225]


def load_model(model_path, device):
    if not os.path.isfile(model_path):
        raise FileNotFoundError(f"Model checkpoint not found at: {model_path}")

    # Check for Git LFS pointer
    with open(model_path, "rb") as f:
        header = f.read(200)
    if header.startswith(b"version https://git-lfs") or os.path.getsize(model_path) < 1024:
        raise RuntimeError(
            f"Weights not downloaded at {model_path}: file is a Git LFS pointer. "
            "Run 'git lfs pull', or download from GitHub Releases and verify sha256."
        )

    checkpoint = torch.load(model_path, map_location=device, weights_only=False)
    class_names = checkpoint.get("class_names")
    if not class_names:
        raise KeyError("Checkpoint missing 'class_names'.")

    num_classes = len(class_names)
    model = convnext_tiny(weights=None)
    in_features = model.classifier[2].in_features
    model.classifier[2] = nn.Linear(in_features, num_classes)
    model.load_state_dict(checkpoint["model_state_dict"])
    model.to(device)
    model.eval()
    return model, class_names


def evaluate(data_dir, model_path=DEFAULT_MODEL_PATH, out_dir=DEFAULT_OUT_DIR, batch_size=32, device_str=None):
    if device_str:
        device = torch.device(device_str)
    else:
        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

    print(f"[*] Evaluating dataset at: {data_dir}")
    print(f"[*] Model checkpoint:      {model_path}")
    print(f"[*] Compute device:        {device}")
    print(f"[*] Output directory:      {out_dir}")

    os.makedirs(out_dir, exist_ok=True)

    model, model_class_names = load_model(model_path, device)
    class_to_idx = {name: idx for idx, name in enumerate(model_class_names)}

    val_transform = transforms.Compose([
        transforms.Resize(RESIZE_DIM),
        transforms.CenterCrop(IMAGE_SIZE),
        transforms.ToTensor(),
        transforms.Normalize(IMAGENET_MEAN, IMAGENET_STD),
    ])

    dataset = datasets.ImageFolder(data_dir, transform=val_transform)
    loader = DataLoader(dataset, batch_size=batch_size, shuffle=False, num_workers=0)

    # Map dataset class indices to model class indices
    dataset_to_model_idx = {}
    for ds_idx, class_name in enumerate(dataset.classes):
        if class_name in class_to_idx:
            dataset_to_model_idx[ds_idx] = class_to_idx[class_name]
        else:
            print(f"[!] Warning: Dataset class '{class_name}' not in model's class list.")

    all_preds = []
    all_targets = []

    with torch.no_grad():
        for images, targets in loader:
            images = images.to(device)
            outputs = model(images)
            preds = torch.argmax(outputs, dim=1).cpu().numpy()

            for p, t in zip(preds, targets.numpy()):
                if t in dataset_to_model_idx:
                    all_preds.append(p)
                    all_targets.append(dataset_to_model_idx[t])

    if not all_targets:
        print("[ERROR] No valid matching classes found between dataset and model.", file=sys.stderr)
        return None

    y_true = np.array(all_targets)
    y_pred = np.array(all_preds)

    # Present classes in evaluation
    present_labels = sorted(list(set(y_true) | set(y_pred)))
    target_names = [model_class_names[idx] for idx in present_labels]

    macro_f1 = float(f1_score(y_true, y_pred, average="macro", zero_division=0))
    weighted_f1 = float(f1_score(y_true, y_pred, average="weighted", zero_division=0))
    accuracy = float(accuracy_score(y_true, y_pred))

    clf_report = classification_report(
        y_true, y_pred, labels=present_labels, target_names=target_names, output_dict=True, zero_division=0
    )

    cm = confusion_matrix(y_true, y_pred, labels=present_labels)

    # 1. Write metrics.json
    metrics_data = {
        "evaluation_dataset": os.path.basename(os.path.abspath(data_dir)),
        "num_samples": len(y_true),
        "num_classes_evaluated": len(present_labels),
        "total_model_classes": len(model_class_names),
        "macro_f1": round(macro_f1, 4),
        "weighted_f1": round(weighted_f1, 4),
        "accuracy": round(accuracy, 4),
        "per_class": {
            target_names[i]: {
                "precision": round(clf_report[target_names[i]]["precision"], 4),
                "recall": round(clf_report[target_names[i]]["recall"], 4),
                "f1_score": round(clf_report[target_names[i]]["f1-score"], 4),
                "support": int(clf_report[target_names[i]]["support"]),
            }
            for i in range(len(target_names))
        },
    }

    metrics_file = os.path.join(out_dir, "metrics.json")
    with open(metrics_file, "w", encoding="utf-8") as f:
        json.dump(metrics_data, f, indent=2)
    print(f"[+] Metrics saved to: {metrics_file}")

    # 2. Write confusion_matrix.csv
    cm_csv_file = os.path.join(out_dir, "confusion_matrix.csv")
    with open(cm_csv_file, "w", encoding="utf-8") as f:
        f.write("True_Class," + ",".join(target_names) + "\n")
        for i, row in enumerate(cm):
            f.write(f"{target_names[i]}," + ",".join(map(str, row)) + "\n")
    print(f"[+] Confusion matrix CSV saved to: {cm_csv_file}")

    # 3. Save confusion_matrix.png
    plt.figure(figsize=(max(8, len(target_names) * 0.6), max(6, len(target_names) * 0.5)))
    plt.imshow(cm, interpolation="nearest", cmap=plt.cm.Blues)
    plt.title(f"Confusion Matrix (Macro-F1: {macro_f1:.4f}, Acc: {accuracy:.4f})")
    plt.colorbar()
    tick_marks = np.arange(len(target_names))
    plt.xticks(tick_marks, target_names, rotation=90, fontsize=8)
    plt.yticks(tick_marks, target_names, fontsize=8)
    plt.ylabel("True Class")
    plt.xlabel("Predicted Class")
    plt.tight_layout()
    cm_png_file = os.path.join(out_dir, "confusion_matrix.png")
    plt.savefig(cm_png_file, dpi=150, bbox_inches="tight")
    plt.close()
    print(f"[+] Confusion matrix plot saved to: {cm_png_file}")

    print("\n--- Summary Results ---")
    print(f"Samples Evaluated: {len(y_true)}")
    print(f"Macro-F1:          {macro_f1:.4f}")
    print(f"Accuracy:          {accuracy:.4f} ({accuracy * 100:.2f}%)")
    print(f"Weighted-F1:       {weighted_f1:.4f}")
    return metrics_data


def main():
    parser = argparse.ArgumentParser(description="Evaluate AgriSmart ConvNeXt-Tiny classifier on an ImageFolder")
    parser.add_argument("--data", required=True, help="Path to ImageFolder formatted test directory")
    parser.add_argument("--model", default=DEFAULT_MODEL_PATH, help="Path to .pth checkpoint")
    parser.add_argument("--out", default=DEFAULT_OUT_DIR, help="Output directory for metrics.json and confusion matrix")
    parser.add_argument("--batch-size", type=int, default=32, help="Batch size for inference")
    parser.add_argument("--device", default=None, help="Device to use ('cpu' or 'cuda')")
    args = parser.parse_args()

    evaluate(args.data, model_path=args.model, out_dir=args.out, batch_size=args.batch_size, device_str=args.device)


if __name__ == "__main__":
    main()
