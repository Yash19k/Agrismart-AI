"""
Conversational State and Session Memory for AgriSmart Agronomist Agent.
Ensures context persistence for follow-up questions ('Why?', 'What about tomorrow?').
"""
from typing import Dict, List, Any
import time

# Simple thread-safe in-memory session store with TTL cleanup
_SESSIONS: Dict[str, Dict[str, Any]] = {}
SESSION_TTL_SECONDS = 3600 * 2  # 2 hours


def get_or_create_session(session_id: str) -> Dict[str, Any]:
    """Retrieve or initialize a conversation session."""
    now = time.time()
    clean_stale_sessions(now)

    if not session_id or session_id not in _SESSIONS:
        sid = session_id or f"sess_{int(now * 1000)}"
        _SESSIONS[sid] = {
            "created_at": now,
            "last_active": now,
            "messages": [],
            "last_context": {},
            "last_recommendation": None,
        }
        return _SESSIONS[sid]

    sess = _SESSIONS[session_id]
    sess["last_active"] = now
    return sess


def append_message(session_id: str, role: str, text: str, meta: Dict[str, Any] = None):
    """Appends a turn to conversation memory."""
    sess = get_or_create_session(session_id)
    sess["messages"].append({
        "role": role,
        "text": text,
        "meta": meta or {},
        "timestamp": time.time(),
    })
    # Keep last 10 messages
    if len(sess["messages"]) > 10:
        sess["messages"] = sess["messages"][-10:]


def get_conversation_history(session_id: str) -> List[Dict[str, Any]]:
    """Returns past conversation turns for the given session."""
    if not session_id or session_id not in _SESSIONS:
        return []
    return _SESSIONS[session_id]["messages"]


def update_session_context(session_id: str, context: Dict[str, Any]):
    """Stores latest verified crop/disease/weather context."""
    sess = get_or_create_session(session_id)
    sess["last_context"].update(context)


def get_last_context(session_id: str) -> Dict[str, Any]:
    """Retrieves previous context."""
    if not session_id or session_id not in _SESSIONS:
        return {}
    return _SESSIONS[session_id]["last_context"]


def clear_session_context(session_id: str):
    """Clears disease and crop context from the active session (switches to Mode A)."""
    if session_id in _SESSIONS:
        _SESSIONS[session_id]["last_context"] = {}


def clean_stale_sessions(now: float):
    """Removes sessions older than TTL."""
    stale_keys = [
        k for k, v in _SESSIONS.items()
        if (now - v.get("last_active", 0)) > SESSION_TTL_SECONDS
    ]
    for k in stale_keys:
        _SESSIONS.pop(k, None)
