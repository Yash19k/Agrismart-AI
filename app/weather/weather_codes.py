"""WMO Weather interpretation codes → human-readable labels."""

# (description, category)
WEATHER_CODE_MAP = {
    0:  ('Clear sky', 'clear'),
    1:  ('Mainly clear', 'clear'),
    2:  ('Partly cloudy', 'cloudy'),
    3:  ('Overcast', 'cloudy'),
    45: ('Fog', 'fog'),
    48: ('Icy fog', 'fog'),
    51: ('Light drizzle', 'drizzle'),
    53: ('Moderate drizzle', 'drizzle'),
    55: ('Dense drizzle', 'drizzle'),
    56: ('Light freezing drizzle', 'drizzle'),
    57: ('Heavy freezing drizzle', 'drizzle'),
    61: ('Slight rain', 'rain'),
    63: ('Moderate rain', 'rain'),
    65: ('Heavy rain', 'rain'),
    66: ('Light freezing rain', 'rain'),
    67: ('Heavy freezing rain', 'rain'),
    71: ('Slight snowfall', 'snow'),
    73: ('Moderate snowfall', 'snow'),
    75: ('Heavy snowfall', 'snow'),
    77: ('Snow grains', 'snow'),
    80: ('Slight rain showers', 'showers'),
    81: ('Moderate rain showers', 'showers'),
    82: ('Violent rain showers', 'showers'),
    85: ('Slight snow showers', 'snow'),
    86: ('Heavy snow showers', 'snow'),
    95: ('Thunderstorm', 'storm'),
    96: ('Thunderstorm with hail', 'storm'),
    99: ('Thunderstorm with heavy hail', 'storm'),
}


def get_weather_description(code: int) -> str:
    """Return human-readable string for a WMO weather code."""
    entry = WEATHER_CODE_MAP.get(int(code) if code is not None else 0)
    if entry:
        return entry[0]
    c = int(code) if code else 0
    if c == 0:
        return 'Clear sky'
    if c <= 3:
        return 'Partly cloudy'
    if c <= 48:
        return 'Fog'
    if c <= 57:
        return 'Drizzle'
    if c <= 67:
        return 'Rain'
    if c <= 77:
        return 'Snow'
    if c <= 82:
        return 'Rain showers'
    if c >= 95:
        return 'Thunderstorm'
    return 'Unknown'


def get_weather_type(code: int) -> str:
    """Return category key for icon/emoji selection."""
    entry = WEATHER_CODE_MAP.get(int(code) if code is not None else 0)
    return entry[1] if entry else 'unknown'


def get_season_india(month: int) -> str:
    """Return Indian agricultural season name for a given calendar month."""
    if month in (6, 7, 8, 9, 10):
        return 'Kharif Season'
    if month in (11, 12, 1, 2, 3):
        return 'Rabi Season'
    return 'Zaid Season'


WEATHER_EMOJI = {
    'clear':   '☀️',
    'cloudy':  '⛅',
    'fog':     '🌫️',
    'drizzle': '🌦️',
    'rain':    '🌧️',
    'snow':    '❄️',
    'showers': '🌦️',
    'storm':   '⛈️',
    'unknown': '🌡️',
}
