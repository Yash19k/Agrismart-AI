# AGRI SMART AI — Grounded Crop Disease Detection & AI Agronomist

AgriSmart AI is an intelligent precision agriculture platform designed for smallholder and commercial farmers. The system integrates a deep learning vision pipeline for leaf pathology diagnosis with real-time microclimate intelligence, deterministic disease spread risk modeling, and a grounded AI Agronomist assistant powered by Groq LLM.

---

## 🔬 Disease Detection Model

The disease detection pipeline uses a fine-tuned **ConvNeXt-Tiny** architecture trained on multi-crop foliar pathologies.

### Model Specifications
- **Architecture**: `convnext_tiny` (`torchvision.models.convnext_tiny`)
- **Number of Classes**: 38 plant disease & healthy foliage classes
- **Input Image Size**: 224 × 224 pixels
- **Preprocessing Pipeline**:
  ```python
  transforms.Compose([
      transforms.Resize(255),  # int(224 * 1.14)
      transforms.CenterCrop(224),
      transforms.ToTensor(),
      transforms.Normalize(
          mean=[0.485, 0.456, 0.406],
          std=[0.229, 0.224, 0.225]
      )
  ])
  ```
- **Inference Checkpoint**: `model/crop_disease_detection/agrismart_convnext_tiny_final.pth` (111 MB, containing `model_state_dict`, class names, class-to-index mapping, and training metadata)
- **Class Mapping**: `model/crop_disease_detection/class_names.json` (38 authoritative classes)
- **Device Support**: Automatic CUDA GPU acceleration with robust CPU fallback
- **Inference Latency**: ~50–90 ms (CPU inference)

### Supported Crops & Conditions (38 Classes)
- **Apple**: Apple Scab, Black Rot, Cedar Apple Rust, Healthy
- **Blueberry**: Healthy
- **Cherry (including sour)**: Powdery Mildew, Healthy
- **Corn (Maize)**: Cercospora Leaf Spot (Gray Leaf Spot), Common Rust, Northern Leaf Blight, Healthy
- **Grape**: Black Rot, Esca (Black Measles), Leaf Blight (Isariopsis Leaf Spot), Healthy
- **Orange**: Huanglongbing (Citrus Greening)
- **Peach**: Bacterial Spot, Healthy
- **Pepper (Bell)**: Bacterial Spot, Healthy
- **Potato**: Early Blight, Late Blight, Healthy
- **Raspberry**: Healthy
- **Soybean**: Healthy
- **Squash**: Powdery Mildew
- **Strawberry**: Leaf Scorch, Healthy
- **Tomato**: Bacterial Spot, Early Blight, Late Blight, Leaf Mold, Septoria Leaf Spot, Spider Mites (Two-spotted Spider Mite), Target Spot, Tomato Yellow Leaf Curl Virus, Tomato Mosaic Virus, Healthy

---

## 📊 Model Evaluation & Limitations

In accordance with strict agronomic safety and transparency principles:

- **Lab Test Accuracy**: **98.56%** (PlantVillage controlled benchmark)
- **Out-of-Distribution Real-World Field Accuracy**: **~55.5%** (PlantDoc in-the-wild benchmark)

> [!WARNING]
> **Model Limitation Notice**:
> The current prototype model achieves approximately 55% accuracy on its evaluation dataset. Predictions should therefore be treated as decision support rather than definitive agricultural diagnosis. Farmers are strongly encouraged to cross-reference visual diagnoses with local Krishi Vigyan Kendra (KVK) extension specialists or certified agronomists.

---

## 🏛️ System Architecture

```text
Farmer / Browser
       │
       ▼
React + Vite Frontend (Port 5173)
       │  [multipart/form-data]
       ▼
Django REST API (Port 8000) ─── POST /api/disease/predict/
       │
       ├─► DiseaseModelService (Singleton in memory)
       │     └─► ConvNeXt-Tiny (PyTorch) ──► Top-3 Classes + Raw Confidences
       │
       ├─► Weather Intelligence (Open-Meteo / WeatherAPI live telemetry)
       ├─► Deterministic Risk Engine (Foliar moisture + pathogen criteria)
       ├─► Agronomic Knowledge Base (ICAR / TNAU treatment protocols)
       │
       ▼
Diagnostic Response Payload
       │
       ├─► Populates Disease Detection Dashboard
       └─► Injected into AI Agronomist Context (/assistant)
```

---

## 🚀 How to Run Locally

### Prerequisites
- Python 3.10+ (tested with Python 3.11)
- Node.js 18+ and npm

### 1. Backend Setup
```bash
# Activate virtual environment
.venv\Scripts\activate  # Windows
# source .venv/bin/activate  # Linux/macOS

# Install dependencies
pip install -r app/requirements.txt

# Run migrations
python app/manage.py migrate

# Start Django development server
python app/manage.py runserver 127.0.0.1:8000
```

### 2. Frontend Setup
```bash
cd src
npm install
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## 🧪 Testing the Integration

### Direct Model Test
```bash
python -c "
from app.disease.model_service import get_disease_model_service
service = get_disease_model_service()
res = service.predict('src/public/sample_leaves/tomato_early_blight.jpg')
print('Predicted:', res['predicted_class'], res['confidence_percent'])
"
```

### Live API Test
```bash
python -c "
import requests
with open('src/public/sample_leaves/tomato_early_blight.jpg', 'rb') as f:
    res = requests.post('http://127.0.0.1:8000/api/disease/predict/', files={'image': f})
print(res.status_code, res.json()['disease_name'], res.json()['confidence_percent'])
"
```