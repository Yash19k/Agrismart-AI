"""
AgriSmart AI -- Crop Disease Prediction (SIH 2026, Core Task)

Required core-task interface (PS Section 4.1):
    predict(image_path) -> class_label

CLI usage:
    python predict.py --image path/to/leaf.jpg
    python predict.py --image path/to/leaf.jpg --model path/to/model.pth

Library usage:
    from predict import predict
    label = predict("path/to/leaf.jpg")
"""

import argparse
import os
import sys

import torch
import torch.nn as nn
from torchvision import transforms
from torchvision.models import convnext_tiny
from PIL import Image

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DEFAULT_MODEL_PATH = os.path.join(SCRIPT_DIR, "agrismart_convnext_tiny_final.pth")

IMAGE_SIZE = 224
IMAGENET_MEAN = [0.485, 0.456, 0.406]
IMAGENET_STD = [0.229, 0.224, 0.225]

# Keyed by model_path so repeated predict() calls in the same process
# (e.g. a web app handling many requests) don't reload weights every time.
_MODEL_CACHE = {}


def _load_model(model_path, device):
    if model_path in _MODEL_CACHE:
        return _MODEL_CACHE[model_path]

    if not os.path.isfile(model_path):
        raise FileNotFoundError(f"Model checkpoint not found at: {model_path}")

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
        class_json_path = os.path.join(os.path.dirname(model_path), "class_names.json")
        if os.path.isfile(class_json_path):
            import json
            with open(class_json_path, "r", encoding="utf-8") as f:
                class_names = json.load(f)
        else:
            raise KeyError(
                "Checkpoint does not contain 'class_names' and class_names.json was not found."
            )

    num_classes = len(class_names)

    model = convnext_tiny(weights=None)
    in_features = model.classifier[2].in_features
    model.classifier[2] = nn.Linear(in_features, num_classes)
    model.load_state_dict(checkpoint["model_state_dict"])
    model.to(device)
    model.eval()

    _MODEL_CACHE[model_path] = (model, class_names)
    return model, class_names


def _preprocess_image(image_path):
    if not os.path.isfile(image_path):
        raise FileNotFoundError(f"Image not found at: {image_path}")

    transform = transforms.Compose([
        transforms.Resize(int(IMAGE_SIZE * 1.14)),
        transforms.CenterCrop(IMAGE_SIZE),
        transforms.ToTensor(),
        transforms.Normalize(IMAGENET_MEAN, IMAGENET_STD),
    ])

    image = Image.open(image_path).convert("RGB")
    return transform(image).unsqueeze(0)


def predict(image_path, model_path=DEFAULT_MODEL_PATH):
    """Core-task interface required by the PS: predict(image_path) -> class_label (str)."""
    label, _confidence = predict_with_confidence(image_path, model_path=model_path)
    return label


def predict_with_confidence(image_path, model_path=DEFAULT_MODEL_PATH):
    """Same as predict(), but also returns the softmax confidence. Used by the
    CLI below and by app/farmer_app.py to show a confidence score to the farmer."""
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

    model, class_names = _load_model(model_path, device)
    image_tensor = _preprocess_image(image_path).to(device)

    with torch.no_grad():
        outputs = model(image_tensor)
        probabilities = torch.softmax(outputs, dim=1)
        confidence, predicted_idx = torch.max(probabilities, dim=1)

    predicted_class = class_names[predicted_idx.item()]
    return predicted_class, confidence.item()


def main():
    parser = argparse.ArgumentParser(description="Predict crop disease from a leaf image")
    parser.add_argument("--image", required=True, help="Path to the leaf image file")
    parser.add_argument("--model", default=DEFAULT_MODEL_PATH, help="Path to the trained model checkpoint")
    args = parser.parse_args()

    try:
        predicted_class, confidence = predict_with_confidence(args.image, args.model)
    except (FileNotFoundError, KeyError) as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)

    print(f"Predicted class: {predicted_class}")
    print(f"Confidence: {confidence:.4f}")


if __name__ == "__main__":
    main()
