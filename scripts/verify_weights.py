"""
Weights verification script for AgriSmart-AI ConvNeXt-Tiny model.
Verifies file presence, LFS pointer status, file size, and SHA256 checksum.
"""
import os
import sys
import hashlib
import argparse

EXPECTED_SHA256 = "f0d49973b75184cf793b195094a6e88b1617c80f1d5b284d1302bfed37dd7040"
EXPECTED_SIZE = 111470075

DEFAULT_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "model",
    "crop_disease_detection",
    "agrismart_convnext_tiny_final.pth",
)


def verify_weights(model_path: str = DEFAULT_PATH) -> bool:
    if not os.path.exists(model_path):
        print(f"[ERROR] Model weights file not found at: {model_path}", file=sys.stderr)
        print("To download weights: run 'git lfs pull' or download from release and verify sha256.", file=sys.stderr)
        return False

    file_size = os.path.getsize(model_path)

    # Check for Git LFS pointer
    with open(model_path, "rb") as f:
        header = f.read(200)

    if header.startswith(b"version https://git-lfs") or file_size < 1024:
        print(f"[ERROR] File at {model_path} is a Git LFS pointer ({file_size} bytes), not actual weights.", file=sys.stderr)
        print("Weights not downloaded: run 'git lfs pull', or download from GitHub release and verify sha256.", file=sys.stderr)
        return False

    # Compute SHA256
    sha256 = hashlib.sha256()
    with open(model_path, "rb") as f:
        while chunk := f.read(65536):
            sha256.update(chunk)
    actual_hash = sha256.hexdigest()

    print(f"File path: {model_path}")
    print(f"File size: {file_size} bytes (expected {EXPECTED_SIZE})")
    print(f"SHA-256:   {actual_hash}")

    if actual_hash == EXPECTED_SHA256:
        print("[SUCCESS] Checksum verified. Model weights are genuine and intact.")
        return True
    else:
        print(f"[ERROR] Checksum mismatch! Expected {EXPECTED_SHA256}, got {actual_hash}", file=sys.stderr)
        return False


def main():
    parser = argparse.ArgumentParser(description="Verify AgriSmart-AI model weights")
    parser.add_argument("--path", default=DEFAULT_PATH, help="Path to weights file")
    args = parser.parse_args()

    success = verify_weights(args.path)
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
