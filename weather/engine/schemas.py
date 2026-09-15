"""
Internal weather data schemas for AgriSmart Weather Intelligence.

All modules consume ONLY these normalized schemas — never raw provider JSON.
This ensures provider substitution requires zero changes in downstream modules.
"""

from typing import Dict, Any, Optional, List
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone


@dataclass
class Location:
    """Normalized geographic location."""
    latitude: float
    longitude: float
    name: Optional[str] = None
    country: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        d = {"latitude": self.latitude, "longitude": self.longitude}
        if self.name:
            d["name"] = self.name
        if self.country:
            d["country"] = self.country
        return d


@dataclass
class CurrentWeather:
    """Normalized current weather observation."""
    temperature_c: Optional[float] = None
    feels_like_c: Optional[float] = None
    humidity_percent: Optional[int] = None
    pressure_hpa: Optional[float] = None
    wind_speed_mps: Optional[float] = None
    wind_direction_deg: Optional[int] = None
    cloudiness_percent: Optional[int] = None
    rainfall_1h_mm: Optional[float] = None
    rainfall_3h_mm: Optional[float] = None
    weather_condition: Optional[str] = None
    weather_description: Optional[str] = None
    visibility_m: Optional[int] = None

    def to_dict(self) -> Dict[str, Any]:
        return {k: v for k, v in asdict(self).items() if v is not None}


@dataclass
class ForecastWeather:
    """Normalized forecast weather summary (aggregated from provider's forecast data)."""
    rain_probability_6h: Optional[int] = None       # percent 0-100
    rain_probability_12h: Optional[int] = None      # percent 0-100
    rain_probability_24h: Optional[int] = None      # percent 0-100
    rainfall_next_6h_mm: Optional[float] = None
    rainfall_next_12h_mm: Optional[float] = None
    rainfall_next_24h_mm: Optional[float] = None
    temperature_max_24h_c: Optional[float] = None
    temperature_min_24h_c: Optional[float] = None
    humidity_max_24h: Optional[int] = None
    humidity_min_24h: Optional[int] = None
    wind_max_24h_mps: Optional[float] = None

    def to_dict(self) -> Dict[str, Any]:
        return {k: v for k, v in asdict(self).items() if v is not None}


@dataclass
class WeatherContext:
    """
    Complete normalized weather context — the single contract consumed by all modules.
    Provider-agnostic. Modules A/B/D/E/G consume only this schema.
    """
    location: Location
    observed_at: str  # ISO 8601 timestamp
    current: CurrentWeather
    forecast: ForecastWeather
    source: str
    weather_available: bool = True
    error_message: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "location": self.location.to_dict(),
            "observed_at": self.observed_at,
            "current": self.current.to_dict(),
            "forecast": self.forecast.to_dict(),
            "source": self.source,
            "weather_available": self.weather_available,
            "error_message": self.error_message
        }


@dataclass
class WeatherSignals:
    """Structured boolean flags derived from weather for agricultural decisions."""
    rain_likely: bool = False
    rain_heavy: bool = False
    high_heat: bool = False
    cold_stress: bool = False
    high_humidity: bool = False
    high_wind: bool = False
    water_stress_risk: bool = False
    disease_favorable_weather: bool = False

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class WeatherAction:
    """A single structured agricultural action recommended by weather intelligence."""
    type: str               # e.g., "irrigation", "disease_monitoring", "heat_management"
    action: str             # e.g., "delay", "proceed", "monitor", "increase_frequency"
    reason: str             # Human-readable explanation
    urgency: str = "medium" # "low", "medium", "high", "critical"

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class WeatherIntelligenceResult:
    """Complete intelligence output combining weather context, signals, and actions."""
    weather: WeatherContext
    signals: WeatherSignals
    actions: List[WeatherAction] = field(default_factory=list)
    irrigation_advice: Optional[Dict[str, Any]] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "weather": self.weather.to_dict(),
            "signals": self.signals.to_dict(),
            "actions": [a.to_dict() for a in self.actions],
            "irrigation_advice": self.irrigation_advice
        }


def make_unavailable_context(
    latitude: float,
    longitude: float,
    source: str,
    error_message: str
) -> WeatherContext:
    """Create a safe fallback WeatherContext when the provider is unreachable."""
    return WeatherContext(
        location=Location(latitude=latitude, longitude=longitude),
        observed_at=datetime.now(timezone.utc).isoformat() + "Z",
        current=CurrentWeather(),
        forecast=ForecastWeather(),
        source=source,
        weather_available=False,
        error_message=error_message
    )
