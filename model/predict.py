"""
AgriSmart AI — Crop Disease Prediction (SIH 2026, Core Task)
Usage:
    python predict.py --image path/to/leaf.jpg
    python predict.py --image path/to/leaf.jpg --model path/to/model.pth
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


def load_model(model_path, device):
    if not os.path.isfile(model_path):
        raise FileNotFoundError(f"Model checkpoint not found at: {model_path}")

    checkpoint = torch.load(model_path, map_location=device)

    if "class_names" not in checkpoint:
        raise KeyError(
            "Checkpoint does not contain 'class_names'. "
            "Make sure you are using the FINAL packaged model, not a raw stage checkpoint."
        )

    class_names = checkpoint["class_names"]
    num_classes = len(class_names)

    model = convnext_tiny(weights=None)
    in_features = model.classifier[2].in_features
    model.classifier[2] = nn.Linear(in_features, num_classes)
    model.load_state_dict(checkpoint["model_state_dict"])
    model.to(device)
    model.eval()

    return model, class_names


def preprocess_image(image_path):
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
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

    model, class_names = load_model(model_path, device)
    image_tensor = preprocess_image(image_path).to(device)

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
        predicted_class, confidence = predict(args.image, args.model)
    except (FileNotFoundError, KeyError) as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)

    print(f"Predicted class: {predicted_class}")
    print(f"Confidence: {confidence:.4f}")


if __name__ == "__main__":
    main()
