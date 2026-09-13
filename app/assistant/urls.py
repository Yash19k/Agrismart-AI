"""URL config for AgriSmart Agronomist assistant."""
from django.urls import path
from .views import (
    chat_view,
    context_view,
    clear_context_view,
    farm_brief_view,
    suggested_questions_view,
)

urlpatterns = [
    path('chat/', chat_view, name='assistant-chat'),
    path('context/', context_view, name='assistant-context'),
    path('clear-context/', clear_context_view, name='assistant-clear-context'),
    path('brief/', farm_brief_view, name='assistant-brief'),
    path('suggested/', suggested_questions_view, name='assistant-suggested'),
]
