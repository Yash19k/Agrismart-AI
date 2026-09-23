"""
DiseaseModelService — Production inference engine for ConvNeXt-Tiny plant disease classifier.
Loads checkpoint once at startup, caches weights in memory, supports CPU and CUDA.
Matches exact training preprocessing (Resize 255 -> CenterCrop 224 -> ToTensor -> Normalize).
"""
import os
import time
import json
import logging
from pathlib import Path
from typing import Dict, Any, List, Union, Tuple
from PIL import Image

import torch
import torch.nn as nn
from torchvision import transforms
from torchvision.models import convnext_tiny

logger = logging.getLogger("disease.model")

# ImageNet normalization used during training
IMAGE_SIZE = 224
RESIZE_DIM = int(IMAGE_SIZE * 1.14)  # 255
IMAGENET_MEAN = [0.485, 0.456, 0.406]
IMAGENET_STD = [0.229, 0.224, 0.225]

# Agricultural metadata for all 38 classes
CROP_DISPLAY_MAP = {
    "Apple": "Apple",
    "Blueberry": "Blueberry",
    "Cherry_(including_sour)": "Cherry",
    "Corn_(maize)": "Corn (Maize)",
    "Grape": "Grape",
    "Orange": "Orange",
    "Peach": "Peach",
    "Pepper,_bell": "Bell Pepper",
    "Potato": "Potato",
    "Raspberry": "Raspberry",
    "Soybean": "Soybean",
    "Squash": "Squash",
    "Strawberry": "Strawberry",
    "Tomato": "Tomato",
}

DISEASE_PROFILES = {
    "Early_blight": {
        "pathogen": "Alternaria solani",
        "category": "Fungal Infection",
        "scientific_name": "Alternaria solani",
        "severity_level": "Moderate",
        "severity_score": 55,
        "affected_area": "20-30%",
        "health_score": 72,
        "symptoms": [
            "Dark brown circular spots with concentric target-board rings",
            "Yellow chlorotic halos surrounding necrotic leaf lesions",
            "Older lower leaves infected first, spreading upward",
            "Premature defoliation in humid weather conditions",
        ],
        "causes": [
            "Prolonged leaf wetness and warm temperatures (24–30°C)",
            "Overwintering fungal spores in crop debris and soil",
            "Overhead irrigation splashing spores onto lower canopy",
        ],
        "recommendations": [
            "Prune infected bottom leaves and destroy affected foliage",
            "Switch strictly to root-zone drip irrigation to keep leaves dry",
            "Apply copper hydroxide or azoxystrobin spray if lesions spread",
        ],
    },
    "Late_blight": {
        "pathogen": "Phytophthora infestans",
        "category": "Oomycete / Water Mold",
        "scientific_name": "Phytophthora infestans",
        "severity_level": "High",
        "severity_score": 80,
        "affected_area": "40-60%",
        "health_score": 58,
        "symptoms": [
            "Water-soaked dark lesions rapidly expanding across leaf blade",
            "Delicate white fungal down/mildew on leaf undersides in high humidity",
            "Foliage and stems collapsing rapidly with foul odor",
        ],
        "causes": [
            "Cool, wet and foggy conditions (15–22°C, >85% humidity)",
            "Windborne sporangia dispersing from nearby infected fields",
        ],
        "recommendations": [
            "Immediately remove and destroy severely blighted plants",
            "Apply systemic fungicide (mancozeb + cymoxanil) to protect nearby canopy",
            "Avoid field operations when foliage is wet",
        ],
    },
    "Bacterial_spot": {
        "pathogen": "Xanthomonas campestris",
        "category": "Bacterial Infection",
        "scientific_name": "Xanthomonas campestris pv. vesicatoria",
        "severity_level": "Moderate",
        "severity_score": 60,
        "affected_area": "25-35%",
        "health_score": 68,
        "symptoms": [
            "Small angular water-soaked spots turning dark brown or black",
            "Yellow chlorotic halos around irregular leaf spots",
            "Blister-like raised scabs on stems and developing fruits",
        ],
        "causes": [
            "Warm driving rain and splash dispersal from infected seeds",
            "Bacterial survival in plant residue and nightshade weeds",
        ],
        "recommendations": [
            "Apply copper bactericide mixed with mancozeb as preventive barrier",
            "Eliminate overhead sprinkler watering to stop bacterial splash",
        ],
    },
    "Leaf_Mold": {
        "pathogen": "Passalora fulva (Cladosporium)",
        "category": "Fungal Infection",
        "scientific_name": "Passalora fulva",
        "severity_level": "Moderate",
        "severity_score": 50,
        "affected_area": "15-25%",
        "health_score": 75,
        "symptoms": [
            "Pale greenish-yellow spots on upper leaf surfaces",
            "Olive-green to brown velvety fungal growth on leaf undersides",
            "Lower leaves curling, withering and dropping off",
        ],
        "causes": [
            "High relative humidity (>85%) and poor greenhouse/tunnel ventilation",
            "Foliar moisture staying trapped inside dense canopy",
        ],
        "recommendations": [
            "Improve row spacing and prune lower suckers to boost airflow",
            "Ventilate greenhouses early in the morning to drop relative humidity",
        ],
    },
    "Septoria_leaf_spot": {
        "pathogen": "Septoria lycopersici",
        "category": "Fungal Infection",
        "scientific_name": "Septoria lycopersici",
        "severity_level": "Moderate",
        "severity_score": 60,
        "affected_area": "20-30%",
        "health_score": 70,
        "symptoms": [
            "Numerous small circular spots with grayish-white centers and dark borders",
            "Tiny black specks (pycnidia) visible inside lesion centers",
            "Progressive yellowing and loss of foliage from the ground up",
        ],
        "causes": [
            "Fungal spores splashing upward from soil during rain or watering",
            "Moderate temperatures (20–25°C) with persistent leaf wetness",
        ],
        "recommendations": [
            "Apply organic mulch around plant bases to prevent rain splash",
            "Apply preventive chlorothalonil or copper spray to lower leaves",
        ],
    },
    "Spider_mites Two-spotted_spider_mite": {
        "pathogen": "Tetranychus urticae",
        "category": "Pest Infestation",
        "scientific_name": "Tetranychus urticae",
        "severity_level": "Moderate",
        "severity_score": 50,
        "affected_area": "20-35%",
        "health_score": 72,
        "symptoms": [
            "Fine yellow stippling and speckled discoloration on upper leaf surfaces",
            "Delicate silken webbing on leaf undersides and branch crotches",
            "Leaves turning bronze, brittle, and prematurely dropping",
        ],
        "causes": [
            "Hot, dry, and dusty microclimate conditions (>30°C, low humidity)",
            "Natural predator reduction from broad-spectrum pesticide use",
        ],
        "recommendations": [
            "Apply neem oil or insecticidal potassium soap to leaf undersides",
            "Release predatory mites (Phytoseiulus persimilis) in infested rows",
        ],
    },
    "Target_Spot": {
        "pathogen": "Corynespora cassiicola",
        "category": "Fungal Infection",
        "scientific_name": "Corynespora cassiicola",
        "severity_level": "Moderate",
        "severity_score": 55,
        "affected_area": "20-30%",
        "health_score": 72,
        "symptoms": [
            "Brown target-like circular lesions with pinpoint centers",
            "Dark brown necrotic halos expanding into irregular leaf blight",
        ],
        "causes": [
            "Warm temperatures (25–32°C) combined with high humidity and rain",
        ],
        "recommendations": [
            "Ensure proper crop rotation with non-solanaceous crops",
            "Apply strobilurin or triazole fungicides upon first appearance",
        ],
    },
    "Tomato_Yellow_Leaf_Curl_Virus": {
        "pathogen": "TYLCV (Begomovirus)",
        "category": "Viral Infection (Vector-Transmitted)",
        "scientific_name": "Tomato yellow leaf curl virus",
        "severity_level": "Critical",
        "severity_score": 85,
        "affected_area": "50-70%",
        "health_score": 45,
        "symptoms": [
            "Severe upward curling and cupping of young leaflets",
            "Prominent interveinal yellowing and marginal chlorosis",
            "Severe plant stunting and complete blossom drop",
        ],
        "causes": [
            "Silverleaf whitefly (Bemisia tabaci) feeding and transmitting virus",
        ],
        "recommendations": [
            "Eradicate whitefly vectors using yellow sticky traps and imidacloprid",
            "Rogue and bag infected symptomatic plants immediately to prevent spread",
        ],
    },
    "Tomato_mosaic_virus": {
        "pathogen": "ToMV (Tobamovirus)",
        "category": "Viral Infection (Mechanically Transmitted)",
        "scientific_name": "Tomato mosaic virus",
        "severity_level": "High",
        "severity_score": 75,
        "affected_area": "40-60%",
        "health_score": 55,
        "symptoms": [
            "Mottled light and dark green mosaic patterns across foliage",
            "Fern-like leaf distortion and blistering",
            "Internal brown browning and uneven ripening of fruit",
        ],
        "causes": [
            "Mechanical transmission via pruning shears, hands, and infected seeds",
        ],
        "recommendations": [
            "Disinfect pruning tools with 20% nonfat dry milk or trisodium phosphate",
            "Wash hands thoroughly before handling plants; avoid smoking near crop",
        ],
    },
    "Black_rot": {
        "pathogen": "Guignardia bidwellii / Botryosphaeria",
        "category": "Fungal Infection",
        "scientific_name": "Guignardia bidwellii",
        "severity_level": "High",
        "severity_score": 70,
        "affected_area": "30-50%",
        "health_score": 62,
        "symptoms": [
            "Circular reddish-brown spots with dark margins on foliage",
            "Black pycnidia fruiting bodies arranged in rings within lesions",
            "Shriveling of fruit into hard black mummies",
        ],
        "causes": [
            "Overwintering mummies on vines or orchard floor",
            "Rain splash and prolonged leaf wetness at 20–27°C",
        ],
        "recommendations": [
            "Prune out mummified clusters and infected canes during dormancy",
            "Apply captan, mancozeb, or myclobutanil early in the growing season",
        ],
    },
    "Powdery_mildew": {
        "pathogen": "Erysiphe / Podosphaera",
        "category": "Fungal Infection",
        "scientific_name": "Podosphaera / Erysiphe spp.",
        "severity_level": "Moderate",
        "severity_score": 50,
        "affected_area": "20-35%",
        "health_score": 74,
        "symptoms": [
            "White talcum-powder-like fungal patches on leaf surfaces",
            "Curling and distortion of young developing leaves",
            "Premature leaf senescence in severe cases",
        ],
        "causes": [
            "Moderate temperatures (18–28°C) with dry leaf surfaces but high humidity",
            "Shaded, dense canopy limiting direct sunlight",
        ],
        "recommendations": [
            "Apply wettable sulfur or potassium bicarbonate spray at first sign",
            "Thin out canopy branches to maximize sunlight penetration",
        ],
    },
    "Northern_Leaf_Blight": {
        "pathogen": "Exserohilum turcicum",
        "category": "Fungal Infection",
        "scientific_name": "Exserohilum turcicum",
        "severity_level": "Moderate",
        "severity_score": 65,
        "affected_area": "25-40%",
        "health_score": 68,
        "symptoms": [
            "Long elliptical grayish-green cigar-shaped lesions on leaves",
            "Lesions turning tan with dark spore masses in damp conditions",
            "Extensive leaf desiccation when lesions coalesce",
        ],
        "causes": [
            "Moderate temperatures (18–27°C) and heavy dews or frequent showers",
            "Fungal survival in previous season corn stubble",
        ],
        "recommendations": [
            "Incorporate crop debris deeply post-harvest",
            "Apply foliar triazole/strobilurin fungicide if lesions appear before tasseling",
        ],
    },
    "Common_rust": {
        "pathogen": "Puccinia sorghi",
        "category": "Fungal Infection",
        "scientific_name": "Puccinia sorghi",
        "severity_level": "Moderate",
        "severity_score": 50,
        "affected_area": "15-30%",
        "health_score": 75,
        "symptoms": [
            "Cinnamon-brown powdery pustules erupting on both leaf surfaces",
            "Pustules turning dark brownish-black late in season",
        ],
        "causes": [
            "Cool to moderate temperatures (16–25°C) and high relative humidity",
        ],
        "recommendations": [
            "Plant resistant corn hybrids; spray triazole fungicides if pustules threaten ear leaves",
        ],
    },
    "healthy": {
        "pathogen": "None (Intact Plant Tissue)",
        "category": "Healthy Crop Foliage",
        "scientific_name": "Healthy Specimen",
        "severity_level": "None",
        "severity_score": 0,
        "affected_area": "0%",
        "health_score": 96,
        "symptoms": [
            "Vibrant, uniform green foliage with intact cuticle",
            "Zero pathological chlorosis, necrosis, or foliar lesions",
            "Normal cellular turgor and healthy transpiration",
        ],
        "causes": [
            "Balanced soil nutrients, optimal irrigation, and effective field hygiene",
        ],
        "recommendations": [
            "Continue regular monitoring and preventive organic practices",
            "Maintain current irrigation schedule based on weather forecast",
        ],
    },
}


class DiseaseModelService:
    """
    Singleton service that wraps the trained ConvNeXt-Tiny classifier.
    Loads agrismart_convnext_tiny_final.pth once into memory.
    """
    _instance = None

    def __new__(cls, *args, **kwargs):
        if cls._instance is None:
            cls._instance = super(DiseaseModelService, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self, model_path: Union[str, Path, None] = None):
        if getattr(self, "_initialized", False) and getattr(self, "model", None) is not None:
            return

        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        logger.info("Initializing DiseaseModelService on device: %s", self.device)

        # Resolve paths relative to project root
        script_dir = Path(__file__).resolve().parent
        base_dir = script_dir.parent  # app
        project_root = Path(os.environ.get('PROJECT_ROOT', base_dir.parent)).resolve()
        model_root = Path(os.environ.get('MODEL_DIR', project_root / "model")).resolve()

        if model_path:
            self.model_path = Path(model_path)
        else:
            candidate_paths = [
                model_root / "crop_disease_detection" / "agrismart_convnext_tiny_final.pth",
                model_root / "crop_desaise_detection" / "agrismart_convnext_tiny_final.pth",
                model_root / "agrismart_convnext_tiny_final.pth",
                project_root / "model" / "crop_disease_detection" / "agrismart_convnext_tiny_final.pth",
                project_root / "crop_disease_detection" / "agrismart_convnext_tiny_final.pth",
            ]
            self.model_path = next((p for p in candidate_paths if p.is_file()), candidate_paths[0])

        candidate_class_paths = [
            model_root / "crop_disease_detection" / "class_names.json",
            model_root / "crop_desaise_detection" / "class_names.json",
            model_root / "class_names.json",
            project_root / "model" / "crop_disease_detection" / "class_names.json",
            project_root / "crop_disease_detection" / "class_names.json",
        ]
        self.class_names_path = next((p for p in candidate_class_paths if p.is_file()), candidate_class_paths[0])

        # Preprocessing matching predict.py and training notebook
        self.transform = transforms.Compose([
            transforms.Resize(RESIZE_DIM),
            transforms.CenterCrop(IMAGE_SIZE),
            transforms.ToTensor(),
            transforms.Normalize(IMAGENET_MEAN, IMAGENET_STD),
        ])

        self.model = None
        self.class_names: List[str] = []
        self.class_to_idx: Dict[str, int] = {}
        self.test_accuracy: float = 0.9856
        self.plantdoc_accuracy: float = 0.5551

        self._load_model()
        self._initialized = True

    def _load_model(self):
        """Loads model weights and class definitions."""
        if not self.model_path.is_file():
            raise FileNotFoundError(
                f"Model checkpoint not found at: {self.model_path}. "
                "Ensure agrismart_convnext_tiny_final.pth is located inside "
                "model/crop_disease_detection/ or model/crop_desaise_detection/."
            )

        logger.info("Loading ConvNeXt-Tiny checkpoint from: %s", self.model_path)
        checkpoint = torch.load(self.model_path, map_location=self.device, weights_only=False)

        if "class_names" not in checkpoint:
            raise KeyError(
                "Checkpoint is missing 'class_names' key. "
                "Ensure you are loading a complete production packaged checkpoint."
            )

        self.class_names = checkpoint["class_names"]
        self.class_to_idx = checkpoint.get("class_to_idx", {name: idx for idx, name in enumerate(self.class_names)})
        self.test_accuracy = float(checkpoint.get("test_accuracy", 0.9856))
        self.num_classes = len(self.class_names)

        if self.num_classes != 38:
            logger.warning(
                "Checkpoint class count (%d) differs from standard 38 classes.",
                self.num_classes
            )

        # Instantiate architecture
        model = convnext_tiny(weights=None)
        in_features = model.classifier[2].in_features
        model.classifier[2] = nn.Linear(in_features, self.num_classes)
        model.load_state_dict(checkpoint["model_state_dict"])
        model.to(self.device)
        model.eval()

        self.model = model
        logger.info(
            "ConvNeXt-Tiny loaded successfully | Classes: %d | Device: %s | Lab Test Acc: %.2f%% | Source: %s",
            self.num_classes,
            self.device,
            self.test_accuracy * 100,
            self.model_path.parent.name,
        )

    def parse_class_label(self, raw_class: str) -> Tuple[str, str, bool]:
        """
        Parses raw class label e.g. 'Tomato___Early_blight' or 'Apple___healthy'
        into (crop_name, disease_name, is_healthy).
        """
        if "___" in raw_class:
            raw_crop, raw_disease = raw_class.split("___", 1)
        else:
            raw_crop, raw_disease = "Unknown", raw_class

        # Clean crop name
        crop_name = CROP_DISPLAY_MAP.get(raw_crop, raw_crop.replace("_", " ").title())

        # Clean disease name
        is_healthy = raw_disease.lower() == "healthy"
        if is_healthy:
            disease_name = "Healthy Foliage"
        else:
            disease_name = raw_disease.replace("_", " ")
            # Capitalize properly
            disease_name = " ".join([word.capitalize() for word in disease_name.split()])

        return crop_name, disease_name, is_healthy

    def get_clinical_profile(self, raw_class: str, is_healthy: bool) -> Dict[str, Any]:
        """Looks up or derives agronomic symptoms, causes, and pathogen metadata."""
        if is_healthy:
            return DISEASE_PROFILES["healthy"]

        disease_key = raw_class.split("___")[-1] if "___" in raw_class else raw_class
        for key, profile in DISEASE_PROFILES.items():
            if key.lower() in disease_key.lower():
                return profile

        # Default fallback profile for other specific conditions
        return {
            "pathogen": "Identified Phytopathogen",
            "category": "Fungal / Bacterial Leaf Spot",
            "scientific_name": "Phytopathological Folium",
            "severity_level": "Moderate",
            "severity_score": 50,
            "affected_area": "15-25%",
            "health_score": 74,
            "symptoms": [
                "Discoloration, lesions or speckling visible across leaf tissue",
                "Foliar vitality reduced compared to healthy control",
            ],
            "causes": [
                "Environmental humidity or spore inoculation",
                "Prolonged leaf wetness",
            ],
            "recommendations": [
                "Isolate and monitor affected plant foliage",
                "Avoid overhead irrigation to reduce foliar moisture",
                "Consult local ICAR/TNAU extension advisory for targeted chemical treatment",
            ],
        }

    def predict(self, image_input: Union[str, Path, Image.Image, Any]) -> Dict[str, Any]:
        """
        Runs model inference on the provided leaf image.
        Returns full structured response with predictions, confidence %,
        top-3 alternatives, severity, symptoms, causes, and timing.
        """
        start_time = time.time()

        # Open image
        if isinstance(image_input, (str, Path)):
            if not os.path.isfile(image_input):
                raise FileNotFoundError(f"Image not found at: {image_input}")
            image = Image.open(image_input).convert("RGB")
        elif isinstance(image_input, Image.Image):
            image = image_input.convert("RGB")
        else:
            # File-like object (e.g. Django UploadedFile)
            image = Image.open(image_input).convert("RGB")

        # Ensure model is loaded
        if self.model is None:
            self._load_model()

        # Preprocess
        tensor = self.transform(image).unsqueeze(0).to(self.device)

        # Predict
        with torch.no_grad():
            outputs = self.model(tensor)
            probabilities = torch.softmax(outputs, dim=1)[0]

        topk_probs, topk_indices = torch.topk(probabilities, min(3, self.num_classes))
        inference_time_ms = round((time.time() - start_time) * 1000, 1)

        predicted_idx = topk_indices[0].item()
        raw_class = self.class_names[predicted_idx]
        confidence = float(topk_probs[0].item())

        crop_name, disease_name, is_healthy = self.parse_class_label(raw_class)
        profile = self.get_clinical_profile(raw_class, is_healthy)

        # Top 3 alternatives
        alternatives = []
        for prob, idx in zip(topk_probs, topk_indices):
            c_name = self.class_names[idx.item()]
            alt_crop, alt_disease, alt_healthy = self.parse_class_label(c_name)
            alternatives.append({
                "raw_class": c_name,
                "crop": alt_crop,
                "disease": alt_disease,
                "is_healthy": alt_healthy,
                "confidence": round(float(prob.item()), 4),
                "confidence_percent": f"{float(prob.item()) * 100:.1f}%",
            })

        logger.info(
            "ConvNeXt-Tiny Prediction: %s (%.2f%%) | Crop: %s | Time: %.1fms",
            raw_class,
            confidence * 100,
            crop_name,
            inference_time_ms,
        )

        return {
            "predicted_class": raw_class,
            "crop_name": crop_name,
            "disease_name": disease_name,
            "is_healthy": is_healthy,
            "confidence": round(confidence, 4),
            "confidence_percent": f"{confidence * 100:.1f}%",
            "pathogen": profile.get("pathogen", ""),
            "category": profile.get("category", "Pathology"),
            "scientific_name": profile.get("scientific_name", ""),
            "severity_level": profile.get("severity_level", "Moderate" if not is_healthy else "None"),
            "severity_score": profile.get("severity_score", 50 if not is_healthy else 0),
            "affected_area": profile.get("affected_area", "15-25%" if not is_healthy else "0%"),
            "health_score": profile.get("health_score", 72 if not is_healthy else 96),
            "symptoms": profile.get("symptoms", []),
            "possible_causes": profile.get("causes", []),
            "recommendations": profile.get("recommendations", []),
            "alternatives": alternatives,
            "inference_time_ms": inference_time_ms,
            "device": str(self.device),
            "model_metadata": {
                "architecture": "ConvNeXt-Tiny",
                "total_classes": self.num_classes,
                "input_size": [IMAGE_SIZE, IMAGE_SIZE],
                "lab_test_accuracy": self.test_accuracy,
                "plantdoc_field_accuracy": self.plantdoc_accuracy,
            },
        }


# Global accessor
_service_instance = None

def get_disease_model_service() -> DiseaseModelService:
    global _service_instance
    if _service_instance is None or getattr(_service_instance, "model", None) is None:
        _service_instance = DiseaseModelService()
        if getattr(_service_instance, "model", None) is None:
            _service_instance._load_model()
    return _service_instance
