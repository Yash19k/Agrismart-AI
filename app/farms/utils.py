"""
Geospatial utilities for farm boundary parsing, validation, and geodesic area calculation.
"""
import math
import logging

logger = logging.getLogger(__name__)

SQ_METERS_PER_ACRE = 4046.8564224


def normalize_and_validate_polygon(boundary_data):
    """
    Validates and normalizes polygon boundary data into canonical GeoJSON Polygon structure:
    {
        "type": "Polygon",
        "coordinates": [[[lon, lat], [lon, lat], ..., [lon, lat]]]
    }

    Accepts:
      - GeoJSON Polygon dict: {"type": "Polygon", "coordinates": [[[lon, lat], ...]]}
      - GeoJSON Feature dict: {"type": "Feature", "geometry": {"type": "Polygon", "coordinates": [...]}}
      - List of coordinate pairs [[lng, lat], ...] or [[lat, lng], ...]
      - List of point dicts [{'lat': y, 'lng': x}, ...]

    Returns:
      Canonical GeoJSON Polygon dict or None if invalid.
    """
    if not boundary_data:
        return None

    raw_coords = None

    if isinstance(boundary_data, dict):
        if boundary_data.get('type') == 'Feature':
            geom = boundary_data.get('geometry') or {}
            if geom.get('type') == 'Polygon':
                raw_coords = geom.get('coordinates')
        elif boundary_data.get('type') == 'Polygon':
            raw_coords = boundary_data.get('coordinates')
    elif isinstance(boundary_data, list):
        raw_coords = [boundary_data]

    if not raw_coords or not isinstance(raw_coords, list) or len(raw_coords) == 0:
        return None

    outer_ring = raw_coords[0]
    if not isinstance(outer_ring, list) or len(outer_ring) < 3:
        return None

    normalized_ring = []
    for item in outer_ring:
        if isinstance(item, (list, tuple)) and len(item) >= 2:
            lon_val = float(item[0])
            lat_val = float(item[1])
            # Check coordinates are in range
            if not (-180 <= lon_val <= 180 and -90 <= lat_val <= 90):
                # Check if coordinates were passed as [lat, lon] instead of [lon, lat]
                if -90 <= lon_val <= 90 and -180 <= lat_val <= 180:
                    lon_val, lat_val = lat_val, lon_val
                else:
                    return None
            normalized_ring.append([round(lon_val, 7), round(lat_val, 7)])
        elif isinstance(item, dict):
            lat = item.get('lat') or item.get('latitude')
            lon = item.get('lng') or item.get('lon') or item.get('longitude')
            if lat is not None and lon is not None:
                lon_val = float(lon)
                lat_val = float(lat)
                if not (-180 <= lon_val <= 180 and -90 <= lat_val <= 90):
                    return None
                normalized_ring.append([round(lon_val, 7), round(lat_val, 7)])
            else:
                return None
        else:
            return None

    if len(normalized_ring) < 3:
        return None

    # Ensure outer ring is closed
    if normalized_ring[0] != normalized_ring[-1]:
        normalized_ring.append(normalized_ring[0])

    # A closed polygon must have at least 4 coordinates (3 unique vertices + closing vertex)
    if len(normalized_ring) < 4:
        return None

    return {
        "type": "Polygon",
        "coordinates": [normalized_ring]
    }


def calculate_geodesic_area_acres(polygon_geojson):
    """
    Calculates geodesic polygon area on WGS84 ellipsoid in acres.
    Uses pyproj + shapely as primary with spherical excess formula as fallback.
    Returns float rounded to 2 decimal places.
    """
    if not polygon_geojson or not isinstance(polygon_geojson, dict):
        return 0.0

    coords = polygon_geojson.get('coordinates')
    if not coords or not isinstance(coords, list) or len(coords) == 0:
        return 0.0

    outer_ring = coords[0]
    if len(outer_ring) < 4:
        return 0.0

    # 1. Primary: pyproj Geod (WGS84 ellipsoid calculation)
    try:
        from pyproj import Geod
        from shapely.geometry import Polygon
        poly = Polygon(outer_ring)
        if not poly.is_valid:
            poly = poly.buffer(0)
        geod = Geod(ellps='WGS84')
        area_m2, _ = geod.geometry_area_perimeter(poly)
        area_acres = abs(area_m2) / SQ_METERS_PER_ACRE
        return round(area_acres, 2)
    except Exception as e:
        logger.debug("pyproj calculation unavailable or error (%s), using spherical fallback", e)

    # 2. Robust fallback: Chamberlain & Duquette spherical algorithm
    try:
        RADIUS = 6378137.0  # Earth WGS84 equatorial radius in meters
        total = 0.0
        n = len(outer_ring)
        for i in range(n - 1):
            p1 = outer_ring[i]
            p2 = outer_ring[i + 1]
            lon1, lat1 = math.radians(p1[0]), math.radians(p1[1])
            lon2, lat2 = math.radians(p2[0]), math.radians(p2[1])
            total += (lon2 - lon1) * (2 + math.sin(lat1) + math.sin(lat2))
        area_m2 = abs(total * (RADIUS ** 2) / 2.0)
        return round(area_m2 / SQ_METERS_PER_ACRE, 2)
    except Exception as err:
        logger.error("Error in fallback spherical area calculation: %s", err)
        return 0.0
