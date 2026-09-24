# AgriSmart-AI: Crop Disease Vision Model Report

**Evaluation Report for ConvNeXt-Tiny Crop Leaf Diagnostic Classifier**  
*Document Version: 1.0 · Date: September 2026 · Smart India Hackathon Prototype*

---

## 1. Task Description & Scope
The diagnostic vision component classifies single-leaf foliar symptoms across 38 distinct crop-disease categories (covering 14 plant species plus healthy controls). It serves as **Stage 1a** of the AgriSmart-AI crop protection workflow, providing automated preliminary symptom detection that directly feeds weather-based risk forecasting (Stage 2) and integrated pest management (IPM) decision support (Stage 3).

---

## 2. Dataset & Splitting Methodology
- **Source Dataset**: PlantVillage laboratory dataset (54,305 images across 38 classes).
- **Split Protocol**: 70% Training (38,014 images), 15% Validation (8,145 images), 15% Held-out Test (8,146 images), split deterministically with fixed random seed (42) and stratified by class.
- **Preprocessing & Augmentation**:
  - Training: RandomResizedCrop(224, scale=(0.8, 1.0)), RandomHorizontalFlip(), RandomRotation(15°), ColorJitter(brightness=0.2, contrast=0.2), ImageNet normalization.
  - Evaluation: Resize(256), CenterCrop(224), ImageNet normalization.
- **Field-Condition Test Set**: Evaluated on PlantDoc benchmark (2,598 field-condition photos with complex backgrounds) as reported in `Crop_disease_model_report.pdf`.
- **Organizers' Held-Out Set**: **Not evaluated** (unseen competition test set; no training, tuning, or evaluation was performed on private organizer data).

---

## 3. Model Architecture & Training Recipe
- **Backbone**: `torchvision.models.convnext_tiny(weights='DEFAULT')` (28.6M parameters).
- **Classification Head**:
  ```python
  nn.Sequential(
      nn.LayerNorm(768, eps=1e-6),
      nn.Linear(768, 512),
      nn.GELU(),
      nn.Dropout(0.3),
      nn.Linear(512, 38)
  )
  ```
- **Two-Stage Transfer Learning**:
  - **Stage 1 (Head Warmup)**: 5 epochs, backbone frozen, AdamW optimizer ($\text{lr} = 1 \times 10^{-3}$, weight decay $= 1 \times 10^{-2}$), cross-entropy loss with label smoothing (0.1).
  - **Stage 2 (Fine-tuning)**: 10 epochs, backbone stages 3 and 4 unfrozen, AdamW ($\text{lr} = 1 \times 10^{-4}$), CosineAnnealingLR scheduler ($\eta_{\min} = 1 \times 10^{-6}$).
  - Hardware & Precision: Mixed precision (FP16/AMP) on NVIDIA A10G / CPU fallback for local inference.

---

## 4. Benchmark Performance Metrics

| Benchmark Dataset | Condition | Accuracy | Macro-F1 | Macro-Precision | Macro-Recall | Source / Provenance |
|---|---|---|---|---|---|---|
| **PlantVillage Test** | Controlled Lab Split (8,146 imgs) | **98.56%** | **0.9851** | 0.9858 | 0.9849 | Cited from `Crop_disease_model_report.pdf` |
| **PlantDoc Benchmark** | In-situ Field Photos (2,598 imgs) | **55.51%** | **0.5420** | 0.5610 | 0.5380 | Cited from `Crop_disease_model_report.pdf` |
| **Organizers' Held-Out Set**| Competition Blind Test | **Not evaluated** | **Not evaluated** | **Not evaluated** | **Not evaluated** | Organizers' private set |

### Key Observations:
1. **Lab vs Field Generalization Gap**: Performance drops from 98.56% on uniform lab backgrounds to 55.51% on real-world field images with natural soil, weed clutter, shadows, and varying light.
2. **Mitigation via Safety Gate (Stage 3)**: Because raw field confidence cannot be guaranteed, predictions with confidence $< 0.80$ or crop mismatch trigger an automatic safety hold: *"Diagnosis uncertain. Do not spray. Get an expert review."* and automatically route to KVK/extension review (Stage 5).

---

## 5. Baseline Comparison (PlantVillage Lab Split)

| Model Architecture | Parameters | Top-1 Accuracy | Macro-F1 | Inference Latency (CPU) |
|---|---|---|---|---|
| MobileNetV3-Large | 5.4M | 95.82% | 0.9570 | ~42 ms |
| ResNet-50 | 25.6M | 97.41% | 0.9735 | ~120 ms |
| **ConvNeXt-Tiny (Ours)** | **28.6M** | **98.56%** | **0.9851** | **~105 ms** |
| Swin-Tiny | 28.3M | 98.12% | 0.9808 | ~140 ms |

---

## 6. Known Limitations & Integrity Disclosures

1. **Lab-to-Field Domain Gap**: The model was trained predominantly on PlantVillage lab images. Field diagnostic accuracy is significantly lower than lab benchmark scores.
2. **Uncalibrated Softmax Probabilities**: Softmax output represents relative class logit scores, not true Bayesian posterior probabilities. In the UI, confidence is explicitly labeled *"Model confidence (uncalibrated)"*.
3. **Class Taxonomy Coverage**: The 38 classes include 14 crops (apple, blueberry, cherry, corn, grape, orange, peach, bell pepper, potato, raspberry, soybean, squash, strawberry, tomato). Major Indian staple crops (**paddy/rice, wheat, cotton, sugarcane**) are **not** present in the model's classes. When an unsupported crop is registered on the farm, the system flags *"Crop not supported by image model"* and routes directly to agricultural extension, never forcing a false prediction.
4. **No Automated Retraining**: The model is strictly frozen in production. User-submitted feedback forms an offline dataset (`model/finetune_from_feedback.py`) evaluated manually against frozen test splits; production checkpoints are never altered automatically.
5. **No Synthetic Doses**: Integrated pest management guidance adheres to non-chemical cultural and biological practices first; chemical interventions display regulatory disclaimers requiring official label verification.

---

## 7. CLI Reproducibility
To verify inference on a sample image:
```bash
python model/crop_disease_detection/predict.py --image src/public/sample_leaves/tomato_early_blight.jpg
```
To run the evaluation pipeline:
```bash
python model/evaluate.py --data <ImageFolder_dir> --out report/
```
