"""
Agricultural Knowledge Base Retriever (RAG).
Performs grounded retrieval over curated extension documents with 100% metadata preservation.
"""
import json
import re
from pathlib import Path
from typing import List, Dict, Any

DATA_PATH = Path(__file__).resolve().parent / "knowledge_data.json"

def _load_documents() -> List[Dict[str, Any]]:
    if DATA_PATH.exists():
        with open(DATA_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    return []


def _tokenize(text: str) -> set:
    if not text:
        return set()
    return set(re.findall(r"\b\w{3,}\b", text.lower()))


def search_agricultural_knowledge(
    query: str,
    crop: str = "",
    disease: str = "",
    topic: str = "",
    top_k: int = 3,
) -> List[Dict[str, Any]]:
    """
    Search agricultural knowledge documents matching query, crop, and disease.
    Retains all metadata: title, source, url, crop, disease, topic, content.
    """
    docs = _load_documents()
    if not docs:
        return []

    q_tokens = _tokenize(query)
    crop_lower = (crop or "").strip().lower()
    disease_lower = (disease or "").strip().lower()
    topic_lower = (topic or "").strip().lower()

    scored = []
    for doc in docs:
        doc_crop = doc.get("crop", "").lower()
        doc_disease = doc.get("disease", "").lower()
        doc_topic = doc.get("topic", "").lower()
        doc_text = (doc.get("title", "") + " " + doc.get("content", "")).lower()
        doc_tokens = _tokenize(doc_text)

        score = 0.0

        # Exact or partial crop match bonus
        if crop_lower and (crop_lower in doc_crop or doc_crop in crop_lower or doc_crop == "general"):
            score += 4.0

        # Exact or partial disease match bonus
        if disease_lower and (disease_lower in doc_disease or doc_disease in disease_lower or doc_disease == "all"):
            score += 5.0

        # Topic match bonus
        if topic_lower and (topic_lower == doc_topic):
            score += 3.0

        # Query token overlap
        overlap = len(q_tokens.intersection(doc_tokens))
        score += overlap * 1.5

        scored.append((score, doc))

    # Sort descending by score
    scored.sort(key=lambda x: x[0], reverse=True)

    # Return top_k matching documents with full metadata
    results = [item[1] for item in scored[:top_k] if item[0] > 0]
    if not results and docs:
        # Fallback to general documents if query produced no match
        results = [d for d in docs if d.get("crop") == "General"][:top_k] or docs[:top_k]

    return results
