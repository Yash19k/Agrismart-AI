"""
AgriSmart AI -- Crop Disease Prediction CLI & Library wrapper
Wraps model/crop_disease_detection/predict.py
"""
import os
import sys

# Add crop_disease_detection directory to sys.path
PKG_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "crop_disease_detection")
if PKG_DIR not in sys.path:
    sys.path.insert(0, PKG_DIR)

from predict import predict, predict_with_confidence, main

if __name__ == "__main__":
    main()
