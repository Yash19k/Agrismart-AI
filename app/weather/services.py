"""
Open-Meteo Weather Service for AgriSmart.

Architecture (as mandated):
    React → Django (this service) → Open-Meteo

All data fetched in ONE call per farm. Results cached for 30 minutes
(configurable via WEATHER_CACHE_TIMEOUT in settings.py).

DO NOT call Open-Meteo directly from React. Always go through this service.
"""
import logging
from datetime import datetime

import httpx
from django.core.cache import cache
from django.conf import settings

from .weather_codes import get_weather_description, get_weather_type, get_season_india, WEATHER_EMOJI

logger = logging.getLogger('weather')

OPEN_METEO_FORECAST = 'https://api.open-meteo.com/v1/forecast'
OPEN_METEO_GEOCODING = 'https://geocoding-api.open-meteo.com/v1/search'

CURRENT_VARS = [
    'temperature_2m',
    'relative_humidity_2m',
    'apparent_temperature',
    'precipitation',
    'wind_speed_10m',
    'wind_direction_10m',
    'wind_gusts_10m',
    'weather_code',
]

HOURLY_VARS = [
    'temperature_2m',
    'relative_humidity_2m',
    'precipitation_probability',
    'precipitation',
    'rain',
    'et0_fao_evapotranspiration',
    'vapour_pressure_deficit',
    'wind_speed_10m',
    'wind_gusts_10m',
    'soil_moisture_0_to_1cm',
]

DAILY_VARS = [
    'temperature_2m_max',
    'temperature_2m_min',
    'precipitation_sum',
    'rain_sum',
    'precipitation_probability_max',
    'weather_code',
    'wind_speed_10m_max',
    'et0_fao_evapotranspiration',
]

WEATHER_API_FORECAST = 'http://api.weatherapi.com/v1/forecast.json'
WEATHER_API_SEARCH = 'http://api.weatherapi.com/v1/search.json'

CACHE_TTL = getattr(settings, 'WEATHER_CACHE_TIMEOUT', 1800)


class WeatherServiceError(Exception):
    pass


class WeatherService:
    """
    Fetches and parses weather data from WeatherAPI (primary) or Open-Meteo (fallback).

    Public API:
        WeatherService.fetch_farm_weather(farm)  → dict
        WeatherService.fetch_coordinates(lat, lon) → dict
        WeatherService.search_location(query)    → list
    """

    @staticmethod
    def cache_key(farm_id: int, provider: str) -> str:
        return f'agrismart_weather_farm_{farm_id}_{provider}'

    @classmethod
    def fetch_farm_weather(cls, farm, provider: str = None) -> dict:
        """Return weather data for a farm, served from cache when available."""
        provider = provider or getattr(settings, 'WEATHER_PROVIDER', 'open-meteo')
        key = cls.cache_key(farm.id, provider)
        cached = cache.get(key)
        if cached:
            logger.debug('Weather cache HIT for farm %s via %s', farm.id, provider)
            return cached

        logger.info('Fetching weather via %s for farm %s (%.4f, %.4f)',
                    provider, farm.id, farm.latitude, farm.longitude)
        try:
            data = cls._fetch(farm.latitude, farm.longitude, provider=provider)
        except httpx.HTTPStatusError as e:
            raise WeatherServiceError(
                f'Weather provider ({provider}) API error {e.response.status_code}: {e.response.text[:200]}'
            ) from e
        except httpx.RequestError as e:
            raise WeatherServiceError(f'Could not reach weather service ({provider}): {e}') from e

        cache.set(key, data, CACHE_TTL)
        return data

    @classmethod
    def fetch_coordinates(cls, lat: float, lon: float, provider: str = None) -> dict:
        """Fetch live weather for arbitrary coordinates."""
        provider = provider or getattr(settings, 'WEATHER_PROVIDER', 'open-meteo')
        key = f'agrismart_weather_coord_{provider}_{round(lat, 3)}_{round(lon, 3)}'
        cached = cache.get(key)
        if cached:
            return cached
        data = cls._fetch(lat, lon, provider=provider)
        cache.set(key, data, CACHE_TTL)
        return data

    @classmethod
    def _fetch(cls, lat: float, lon: float, provider: str = None) -> dict:
        provider = provider or getattr(settings, 'WEATHER_PROVIDER', 'open-meteo')
        api_key = getattr(settings, 'WEATHER_API_KEY', '093b53ee057a4907ab9104918261209')

        if provider == 'weatherapi' and api_key:
            try:
                return cls._fetch_weatherapi(lat, lon, api_key)
            except Exception as e:
                logger.warning('WeatherAPI failed (%s), falling back to Open-Meteo', e)

        # Open-Meteo API
        params = {
            'latitude': lat,
            'longitude': lon,
            'current': ','.join(CURRENT_VARS),
            'hourly': ','.join(HOURLY_VARS),
            'daily': ','.join(DAILY_VARS),
            'timezone': 'auto',
            'forecast_days': 7,
        }
        with httpx.Client(timeout=15.0) as client:
            r = client.get(OPEN_METEO_FORECAST, params=params)
            r.raise_for_status()
            raw = r.json()

        return cls._parse(raw)


    @classmethod
    def _fetch_weatherapi(cls, lat: float, lon: float, api_key: str) -> dict:
        url = f"{WEATHER_API_FORECAST}?key={api_key}&q={lat},{lon}&days=7"
        with httpx.Client(timeout=15.0) as client:
            r = client.get(url)
            r.raise_for_status()
            raw = r.json()

        return cls._parse_weatherapi(raw)

    @classmethod
    def _parse_weatherapi(cls, raw: dict) -> dict:
        cur_raw = raw.get('current', {})
        forecast_days = raw.get('forecast', {}).get('forecastday', [])
        now = datetime.now()

        cond = cur_raw.get('condition', {})
        cond_text = cond.get('text', 'Clear')
        cond_code = cond.get('code', 1000)

        # Map text condition to standard weather type
        lower_cond = cond_text.lower()
        if 'rain' in lower_cond or 'drizzle' in lower_cond:
            weather_type = 'rain'
        elif 'thunder' in lower_cond:
            weather_type = 'storm'
        elif 'cloud' in lower_cond or 'overcast' in lower_cond:
            weather_type = 'cloudy'
        elif 'mist' in lower_cond or 'fog' in lower_cond:
            weather_type = 'fog'
        elif 'clear' in lower_cond or 'sunny' in lower_cond:
            weather_type = 'clear'
        else:
            weather_type = 'partly_cloudy'

        current = {
            'temperature':    cls._r(cur_raw.get('temp_c', 0)),
            'humidity':       round(cur_raw.get('humidity', 0) or 0),
            'feels_like':     cls._r(cur_raw.get('feelslike_c', 0)),
            'precipitation':  cls._r(cur_raw.get('precip_mm', 0)),
            'wind_speed':     cls._r(cur_raw.get('wind_kph', 0)),
            'wind_gusts':     cls._r(cur_raw.get('gust_kph', 0)),
            'wind_direction': cur_raw.get('wind_degree', 0),
            'weather_code':   cond_code,
            'condition':      cond_text,
            'weather_type':   weather_type,
            'emoji':          WEATHER_EMOJI.get(weather_type, '🌡️'),
        }

        # Build 24-hr hourly forecast from day 0
        hourly = []
        if forecast_days:
            for h in forecast_days[0].get('hour', [])[:24]:
                hourly.append({
                    'time':                      h.get('time'),
                    'temperature':               cls._r(h.get('temp_c', 0)),
                    'humidity':                  round(h.get('humidity', 0) or 0),
                    'precipitation_probability': h.get('chance_of_rain', 0),
                    'precipitation':             cls._r(h.get('precip_mm', 0)),
                    'rain':                      cls._r(h.get('precip_mm', 0)),
                    'et0':                       None,
                    'vpd':                       None,
                    'wind_speed':                cls._r(h.get('wind_kph', 0)),
                    'wind_gusts':                cls._r(h.get('gust_kph', 0)),
                    'soil_moisture_raw':         None,
                })

        # Build 7-day daily forecast
        daily = []
        for fd in forecast_days:
            d_info = fd.get('day', {})
            d_cond = d_info.get('condition', {})
            d_text = d_cond.get('text', 'Clear')
            d_lower = d_text.lower()
            if 'rain' in d_lower or 'drizzle' in d_lower:
                d_type = 'rain'
            elif 'thunder' in d_lower:
                d_type = 'storm'
            elif 'cloud' in d_lower or 'overcast' in d_lower:
                d_type = 'cloudy'
            elif 'clear' in d_lower or 'sunny' in d_lower:
                d_type = 'clear'
            else:
                d_type = 'partly_cloudy'

            daily.append({
                'date':             fd.get('date'),
                'temperature_max':  cls._r(d_info.get('maxtemp_c', 0)),
                'temperature_min':  cls._r(d_info.get('mintemp_c', 0)),
                'precipitation':    cls._r(d_info.get('totalprecip_mm', 0)),
                'rainfall':         cls._r(d_info.get('totalprecip_mm', 0)),
                'rain_probability': d_info.get('daily_chance_of_rain', 0),
                'weather_code':     d_cond.get('code', 1000),
                'condition':        d_text,
                'weather_type':     d_type,
                'emoji':            WEATHER_EMOJI.get(d_type, '🌡️'),
                'wind_speed_max':   cls._r(d_info.get('maxwind_kph', 0)),
                'et0':              None,
            })

        day0 = forecast_days[0].get('day', {}) if forecast_days else {}
        return {
            'current':  current,
            'hourly':   hourly,
            'daily':    daily,
            'soil': {
                'moisture_raw':     None,
                'moisture_percent': None,
            },
            'today': {
                'et0':              None,
                'rain_probability': day0.get('daily_chance_of_rain', 0),
                'rainfall':         day0.get('totalprecip_mm', 0),
            },
            'meta': {
                'provider':     'WeatherAPI',
                'season':       get_season_india(now.month),
                'date_display': now.strftime('%a, %d %b %Y'),
                'fetched_at':   now.isoformat(),
            },
        }

    @classmethod
    def _parse(cls, raw: dict) -> dict:
        cur_raw = raw.get('current', {})
        hr_raw = raw.get('hourly', {})
        dy_raw = raw.get('daily', {})
        now = datetime.now()

        # ── Current ───────────────────────────────────────────────────────
        wc = cur_raw.get('weather_code', 0) or 0
        weather_type = get_weather_type(wc)
        current = {
            'temperature':   cls._r(cur_raw.get('temperature_2m', 0)),
            'humidity':      round(cur_raw.get('relative_humidity_2m', 0) or 0),
            'feels_like':    cls._r(cur_raw.get('apparent_temperature', 0)),
            'precipitation': cls._r(cur_raw.get('precipitation', 0)),
            'wind_speed':    cls._r(cur_raw.get('wind_speed_10m', 0)),
            'wind_gusts':    cls._r(cur_raw.get('wind_gusts_10m', 0)),
            'wind_direction': cur_raw.get('wind_direction_10m', 0),
            'weather_code':  wc,
            'condition':     get_weather_description(wc),
            'weather_type':  weather_type,
            'emoji':         WEATHER_EMOJI.get(weather_type, '🌡️'),
        }

        # ── Hourly (first 24 h) ────────────────────────────────────────────
        times = hr_raw.get('time', [])
        hourly = []
        for i, t in enumerate(times[:24]):
            hourly.append({
                'time':                    t,
                'temperature':             cls._sg(hr_raw, 'temperature_2m', i),
                'humidity':                cls._sg(hr_raw, 'relative_humidity_2m', i),
                'precipitation_probability': cls._sg(hr_raw, 'precipitation_probability', i),
                'precipitation':           cls._sg(hr_raw, 'precipitation', i),
                'rain':                    cls._sg(hr_raw, 'rain', i),
                'et0':                     cls._sg(hr_raw, 'et0_fao_evapotranspiration', i),
                'vpd':                     cls._sg(hr_raw, 'vapour_pressure_deficit', i),
                'wind_speed':              cls._sg(hr_raw, 'wind_speed_10m', i),
                'wind_gusts':              cls._sg(hr_raw, 'wind_gusts_10m', i),
                'soil_moisture_raw':       cls._sg(hr_raw, 'soil_moisture_0_to_1cm', i),
            })

        # ── Daily 7-day ───────────────────────────────────────────────────
        daily_dates = dy_raw.get('time', [])
        daily = []
        for i, date in enumerate(daily_dates):
            dwc = int(cls._sg(dy_raw, 'weather_code', i) or 0)
            dwt = get_weather_type(dwc)
            daily.append({
                'date':            date,
                'temperature_max': cls._sg(dy_raw, 'temperature_2m_max', i),
                'temperature_min': cls._sg(dy_raw, 'temperature_2m_min', i),
                'precipitation':   cls._sg(dy_raw, 'precipitation_sum', i),
                'rainfall':        cls._sg(dy_raw, 'rain_sum', i),
                'rain_probability': cls._sg(dy_raw, 'precipitation_probability_max', i),
                'weather_code':    dwc,
                'condition':       get_weather_description(dwc),
                'weather_type':    dwt,
                'emoji':           WEATHER_EMOJI.get(dwt, '🌡️'),
                'wind_speed_max':  cls._sg(dy_raw, 'wind_speed_10m_max', i),
                'et0':             cls._sg(dy_raw, 'et0_fao_evapotranspiration', i),
            })

        # ── Soil moisture ─────────────────────────────────────────────────
        # Open-Meteo reports volumetric water content (m³/m³) for 0–1 cm depth.
        # Multiply by 100 for a percentage-like display (0–50 is typical range).
        soil_raw = next(
            (h['soil_moisture_raw'] for h in hourly if h['soil_moisture_raw'] is not None),
            None,
        )
        soil_pct = round(min(soil_raw * 100, 100), 1) if soil_raw is not None else None

        today = daily[0] if daily else {}
        return {
            'current':  current,
            'hourly':   hourly,
            'daily':    daily,
            'soil': {
                'moisture_raw':     soil_raw,
                'moisture_percent': soil_pct,
            },
            'today': {
                'et0':             today.get('et0'),
                'rain_probability': today.get('rain_probability', 0),
                'rainfall':        today.get('rainfall', 0),
            },
            'meta': {
                'provider':     'Open-Meteo',
                'season':       get_season_india(now.month),
                'date_display': now.strftime('%a, %d %b %Y'),
                'fetched_at':   now.isoformat(),
            },
        }

    @staticmethod
    def _r(val, decimals=1):
        """Round a value safely."""
        try:
            return round(float(val), decimals)
        except (TypeError, ValueError):
            return 0

    @staticmethod
    def _sg(d: dict, key: str, idx: int):
        """Safe-get an item from a list inside a dict; round floats."""
        vals = d.get(key, [])
        if idx < len(vals) and vals[idx] is not None:
            v = vals[idx]
            return round(v, 2) if isinstance(v, float) else v
        return None

    # ── Geocoding ─────────────────────────────────────────────────────────────
    @staticmethod
    def search_location(query: str, count: int = 5) -> list:
        """Search for a place using WeatherAPI or Open-Meteo Geocoding API."""
        provider = getattr(settings, 'WEATHER_PROVIDER', 'weatherapi')
        api_key = getattr(settings, 'WEATHER_API_KEY', '')

        if provider == 'weatherapi' and api_key:
            try:
                url = f"{WEATHER_API_SEARCH}?key={api_key}&q={query}"
                with httpx.Client(timeout=10.0) as client:
                    r = client.get(url)
                    r.raise_for_status()
                    data = r.json()
                return [
                    {
                        'name':      item.get('name', ''),
                        'admin1':    item.get('region', ''),
                        'country':   item.get('country', ''),
                        'latitude':  item.get('lat'),
                        'longitude': item.get('lon'),
                        'display': f"{item.get('name', '')}, {item.get('region', '')}, {item.get('country', '')}",
                    }
                    for item in data[:count]
                ]
            except Exception as e:
                logger.warning('WeatherAPI search failed (%s), falling back to Open-Meteo', e)

        params = {'name': query, 'count': count, 'language': 'en'}
        with httpx.Client(timeout=10.0) as client:
            r = client.get(OPEN_METEO_GEOCODING, params=params)
            r.raise_for_status()
            data = r.json()

        return [
            {
                'name':      item.get('name', ''),
                'admin1':    item.get('admin1', ''),
                'country':   item.get('country', ''),
                'latitude':  item.get('latitude'),
                'longitude': item.get('longitude'),
                'display': f"{item.get('name', '')}, {item.get('admin1', '')}, {item.get('country', '')}",
            }
            for item in data.get('results', [])
        ]

