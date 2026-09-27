"""
NASA ECOSTRESS Land Surface Temperature (LST) Integration Service.

Connects saved farms to NASA ECOSTRESS LSTE 70 m product (ECO_L2T_LSTE / ECO_L2G_LSTE).
Searches official NASA CMR catalog for granules, retrieves LST raster data via
authenticated NASA Earthdata Login, extracts intersecting pixels for farm boundary/point,
converts raw Kelvin DN to Celsius (°C), and calculates farm-level thermal statistics.
"""

import io
import math
import logging
import base64
import urllib.parse
from datetime import datetime, timezone
import numpy as np
import requests
from dateutil import parser as date_parser
from shapely.geometry import shape, Point, Polygon
from shapely.prepared import prep
import pyproj
import tifffile
from django.conf import settings
from .models import Farm, ThermalObservation, ETObservation, ESIObservation

logger = logging.getLogger(__name__)

# NASA CMR API endpoint for public metadata search
CMR_GRANULES_URL = "https://cmr.earthdata.nasa.gov/search/granules.json"
USER_AGENT = "AgriSmart-AI/1.0 (Agricultural Intelligence Platform; contact@agrismart.ai)"

# Supported ECOSTRESS products (in preferred order)
ECOSTRESS_PRODUCTS = ['ECO_L2T_LSTE', 'ECO_L2G_LSTE']
ECOSTRESS_ET_PRODUCTS = ['ECO_L3T_JET', 'ECO_L3G_JET']
ECOSTRESS_ESI_PRODUCTS = ['ECO_L4T_ESI', 'ECO_L4G_ESI']

# ECOSTRESS LSTE 70 m calibration parameters
# Raw DN is UInt16 scaled Kelvin. Scale factor = 0.02. Valid range = 7500 to 65535.
LST_SCALE_FACTOR = 0.02
KELVIN_TO_CELSIUS_OFFSET = 273.15
MIN_VALID_DN = 7500
MAX_VALID_DN = 65535
NODATA_DN = 0


class ECOSTRESSError(Exception):
    """Base exception for ECOSTRESS integration errors."""
    pass


class FarmLocationUnavailableError(ECOSTRESSError):
    """Raised when farm coordinates are missing or invalid."""
    pass


class ECOSTRESSNotFoundError(ECOSTRESSError):
    """Raised when no ECOSTRESS observation is available for the farm location."""
    pass


class ECOSTRESSDataUnavailableError(ECOSTRESSError):
    """Raised when ECOSTRESS raster data cannot be downloaded from NASA Earthdata."""
    pass


class ECOSTRESSNoValidPixelsError(ECOSTRESSError):
    """Raised when the observation contains zero valid thermal pixels over the farm."""
    pass


class EarthdataSession(requests.Session):
    """
    Session handler for NASA Earthdata Cloud data downloads.
    Handles OAuth 302 redirects to urs.earthdata.nasa.gov while preserving
    credentials, and strips Authorization headers when redirected to AWS S3.
    """
    def __init__(self, username=None, password=None, token=None):
        super().__init__()
        self.username = username or getattr(settings, 'NASA_EARTHDATA_USERNAME', '')
        self.password = password or getattr(settings, 'NASA_EARTHDATA_PASSWORD', '')
        self.token = token or getattr(settings, 'NASA_EARTHDATA_TOKEN', '')
        self.headers.update({"User-Agent": USER_AGENT})

        if self.token:
            self.headers["Authorization"] = f"Bearer {self.token}"
        elif self.username and self.password:
            self.auth = (self.username, self.password)

    def rebuild_auth(self, prepared_request, response):
        """Preserve NASA Earthdata auth across URS redirects; strip on S3."""
        headers = prepared_request.headers
        url = prepared_request.url
        original_parsed = urllib.parse.urlparse(response.request.url)
        redirect_parsed = urllib.parse.urlparse(url)

        # If redirected to external storage (e.g. S3 signed URL), strip Earthdata auth
        if (
            redirect_parsed.hostname != original_parsed.hostname
            and "earthdata.nasa.gov" not in (redirect_parsed.hostname or "")
        ):
            if "Authorization" in headers:
                del headers["Authorization"]
            return

        if self.token:
            headers["Authorization"] = f"Bearer {self.token}"
        elif self.username and self.password:
            auth_str = f"{self.username}:{self.password}"
            encoded = base64.b64encode(auth_str.encode()).decode()
            headers["Authorization"] = f"Basic {encoded}"


class ECOSTRESSService:
    """Service to discover, retrieve, and process ECOSTRESS LST observations for farms."""

    @classmethod
    def get_farm_bounding_box(cls, farm):
        """
        Derive spatial bounding box [min_lon, min_lat, max_lon, max_lat]
        from farm boundary polygon or farm latitude/longitude.
        """
        if farm.latitude is None or farm.longitude is None:
            raise FarmLocationUnavailableError("Farm location is unavailable.")

        try:
            lat = float(farm.latitude)
            lon = float(farm.longitude)
        except (ValueError, TypeError):
            raise FarmLocationUnavailableError("Farm location is unavailable.")

        if not (-90 <= lat <= 90 and -180 <= lon <= 180):
            raise FarmLocationUnavailableError("Farm location is unavailable.")

        # Check if farm boundary GeoJSON is available
        boundary = farm.farm_boundary
        if boundary and isinstance(boundary, dict):
            try:
                poly = shape(boundary)
                if not poly.is_empty:
                    min_lon, min_lat, max_lon, max_lat = poly.bounds
                    # Ensure minimum box extent for satellite footprint query (at least ~0.01 deg)
                    if (max_lon - min_lon) < 0.005:
                        min_lon -= 0.005
                        max_lon += 0.005
                    if (max_lat - min_lat) < 0.005:
                        min_lat -= 0.005
                        max_lat += 0.005
                    return [round(min_lon, 5), round(min_lat, 5), round(max_lon, 5), round(max_lat, 5)]
            except Exception as e:
                logger.warning(f"Error parsing farm boundary bounds for farm {farm.id}: {e}")

        # Default: 1 km radius box around center point (~0.01 deg)
        return [round(lon - 0.01, 5), round(lat - 0.01, 5), round(lon + 0.01, 5), round(lat + 0.01, 5)]

    @classmethod
    def search_latest_granule(cls, min_lon, min_lat, max_lon, max_lat):
        """
        Query official NASA CMR catalog for the most recent ECOSTRESS LST granule
        covering the bounding box.
        """
        bbox_str = f"{min_lon},{min_lat},{max_lon},{max_lat}"

        for product in ECOSTRESS_PRODUCTS:
            params = {
                'short_name': product,
                'bounding_box': bbox_str,
                'sort_key': '-start_date',
                'page_size': 5,
            }
            headers = {'User-Agent': USER_AGENT}

            try:
                resp = requests.get(CMR_GRANULES_URL, params=params, headers=headers, timeout=15)
                if resp.status_code != 200:
                    logger.warning(f"CMR search returned status {resp.status_code} for product {product}")
                    continue

                data = resp.json()
                entries = data.get('feed', {}).get('entry', [])
                for entry in entries:
                    # Find LST GeoTIFF download link (prefer HTTPS over S3)
                    lst_url = None
                    cloud_url = None
                    qc_url = None
                    for link in entry.get('links', []):
                        href = link.get('href', '')
                        if href.startswith('https://'):
                            if href.endswith('_LST.tif') or '_LST.tif?' in href or href.endswith('LST.tif'):
                                lst_url = href
                            elif href.endswith('_cloud.tif') or '_cloud.tif?' in href:
                                cloud_url = href
                            elif href.endswith('_QC.tif') or '_QC.tif?' in href:
                                qc_url = href

                    if lst_url:
                        granule_id = entry.get('producer_granule_id') or entry.get('title')
                        obs_time_raw = entry.get('time_start')
                        if obs_time_raw:
                            obs_datetime = date_parser.isoparse(obs_time_raw)
                            if obs_datetime.tzinfo is None:
                                obs_datetime = obs_datetime.replace(tzinfo=timezone.utc)
                        else:
                            obs_datetime = datetime.now(timezone.utc)

                        return {
                            'product_name': product,
                            'granule_id': granule_id,
                            'observation_datetime': obs_datetime,
                            'lst_url': lst_url,
                            'cloud_url': cloud_url,
                            'qc_url': qc_url,
                            'entry': entry,
                        }
            except Exception as e:
                logger.error(f"Error querying NASA CMR for {product}: {e}")
                continue

        raise ECOSTRESSNotFoundError("No ECOSTRESS observation is currently available for this farm.")

    @classmethod
    def download_raster_bytes(cls, url):
        """
        Download GeoTIFF raster bytes from NASA LP DAAC using Earthdata credentials.
        """
        if not url:
            raise ECOSTRESSDataUnavailableError("Unable to retrieve ECOSTRESS data right now. Please try again later.")

        username = getattr(settings, 'NASA_EARTHDATA_USERNAME', '')
        password = getattr(settings, 'NASA_EARTHDATA_PASSWORD', '')
        token = getattr(settings, 'NASA_EARTHDATA_TOKEN', '')

        if not token and not (username and password):
            logger.warning(
                "NASA Earthdata credentials not configured in environment. "
                "Unable to authenticate against NASA LP DAAC."
            )
            raise ECOSTRESSDataUnavailableError(
                "Unable to retrieve ECOSTRESS data right now. Please try again later."
            )

        session = EarthdataSession(username=username, password=password, token=token)

        try:
            # Download with stream=False for in-memory processing
            resp = session.get(url, timeout=30, allow_redirects=True)
            if resp.status_code == 200:
                return resp.content
            elif resp.status_code in [401, 403]:
                logger.error(f"Earthdata authentication failed for {url}: status {resp.status_code}")
                raise ECOSTRESSDataUnavailableError("Unable to retrieve ECOSTRESS data right now. Please try again later.")
            else:
                logger.error(f"Earthdata download failed for {url}: status {resp.status_code}")
                raise ECOSTRESSDataUnavailableError("Unable to retrieve ECOSTRESS data right now. Please try again later.")
        except requests.RequestException as e:
            logger.error(f"Network error downloading ECOSTRESS raster: {e}")
            raise ECOSTRESSDataUnavailableError("Unable to retrieve ECOSTRESS data right now. Please try again later.")

    @classmethod
    def process_geotiff_data(cls, tiff_bytes, farm):
        """
        Extract raster pixels intersecting the farm boundary or farm center point,
        apply ECOSTRESS LSTE calibration (0.02 * DN - 273.15), filter invalid/no-data pixels,
        and calculate farm-level thermal statistics in °C.
        """
        try:
            with tifffile.TiffFile(io.BytesIO(tiff_bytes)) as tif:
                page = tif.pages[0]
                raster_data = page.asarray()
                height, width = raster_data.shape[:2]

                # Inspect GeoTIFF tags for CRS and affine geotransform
                scale_tag = page.tags.get(33550)  # ModelPixelScaleTag
                tiepoint_tag = page.tags.get(33922)  # ModelTiepointTag
                geotiff_tags = getattr(page, 'geotiff_tags', {}) or {}

                if not scale_tag or not tiepoint_tag:
                    raise ECOSTRESSDataUnavailableError("Unable to retrieve ECOSTRESS data right now. Please try again later.")

                dx, dy = scale_tag.value[0], scale_tag.value[1]
                x_origin, y_origin = tiepoint_tag.value[3], tiepoint_tag.value[4]

                # Determine whether raster coordinates are Geographic (degrees) or Projected (meters)
                is_geographic = (abs(x_origin) <= 180.0 and abs(y_origin) <= 90.0)

                if is_geographic:
                    transformer = pyproj.Transformer.from_crs("EPSG:4326", "EPSG:4326", always_xy=True)
                else:
                    epsg_code = None
                    if 'ProjectedCSTypeGeoKey' in geotiff_tags:
                        try:
                            epsg_code = int(geotiff_tags['ProjectedCSTypeGeoKey'])
                        except (ValueError, TypeError):
                            pass

                    if not epsg_code:
                        try:
                            f_lon = float(farm.longitude)
                            f_lat = float(farm.latitude)
                            utm_zone = int((f_lon + 180) / 6) + 1
                            epsg_code = 32600 + utm_zone if f_lat >= 0 else 32700 + utm_zone
                        except Exception:
                            epsg_code = 32643

                    try:
                        transformer = pyproj.Transformer.from_crs("EPSG:4326", f"EPSG:{epsg_code}", always_xy=True)
                    except Exception as e:
                        logger.warning(f"Could not initialize transformer to EPSG:{epsg_code}: {e}")
                        transformer = pyproj.Transformer.from_crs("EPSG:4326", "EPSG:4326", always_xy=True)

        except Exception as e:
            if isinstance(e, ECOSTRESSError):
                raise
            logger.error(f"Error parsing GeoTIFF file: {e}")
            raise ECOSTRESSDataUnavailableError("Unable to retrieve ECOSTRESS data right now. Please try again later.")

        # Extract coordinates of farm
        farm_lat = float(farm.latitude)
        farm_lon = float(farm.longitude)

        # Check if farm has a polygon boundary
        boundary = farm.farm_boundary
        polygon_shape = None
        if boundary and isinstance(boundary, dict):
            try:
                poly = shape(boundary)
                if not poly.is_empty:
                    polygon_shape = poly
            except Exception:
                polygon_shape = None

        raw_pixels = []

        if polygon_shape:
            # Transform polygon vertices to raster CRS and pixel coordinates
            try:
                poly_coords = list(polygon_shape.exterior.coords)
                pixel_coords = []
                for lon_pt, lat_pt in poly_coords:
                    x_pt, y_pt = transformer.transform(lon_pt, lat_pt)
                    col = (x_pt - x_origin) / dx
                    row = (y_origin - y_pt) / dy
                    pixel_coords.append((col, row))

                pixel_poly = Polygon(pixel_coords)
                prepared_poly = prep(pixel_poly)
                min_c, min_r, max_c, max_r = pixel_poly.bounds
                min_c = max(0, int(math.floor(min_c)))
                max_c = min(width - 1, int(math.ceil(max_c)))
                min_r = max(0, int(math.floor(min_r)))
                max_r = min(height - 1, int(math.ceil(max_r)))

                if min_c <= max_c and min_r <= max_r:
                    for r in range(min_r, max_r + 1):
                        for c in range(min_c, max_c + 1):
                            if prepared_poly.contains(Point(c + 0.5, r + 0.5)):
                                raw_pixels.append(int(raster_data[r, c]))

                # If polygon is smaller than a single 70m pixel, sample the centroid pixel
                if not raw_pixels:
                    centroid_x, centroid_y = transformer.transform(farm_lon, farm_lat)
                    col = int(math.floor((centroid_x - x_origin) / dx))
                    row = int(math.floor((y_origin - centroid_y) / dy))
                    if 0 <= row < height and 0 <= col < width:
                        raw_pixels.append(int(raster_data[row, col]))
            except Exception as e:
                logger.warning(f"Error extracting polygon pixels, falling back to point: {e}")
                raw_pixels = []

        if not raw_pixels:
            # Fallback to center point
            center_x, center_y = transformer.transform(farm_lon, farm_lat)
            col = int(math.floor((center_x - x_origin) / dx))
            row = int(math.floor((y_origin - center_y) / dy))
            if 0 <= row < height and 0 <= col < width:
                raw_pixels.append(int(raster_data[row, col]))

        # Filter valid pixels according to ECOSTRESS product specifications
        # Valid range: 7500 <= raw_dn <= 65535. Fill / cloud / no-data is 0.
        valid_dns = [p for p in raw_pixels if MIN_VALID_DN <= p <= MAX_VALID_DN]

        if not valid_dns:
            raise ECOSTRESSNoValidPixelsError(
                "The latest observation does not contain enough valid thermal data for this farm."
            )

        # Convert Kelvin DN to Celsius: LST (°C) = (DN * 0.02) - 273.15
        celsius_values = [(dn * LST_SCALE_FACTOR) - KELVIN_TO_CELSIUS_OFFSET for dn in valid_dns]

        # Calculate farm-level thermal statistics
        mean_lst = round(float(np.mean(celsius_values)), 1)
        median_lst = round(float(np.median(celsius_values)), 1)
        min_lst = round(float(np.min(celsius_values)), 1)
        max_lst = round(float(np.max(celsius_values)), 1)
        lst_std = round(float(np.std(celsius_values)), 1)
        pixel_count = int(len(celsius_values))

        return {
            'mean_lst_c': mean_lst,
            'median_lst_c': median_lst,
            'min_lst_c': min_lst,
            'max_lst_c': max_lst,
            'lst_std_c': lst_std,
            'valid_pixel_count': pixel_count,
        }

    @classmethod
    def get_latest_observation(cls, farm):
        """
        Return the latest stored ThermalObservation for this farm.
        """
        return farm.thermal_observations.first()

    @classmethod
    def fetch_latest_observation(cls, farm, force_download=False):
        """
        Fetch the latest ECOSTRESS observation for the farm:
        1. Read farm coordinates & bounding box.
        2. Query NASA CMR catalog for latest granule covering the farm.
        3. Avoid redundant download: if this granule is already stored, return it.
        4. If new observation, download GeoTIFF raster via NASA Earthdata session.
        5. Extract intersecting pixels and calculate farm thermal statistics.
        6. Store new ThermalObservation in DB and return it.
        """
        # Validate coordinates
        min_lon, min_lat, max_lon, max_lat = cls.get_farm_bounding_box(farm)

        # Search NASA CMR catalog for latest observation
        granule_meta = cls.search_latest_granule(min_lon, min_lat, max_lon, max_lat)
        granule_id = granule_meta['granule_id']
        obs_datetime = granule_meta['observation_datetime']
        product_name = granule_meta['product_name']
        lst_url = granule_meta['lst_url']

        # Check if already stored for this farm to avoid repeated downloads
        existing_obs = farm.thermal_observations.filter(ecostress_product_id=granule_id).first()
        if existing_obs and not force_download:
            logger.info(f"Returning cached ECOSTRESS observation {granule_id} for farm {farm.id}")
            return existing_obs

        # Download GeoTIFF raster bytes
        tiff_bytes = cls.download_raster_bytes(lst_url)

        # Process pixels and calculate thermal statistics
        stats = cls.process_geotiff_data(tiff_bytes, farm)

        # Save to database
        observation = ThermalObservation.objects.create(
            farm=farm,
            product_name=product_name,
            ecostress_product_id=granule_id,
            observation_datetime=obs_datetime,
            mean_lst_c=stats['mean_lst_c'],
            median_lst_c=stats['median_lst_c'],
            min_lst_c=stats['min_lst_c'],
            max_lst_c=stats['max_lst_c'],
            lst_std_c=stats['lst_std_c'],
            valid_pixel_count=stats['valid_pixel_count'],
            data_source="NASA ECOSTRESS",
        )
        logger.info(f"Saved new ThermalObservation {observation.id} for farm {farm.id} from {granule_id}")
        return observation


class ECOSTRESSETService:
    """Service to discover, retrieve, and process ECOSTRESS Evapotranspiration (ET) observations."""

    @classmethod
    def get_farm_bounding_box(cls, farm):
        return ECOSTRESSService.get_farm_bounding_box(farm)

    @classmethod
    def search_latest_granule(cls, min_lon, min_lat, max_lon, max_lat):
        """
        Query official NASA CMR catalog for the most recent ECOSTRESS ET granule (ECO_L3T_JET / ECO_L3G_JET)
        covering the bounding box.
        """
        bbox_str = f"{min_lon},{min_lat},{max_lon},{max_lat}"

        for product in ECOSTRESS_ET_PRODUCTS:
            params = {
                'short_name': product,
                'bounding_box': bbox_str,
                'sort_key': '-start_date',
                'page_size': 5,
            }
            headers = {'User-Agent': USER_AGENT}

            try:
                resp = requests.get(CMR_GRANULES_URL, params=params, headers=headers, timeout=15)
                if resp.status_code != 200:
                    logger.warning(f"CMR ET search returned status {resp.status_code} for product {product}")
                    continue

                data = resp.json()
                entries = data.get('feed', {}).get('entry', [])
                for entry in entries:
                    et_url = None
                    unit = 'mm/day'

                    # Search for ETdaily (daily mm/day) first
                    for link in entry.get('links', []):
                        href = link.get('href', '')
                        if href.startswith('https://'):
                            if href.endswith('_ETdaily.tif') or '_ETdaily.tif?' in href:
                                et_url = href
                                unit = 'mm/day'
                                break

                    # Fallback to PTJPLSMinst or other ET GeoTIFF
                    if not et_url:
                        for link in entry.get('links', []):
                            href = link.get('href', '')
                            if href.startswith('https://'):
                                if href.endswith('_PTJPLSMinst.tif') or '_PTJPLSMinst.tif?' in href:
                                    et_url = href
                                    unit = 'W/m²'
                                    break
                                elif href.endswith('.tif') and ('ET' in href or 'inst' in href):
                                    et_url = href
                                    unit = 'mm/day'
                                    break

                    if et_url:
                        granule_id = entry.get('producer_granule_id') or entry.get('title')
                        obs_time_raw = entry.get('time_start')
                        if obs_time_raw:
                            obs_datetime = date_parser.isoparse(obs_time_raw)
                            if obs_datetime.tzinfo is None:
                                obs_datetime = obs_datetime.replace(tzinfo=timezone.utc)
                        else:
                            obs_datetime = datetime.now(timezone.utc)

                        return {
                            'product_name': product,
                            'granule_id': granule_id,
                            'observation_datetime': obs_datetime,
                            'et_url': et_url,
                            'unit': unit,
                            'entry': entry,
                        }
            except Exception as e:
                logger.error(f"Error querying NASA CMR for ET {product}: {e}")
                continue

        raise ECOSTRESSNotFoundError("No ECOSTRESS ET observation is currently available for this farm.")

    @classmethod
    def process_et_geotiff_data(cls, tiff_bytes, farm, unit='mm/day'):
        """
        Extract ET raster pixels intersecting the farm boundary or point,
        filter valid ET pixels, apply scaling, and calculate farm-level statistics.
        """
        try:
            with tifffile.TiffFile(io.BytesIO(tiff_bytes)) as tif:
                page = tif.pages[0]
                raster_data = page.asarray()
                height, width = raster_data.shape[:2]

                scale_tag = page.tags.get(33550)  # ModelPixelScaleTag
                tiepoint_tag = page.tags.get(33922)  # ModelTiepointTag
                geotiff_tags = getattr(page, 'geotiff_tags', {}) or {}

                if not scale_tag or not tiepoint_tag:
                    raise ECOSTRESSDataUnavailableError("Unable to retrieve ECOSTRESS data right now. Please try again later.")

                dx, dy = scale_tag.value[0], scale_tag.value[1]
                x_origin, y_origin = tiepoint_tag.value[3], tiepoint_tag.value[4]

                # Coordinate reference system handling
                is_geographic = (abs(x_origin) <= 180.0 and abs(y_origin) <= 90.0)

                if is_geographic:
                    transformer = pyproj.Transformer.from_crs("EPSG:4326", "EPSG:4326", always_xy=True)
                else:
                    epsg_code = None
                    if 'ProjectedCSTypeGeoKey' in geotiff_tags:
                        try:
                            epsg_code = int(geotiff_tags['ProjectedCSTypeGeoKey'])
                        except (ValueError, TypeError):
                            pass

                    if not epsg_code:
                        try:
                            f_lon = float(farm.longitude)
                            f_lat = float(farm.latitude)
                            utm_zone = int((f_lon + 180) / 6) + 1
                            epsg_code = 32600 + utm_zone if f_lat >= 0 else 32700 + utm_zone
                        except Exception:
                            epsg_code = 32643

                    try:
                        transformer = pyproj.Transformer.from_crs("EPSG:4326", f"EPSG:{epsg_code}", always_xy=True)
                    except Exception as e:
                        logger.warning(f"Could not initialize ET transformer to EPSG:{epsg_code}: {e}")
                        transformer = pyproj.Transformer.from_crs("EPSG:4326", "EPSG:4326", always_xy=True)

        except Exception as e:
            if isinstance(e, ECOSTRESSError):
                raise
            logger.error(f"Error parsing ET GeoTIFF file: {e}")
            raise ECOSTRESSDataUnavailableError("Unable to retrieve ECOSTRESS data right now. Please try again later.")

        farm_lat = float(farm.latitude)
        farm_lon = float(farm.longitude)

        boundary = farm.farm_boundary
        polygon_shape = None
        if boundary and isinstance(boundary, dict):
            try:
                poly = shape(boundary)
                if not poly.is_empty:
                    polygon_shape = poly
            except Exception:
                polygon_shape = None

        raw_pixels = []

        if polygon_shape:
            try:
                poly_coords = list(polygon_shape.exterior.coords)
                pixel_coords = []
                for lon_pt, lat_pt in poly_coords:
                    x_pt, y_pt = transformer.transform(lon_pt, lat_pt)
                    col = (x_pt - x_origin) / dx
                    row = (y_origin - y_pt) / dy
                    pixel_coords.append((col, row))

                pixel_poly = Polygon(pixel_coords)
                prepared_poly = prep(pixel_poly)
                min_c, min_r, max_c, max_r = pixel_poly.bounds
                min_c = max(0, int(math.floor(min_c)))
                max_c = min(width - 1, int(math.ceil(max_c)))
                min_r = max(0, int(math.floor(min_r)))
                max_r = min(height - 1, int(math.ceil(max_r)))

                if min_c <= max_c and min_r <= max_r:
                    for r in range(min_r, max_r + 1):
                        for c in range(min_c, max_c + 1):
                            if prepared_poly.contains(Point(c + 0.5, r + 0.5)):
                                raw_pixels.append(raster_data[r, c])

                # Centroid fallback if smaller than 1 pixel
                if not raw_pixels:
                    centroid_x, centroid_y = transformer.transform(farm_lon, farm_lat)
                    col = int(math.floor((centroid_x - x_origin) / dx))
                    row = int(math.floor((y_origin - centroid_y) / dy))
                    if 0 <= row < height and 0 <= col < width:
                        raw_pixels.append(raster_data[row, col])
            except Exception as e:
                logger.warning(f"Error extracting polygon ET pixels, falling back to point: {e}")
                raw_pixels = []

        if not raw_pixels:
            center_x, center_y = transformer.transform(farm_lon, farm_lat)
            col = int(math.floor((center_x - x_origin) / dx))
            row = int(math.floor((y_origin - center_y) / dy))
            if 0 <= row < height and 0 <= col < width:
                raw_pixels.append(raster_data[row, col])

        # Filter valid ET values (exclude NaN, 0, negative values, and fill values >= 9999)
        valid_vals = []
        for p in raw_pixels:
            if p is None:
                continue
            try:
                val = float(p)
            except (ValueError, TypeError):
                continue
            if np.isnan(val) or np.isinf(val):
                continue
            # ECOSTRESS ET calibration
            # If stored as integer with scale factor 0.01
            if val > 1000 and unit == 'mm/day':
                val = val * 0.01

            # Valid ET range: strictly positive, reasonable bounds (e.g. 0 to 50 mm/day, or 0 to 1500 W/m²)
            max_limit = 1500.0 if unit == 'W/m²' else 50.0
            if 0.0 < val <= max_limit:
                valid_vals.append(val)

        if not valid_vals:
            raise ECOSTRESSNoValidPixelsError(
                "The latest observation does not contain enough valid ET data for this farm."
            )

        mean_et = round(float(np.mean(valid_vals)), 2)
        median_et = round(float(np.median(valid_vals)), 2)
        min_et = round(float(np.min(valid_vals)), 2)
        max_et = round(float(np.max(valid_vals)), 2)
        et_std = round(float(np.std(valid_vals)), 2)
        pixel_count = int(len(valid_vals))

        return {
            'mean_et': mean_et,
            'median_et': median_et,
            'min_et': min_et,
            'max_et': max_et,
            'et_std': et_std,
            'valid_pixel_count': pixel_count,
            'unit': unit,
        }

    @classmethod
    def get_latest_observation(cls, farm):
        return farm.et_observations.first()

    @classmethod
    def fetch_latest_observation(cls, farm, force_download=False):
        """
        Fetch latest ECOSTRESS ET observation:
        1. Read farm coordinates & bounding box.
        2. Query NASA CMR catalog for latest ET granule (ECO_L3T_JET).
        3. Check database: if granule already stored, return without re-downloading.
        4. If new, download raster bytes via authenticated NASA Earthdata session.
        5. Extract intersecting pixels and calculate farm ET statistics.
        6. Store new ETObservation in DB and return it.
        """
        min_lon, min_lat, max_lon, max_lat = cls.get_farm_bounding_box(farm)

        granule_meta = cls.search_latest_granule(min_lon, min_lat, max_lon, max_lat)
        granule_id = granule_meta['granule_id']
        obs_datetime = granule_meta['observation_datetime']
        product_name = granule_meta['product_name']
        et_url = granule_meta['et_url']
        unit = granule_meta.get('unit', 'mm/day')

        # Avoid repeated download if already stored for this farm
        existing_obs = farm.et_observations.filter(ecostress_product_id=granule_id).first()
        if existing_obs and not force_download:
            logger.info(f"Returning cached ECOSTRESS ET observation {granule_id} for farm {farm.id}")
            return existing_obs

        # Download GeoTIFF raster bytes
        tiff_bytes = ECOSTRESSService.download_raster_bytes(et_url)

        # Process pixels and calculate ET statistics
        stats = cls.process_et_geotiff_data(tiff_bytes, farm, unit=unit)

        # Save to database
        observation = ETObservation.objects.create(
            farm=farm,
            product_name=product_name,
            ecostress_product_id=granule_id,
            observation_datetime=obs_datetime,
            mean_et=stats['mean_et'],
            median_et=stats['median_et'],
            min_et=stats['min_et'],
            max_et=stats['max_et'],
            et_std=stats['et_std'],
            valid_pixel_count=stats['valid_pixel_count'],
            unit=stats['unit'],
            data_source="NASA ECOSTRESS",
        )
        logger.info(f"Saved new ETObservation {observation.id} for farm {farm.id} from {granule_id}")
        return observation


class ECOSTRESSESIService:
    """
    Service to discover, retrieve, and process ECOSTRESS Evaporative Stress Index (ESI) observations.
    ESI is the ratio of actual evapotranspiration to potential evapotranspiration (ET / PET),
    providing a high-resolution (70 m) indicator of vegetation water stress (ECO_L4T_ESI / ECO_L4G_ESI).
    """

    @classmethod
    def get_farm_bounding_box(cls, farm):
        return ECOSTRESSService.get_farm_bounding_box(farm)

    @classmethod
    def search_latest_granule(cls, min_lon, min_lat, max_lon, max_lat):
        """
        Query official NASA CMR catalog for the most recent ECOSTRESS ESI granule (ECO_L4T_ESI / ECO_L4G_ESI)
        covering the bounding box.
        """
        bbox_str = f"{min_lon},{min_lat},{max_lon},{max_lat}"

        for product in ECOSTRESS_ESI_PRODUCTS:
            params = {
                'short_name': product,
                'bounding_box': bbox_str,
                'sort_key': '-start_date',
                'page_size': 5,
            }
            headers = {'User-Agent': USER_AGENT}

            try:
                resp = requests.get(CMR_GRANULES_URL, params=params, headers=headers, timeout=15)
                if resp.status_code != 200:
                    logger.warning(f"CMR ESI search returned status {resp.status_code} for product {product}")
                    continue

                data = resp.json()
                entries = data.get('feed', {}).get('entry', [])
                for entry in entries:
                    esi_url = None
                    pet_url = None
                    water_url = None
                    cloud_url = None

                    # Find ESI GeoTIFF download link (prefer HTTPS over S3)
                    for link in entry.get('links', []):
                        href = link.get('href', '')
                        if href.startswith('https://'):
                            if href.endswith('_ESI.tif') or '_ESI.tif?' in href:
                                esi_url = href
                            elif href.endswith('_PET.tif') or '_PET.tif?' in href:
                                pet_url = href
                            elif href.endswith('_water.tif') or '_water.tif?' in href:
                                water_url = href
                            elif href.endswith('_cloud.tif') or '_cloud.tif?' in href:
                                cloud_url = href
                            elif href.endswith('.tif') and ('ESI' in href or 'esi' in href) and not esi_url:
                                esi_url = href

                    if esi_url:
                        granule_id = entry.get('producer_granule_id') or entry.get('title')
                        obs_time_raw = entry.get('time_start')
                        if obs_time_raw:
                            obs_datetime = date_parser.isoparse(obs_time_raw)
                            if obs_datetime.tzinfo is None:
                                obs_datetime = obs_datetime.replace(tzinfo=timezone.utc)
                        else:
                            obs_datetime = datetime.now(timezone.utc)

                        return {
                            'product_name': product,
                            'granule_id': granule_id,
                            'observation_datetime': obs_datetime,
                            'esi_url': esi_url,
                            'pet_url': pet_url,
                            'water_url': water_url,
                            'cloud_url': cloud_url,
                            'unit': 'ratio',
                            'entry': entry,
                        }
            except Exception as e:
                logger.error(f"Error querying NASA CMR for ESI {product}: {e}")
                continue

        raise ECOSTRESSNotFoundError("No ECOSTRESS ESI observation is currently available for this farm.")

    @classmethod
    def process_esi_geotiff_data(cls, tiff_bytes, farm, unit='ratio'):
        """
        Extract ESI raster pixels intersecting the farm boundary or point,
        filter valid ESI pixels, and calculate farm-level statistics.
        ESI is the ratio of actual ET to potential ET (dimensionless, valid range 0.0 - 2.0).
        """
        try:
            with tifffile.TiffFile(io.BytesIO(tiff_bytes)) as tif:
                page = tif.pages[0]
                raster_data = page.asarray()
                height, width = raster_data.shape[:2]

                scale_tag = page.tags.get(33550)  # ModelPixelScaleTag
                tiepoint_tag = page.tags.get(33922)  # ModelTiepointTag
                geotiff_tags = getattr(page, 'geotiff_tags', {}) or {}

                if not scale_tag or not tiepoint_tag:
                    raise ECOSTRESSDataUnavailableError("Unable to retrieve ECOSTRESS data right now. Please try again later.")

                dx, dy = scale_tag.value[0], scale_tag.value[1]
                x_origin, y_origin = tiepoint_tag.value[3], tiepoint_tag.value[4]

                # Coordinate reference system handling
                is_geographic = (abs(x_origin) <= 180.0 and abs(y_origin) <= 90.0)

                if is_geographic:
                    transformer = pyproj.Transformer.from_crs("EPSG:4326", "EPSG:4326", always_xy=True)
                else:
                    epsg_code = None
                    if 'ProjectedCSTypeGeoKey' in geotiff_tags:
                        try:
                            epsg_code = int(geotiff_tags['ProjectedCSTypeGeoKey'])
                        except (ValueError, TypeError):
                            pass

                    if not epsg_code:
                        try:
                            f_lon = float(farm.longitude)
                            f_lat = float(farm.latitude)
                            utm_zone = int((f_lon + 180) / 6) + 1
                            epsg_code = 32600 + utm_zone if f_lat >= 0 else 32700 + utm_zone
                        except Exception:
                            epsg_code = 32643

                    try:
                        transformer = pyproj.Transformer.from_crs("EPSG:4326", f"EPSG:{epsg_code}", always_xy=True)
                    except Exception as e:
                        logger.warning(f"Could not initialize ESI transformer to EPSG:{epsg_code}: {e}")
                        transformer = pyproj.Transformer.from_crs("EPSG:4326", "EPSG:4326", always_xy=True)

        except Exception as e:
            if isinstance(e, ECOSTRESSError):
                raise
            logger.error(f"Error parsing ESI GeoTIFF file: {e}")
            raise ECOSTRESSDataUnavailableError("Unable to retrieve ECOSTRESS data right now. Please try again later.")

        farm_lat = float(farm.latitude)
        farm_lon = float(farm.longitude)

        boundary = farm.farm_boundary
        polygon_shape = None
        if boundary and isinstance(boundary, dict):
            try:
                poly = shape(boundary)
                if not poly.is_empty:
                    polygon_shape = poly
            except Exception:
                polygon_shape = None

        raw_pixels = []

        if polygon_shape:
            try:
                poly_coords = list(polygon_shape.exterior.coords)
                pixel_coords = []
                for lon_pt, lat_pt in poly_coords:
                    x_pt, y_pt = transformer.transform(lon_pt, lat_pt)
                    col = (x_pt - x_origin) / dx
                    row = (y_origin - y_pt) / dy
                    pixel_coords.append((col, row))

                pixel_poly = Polygon(pixel_coords)
                prepared_poly = prep(pixel_poly)
                min_c, min_r, max_c, max_r = pixel_poly.bounds
                min_c = max(0, int(math.floor(min_c)))
                max_c = min(width - 1, int(math.ceil(max_c)))
                min_r = max(0, int(math.floor(min_r)))
                max_r = min(height - 1, int(math.ceil(max_r)))

                if min_c <= max_c and min_r <= max_r:
                    for r in range(min_r, max_r + 1):
                        for c in range(min_c, max_c + 1):
                            if prepared_poly.contains(Point(c + 0.5, r + 0.5)):
                                raw_pixels.append(raster_data[r, c])

                # Centroid fallback if farm smaller than 1 pixel
                if not raw_pixels:
                    centroid_x, centroid_y = transformer.transform(farm_lon, farm_lat)
                    col = int(math.floor((centroid_x - x_origin) / dx))
                    row = int(math.floor((y_origin - centroid_y) / dy))
                    if 0 <= row < height and 0 <= col < width:
                        raw_pixels.append(raster_data[row, col])
            except Exception as e:
                logger.warning(f"Error extracting polygon ESI pixels, falling back to point: {e}")
                raw_pixels = []

        if not raw_pixels:
            center_x, center_y = transformer.transform(farm_lon, farm_lat)
            col = int(math.floor((center_x - x_origin) / dx))
            row = int(math.floor((y_origin - center_y) / dy))
            if 0 <= row < height and 0 <= col < width:
                raw_pixels.append(raster_data[row, col])

        # Filter valid ESI values:
        # ESI is a ratio (actual ET / potential ET), valid between 0.0 and 2.0 (typically 0.1 to 1.2).
        # Exclude NaN, inf, negatives, and nodata/fill values (e.g. -9999, 65535, or >= 9999).
        valid_vals = []
        for p in raw_pixels:
            if p is None:
                continue
            try:
                val = float(p)
            except (ValueError, TypeError):
                continue
            if np.isnan(val) or np.isinf(val):
                continue

            # Scale if stored as integer DN with scale factor 0.001 or 0.0001
            if val > 10.0 and val < 60000:
                val = val * 0.001

            # Valid ESI range: 0.0 <= val <= 2.0
            if 0.0 <= val <= 2.0:
                valid_vals.append(val)

        if not valid_vals:
            raise ECOSTRESSNoValidPixelsError(
                "The latest observation does not contain enough valid ESI data for this farm."
            )

        mean_esi = round(float(np.mean(valid_vals)), 3)
        median_esi = round(float(np.median(valid_vals)), 3)
        min_esi = round(float(np.min(valid_vals)), 3)
        max_esi = round(float(np.max(valid_vals)), 3)
        esi_std = round(float(np.std(valid_vals)), 3)
        pixel_count = int(len(valid_vals))

        return {
            'mean_esi': mean_esi,
            'median_esi': median_esi,
            'min_esi': min_esi,
            'max_esi': max_esi,
            'esi_std': esi_std,
            'valid_pixel_count': pixel_count,
            'unit': 'ratio',
        }

    @classmethod
    def get_latest_observation(cls, farm):
        return farm.esi_observations.first()

    @classmethod
    def fetch_latest_observation(cls, farm, force_download=False):
        """
        Fetch latest ECOSTRESS ESI observation:
        1. Read farm coordinates & bounding box.
        2. Query NASA CMR catalog for latest ESI granule (ECO_L4T_ESI).
        3. Check database: if granule already stored, return without re-downloading.
        4. If new, download raster bytes via authenticated NASA Earthdata session.
        5. Extract intersecting pixels and calculate farm ESI statistics.
        6. Store new ESIObservation in DB and return it.
        """
        min_lon, min_lat, max_lon, max_lat = cls.get_farm_bounding_box(farm)

        granule_meta = cls.search_latest_granule(min_lon, min_lat, max_lon, max_lat)
        granule_id = granule_meta['granule_id']
        obs_datetime = granule_meta['observation_datetime']
        product_name = granule_meta['product_name']
        esi_url = granule_meta['esi_url']
        unit = granule_meta.get('unit', 'ratio')

        # Avoid repeated download if already stored for this farm
        existing_obs = farm.esi_observations.filter(ecostress_product_id=granule_id).first()
        if existing_obs and not force_download:
            logger.info(f"Returning cached ECOSTRESS ESI observation {granule_id} for farm {farm.id}")
            return existing_obs

        # Download GeoTIFF raster bytes
        tiff_bytes = ECOSTRESSService.download_raster_bytes(esi_url)

        # Process pixels and calculate ESI statistics
        stats = cls.process_esi_geotiff_data(tiff_bytes, farm, unit=unit)

        # Save to database
        observation = ESIObservation.objects.create(
            farm=farm,
            product_name=product_name,
            ecostress_product_id=granule_id,
            observation_datetime=obs_datetime,
            mean_esi=stats['mean_esi'],
            median_esi=stats['median_esi'],
            min_esi=stats['min_esi'],
            max_esi=stats['max_esi'],
            esi_std=stats['esi_std'],
            valid_pixel_count=stats['valid_pixel_count'],
            unit=stats['unit'],
            data_source="NASA ECOSTRESS",
        )
        logger.info(f"Saved new ESIObservation {observation.id} for farm {farm.id} from {granule_id}")
        return observation


