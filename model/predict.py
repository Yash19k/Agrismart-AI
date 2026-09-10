"""
Prediction interface for AGRI SMART AI.

Accepts a single leaf/crop image and returns a class label and prediction details.
"""


def predict_image(image_path: str):
    """
    Predict disease/healthy class for a single leaf/crop image.

    Args:
        image_path (str): Path to input crop/leaf image file.

    Returns:
        dict: Prediction results including class label and precautionary guidance.
    """
    raise NotImplementedError("Prediction interface is not yet implemented.")
