"""URL routing for the Smart Irrigation Django app."""

from django.urls import path
from . import views

app_name = "irrigation"

urlpatterns = [
    path("health/",        views.health_check,       name="health"),
    path("meta/",          views.get_meta,           name="meta"),
    path("insights/",      views.get_insights_view,  name="insights"),
    path("live-weather/",  views.get_live_weather,   name="live-weather"),
    path("history/",       views.get_history,        name="history"),
    path("predict/",       views.predict,            name="predict"),
]
