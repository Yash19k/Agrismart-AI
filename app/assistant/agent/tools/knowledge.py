"""
Tool 4: search_agricultural_knowledge
Calls the RAG retriever over verified agricultural sources (ICAR, TNAU, AAU, FAO).
"""
from typing import List, Dict, Any
from assistant.rag.retriever import search_agricultural_knowledge as _search


def search_knowledge_tool(
    query: str,
    crop: str = "",
    disease: str = "",
    topic: str = "",
    top_k: int = 3,
) -> List[Dict[str, Any]]:
    """
    Retrieves evidence documents matching query, crop, and disease.
    Retains full metadata: title, source, url, topic, content.
    """
    return _search(query=query, crop=crop, disease=disease, topic=topic, top_k=top_k)
