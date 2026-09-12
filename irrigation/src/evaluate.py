"""
Evaluation Module for AgriSmart Smart Irrigation.

Calculates:
- Comprehensive multi-class metrics (Accuracy, Macro Precision/Recall/F1, Weighted F1)
- Per-class precision, recall, and F1 (with particular focus on class 1 recall and class 2 F1)
- Confusion matrices (normalized and raw counts)
- Binary classification metrics (Precision, Recall, F1, ROC-AUC, PR-AUC)
- Generation of comparison tables and visualizations
"""

from typing import Dict, Any, List, Optional
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    confusion_matrix,
    classification_report,
    roc_auc_score,
    average_precision_score
)

from preprocessing import CLASS_NAMES, CLASS_DESCRIPTIONS


def compute_multiclass_metrics(
    y_true: np.ndarray,
    y_pred: np.ndarray,
    model_name: str = "Model",
    split_name: str = "Stratified Random",
    inference_time_ms: Optional[float] = None
) -> Dict[str, Any]:
    """
    Compute full evaluation metrics for 3-class classification.
    """
    classes = [0, 1, 2]
    
    acc = float(accuracy_score(y_true, y_pred))
    macro_p = float(precision_score(y_true, y_pred, average="macro", zero_division=0))
    macro_r = float(recall_score(y_true, y_pred, average="macro", zero_division=0))
    macro_f1 = float(f1_score(y_true, y_pred, average="macro", zero_division=0))
    weighted_f1 = float(f1_score(y_true, y_pred, average="weighted", zero_division=0))

    # Per-class metrics
    p_per_class = precision_score(y_true, y_pred, average=None, labels=classes, zero_division=0)
    r_per_class = recall_score(y_true, y_pred, average=None, labels=classes, zero_division=0)
    f1_per_class = f1_score(y_true, y_pred, average=None, labels=classes, zero_division=0)

    cm = confusion_matrix(y_true, y_pred, labels=classes).tolist()

    result = {
        "model": model_name,
        "split": split_name,
        "accuracy": round(acc, 4),
        "macro_precision": round(macro_p, 4),
        "macro_recall": round(macro_r, 4),
        "macro_f1": round(macro_f1, 4),
        "weighted_f1": round(weighted_f1, 4),
        "class_0_precision": round(float(p_per_class[0]), 4),
        "class_0_recall": round(float(r_per_class[0]), 4),
        "class_0_f1": round(float(f1_per_class[0]), 4),
        "class_1_precision": round(float(p_per_class[1]), 4),
        "class_1_recall": round(float(r_per_class[1]), 4),
        "class_1_f1": round(float(f1_per_class[1]), 4),
        "class_2_precision": round(float(p_per_class[2]), 4),
        "class_2_recall": round(float(r_per_class[2]), 4),
        "class_2_f1": round(float(f1_per_class[2]), 4),
        "confusion_matrix": cm,
        "inference_time_ms": round(inference_time_ms, 4) if inference_time_ms is not None else None
    }
    return result


def compute_binary_metrics(
    y_true: np.ndarray,
    y_pred: np.ndarray,
    y_prob: Optional[np.ndarray] = None,
    model_name: str = "Model",
    split_name: str = "Stratified Random"
) -> Dict[str, Any]:
    """
    Compute binary classification metrics where:
    0 = No irrigation required (classes 0 and 2 merged)
    1 = Irrigation required (class 1)
    """
    acc = float(accuracy_score(y_true, y_pred))
    p = float(precision_score(y_true, y_pred, zero_division=0))
    r = float(recall_score(y_true, y_pred, zero_division=0))
    f1 = float(f1_score(y_true, y_pred, zero_division=0))
    
    roc_auc = None
    pr_auc = None
    if y_prob is not None:
        try:
            roc_auc = float(roc_auc_score(y_true, y_prob))
            pr_auc = float(average_precision_score(y_true, y_prob))
        except Exception:
            pass

    cm = confusion_matrix(y_true, y_pred, labels=[0, 1]).tolist()

    return {
        "model": model_name,
        "split": split_name,
        "accuracy": round(acc, 4),
        "precision": round(p, 4),
        "recall": round(r, 4),
        "f1": round(f1, 4),
        "roc_auc": round(roc_auc, 4) if roc_auc is not None else None,
        "pr_auc": round(pr_auc, 4) if pr_auc is not None else None,
        "confusion_matrix": cm
    }


def plot_confusion_matrices(
    cm_dict: Dict[str, List[List[int]]],
    output_path: str,
    class_labels: Optional[List[str]] = None
):
    """
    Plot one or more confusion matrices side-by-side and save to file.
    """
    if class_labels is None:
        class_labels = ["0: No Irrig", "1: Irrig Req", "2: Excess"]

    n_models = len(cm_dict)
    fig, axes = plt.subplots(1, n_models, figsize=(6 * n_models, 5), squeeze=False)

    for idx, (title, cm) in enumerate(cm_dict.items()):
        ax = axes[0, idx]
        cm_arr = np.array(cm)
        sns.heatmap(
            cm_arr,
            annot=True,
            fmt="d",
            cmap="Blues",
            xticklabels=class_labels,
            yticklabels=class_labels,
            ax=ax,
            cbar=False
        )
        ax.set_title(title, fontsize=11, fontweight="bold")
        ax.set_xlabel("Predicted Label", fontsize=10)
        ax.set_ylabel("True Label", fontsize=10)

    plt.tight_layout()
    plt.savefig(output_path, dpi=200, bbox_inches="tight")
    plt.close()
    print(f"[Evaluation] Saved confusion matrix plot to {output_path}")
