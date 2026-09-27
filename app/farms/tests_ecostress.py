import io
from datetime import datetime, timezone
from unittest.mock import patch, MagicMock
import numpy as np
import tifffile
from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from farms.models import Farm, ThermalObservation, ETObservation, ESIObservation
from farms.ecostress_service import (
    ECOSTRESSService,
    ECOSTRESSETService,
    ECOSTRESSESIService,
    FarmLocationUnavailableError,
    ECOSTRESSNotFoundError,
    ECOSTRESSDataUnavailableError,
    ECOSTRESSNoValidPixelsError,
)

User = get_user_model()


def create_synthetic_geotiff(temperatures_c, width=60, height=60, origin_lon=72.90, origin_lat=22.60, pixel_size=0.0007):
    """
    Helper to create a synthetic 16-bit GeoTIFF with ECOSTRESS LSTE calibration.
    DN = (T_c + 273.15) / 0.02
    """
    if isinstance(temperatures_c, (int, float)):
        dn_val = 0 if temperatures_c is None else int(round((temperatures_c + 273.15) / 0.02))
        raster_data = np.full((height, width), dn_val, dtype=np.uint16)
    elif isinstance(temperatures_c, list):
        raster_data = np.zeros((height, width), dtype=np.uint16)
        idx = 0
        for r in range(height):
            for c in range(width):
                t = temperatures_c[idx % len(temperatures_c)]
                raster_data[r, c] = 0 if t is None else int(round((t + 273.15) / 0.02))
                idx += 1
    elif isinstance(temperatures_c, np.ndarray):
        raster_data = temperatures_c.astype(np.uint16)
    else:
        raster_data = np.zeros((height, width), dtype=np.uint16)

    buf = io.BytesIO()
    with tifffile.TiffWriter(buf) as tw:
        tw.write(
            raster_data,
            extratags=[
                (33550, 'd', 3, (pixel_size, pixel_size, 0.0), True),
                (33922, 'd', 6, (0.0, 0.0, 0.0, origin_lon, origin_lat, 0.0), True),
            ]
        )
    return buf.getvalue()


def create_synthetic_et_geotiff(et_values, width=60, height=60, origin_lon=72.90, origin_lat=22.60, pixel_size=0.0007):
    """
    Helper to create a synthetic float32 GeoTIFF for ECOSTRESS ET.
    """
    if isinstance(et_values, (int, float)):
        raster_data = np.full((height, width), float(et_values), dtype=np.float32)
    elif isinstance(et_values, list):
        raster_data = np.zeros((height, width), dtype=np.float32)
        idx = 0
        for r in range(height):
            for c in range(width):
                v = et_values[idx % len(et_values)]
                raster_data[r, c] = np.nan if v is None else float(v)
                idx += 1
    elif isinstance(et_values, np.ndarray):
        raster_data = et_values.astype(np.float32)
    else:
        raster_data = np.full((height, width), np.nan, dtype=np.float32)

    buf = io.BytesIO()
    with tifffile.TiffWriter(buf) as tw:
        tw.write(
            raster_data,
            extratags=[
                (33550, 'd', 3, (pixel_size, pixel_size, 0.0), True),
                (33922, 'd', 6, (0.0, 0.0, 0.0, origin_lon, origin_lat, 0.0), True),
            ]
        )
    return buf.getvalue()


def create_synthetic_esi_geotiff(esi_values, width=60, height=60, origin_lon=72.90, origin_lat=22.60, pixel_size=0.0007):
    """
    Helper to create a synthetic float32 GeoTIFF for ECOSTRESS ESI (ratio 0.0 - 2.0).
    """
    if isinstance(esi_values, (int, float)):
        raster_data = np.full((height, width), float(esi_values), dtype=np.float32)
    elif isinstance(esi_values, list):
        raster_data = np.zeros((height, width), dtype=np.float32)
        idx = 0
        for r in range(height):
            for c in range(width):
                v = esi_values[idx % len(esi_values)]
                raster_data[r, c] = np.nan if v is None else float(v)
                idx += 1
    elif isinstance(esi_values, np.ndarray):
        raster_data = esi_values.astype(np.float32)
    else:
        raster_data = np.full((height, width), np.nan, dtype=np.float32)

    buf = io.BytesIO()
    with tifffile.TiffWriter(buf) as tw:
        tw.write(
            raster_data,
            extratags=[
                (33550, 'd', 3, (pixel_size, pixel_size, 0.0), True),
                (33922, 'd', 6, (0.0, 0.0, 0.0, origin_lon, origin_lat, 0.0), True),
            ]
        )
    return buf.getvalue()



class ECOSTRESSTestCase(TestCase):
    """
    Test suite for NASA ECOSTRESS Land Surface Temperature (LST) integration:
    - Scientific accuracy & unit conversions (°C)
    - Polygon and point pixel extraction
    - Error handling according to prompt specifications
    - User access isolation
    - Caching / avoiding repeated downloads
    - Multi-farm coordinate independence
    """

    def setUp(self):
        self.user_a = User.objects.create_user(username='farmer_a', email='a@farm.com', password='password123')
        self.user_b = User.objects.create_user(username='farmer_b', email='b@farm.com', password='password123')

        self.client_a = APIClient()
        self.client_a.force_authenticate(user=self.user_a)

        self.client_b = APIClient()
        self.client_b.force_authenticate(user=self.user_b)

        # Farm A belonging to user A in Gujarat (22.5645, 72.9289)
        # Bounded by 72.915 to 72.935 lon, 22.565 to 22.585 lat
        self.farm_a = Farm.objects.create(
            user=self.user_a,
            farm_name='Anand Organic Farm',
            latitude=22.5645,
            longitude=72.9289,
            location_name='Anand, Gujarat',
            crop='Wheat',
            crop_stage='vegetative',
            soil_type='alluvial',
            irrigation_type='drip',
            farm_boundary={
                'type': 'Polygon',
                'coordinates': [[
                    [72.915, 22.585],
                    [72.935, 22.585],
                    [72.935, 22.565],
                    [72.915, 22.565],
                    [72.915, 22.585]
                ]]
            }
        )

        # Farm B belonging to user B in Punjab (30.9010, 75.8573)
        self.farm_b = Farm.objects.create(
            user=self.user_b,
            farm_name='Ludhiana Wheat Fields',
            latitude=30.9010,
            longitude=75.8573,
            location_name='Ludhiana, Punjab',
            crop='Wheat',
            crop_stage='flowering',
            soil_type='loamy',
            irrigation_type='sprinkler'
        )

    def test_temperature_unit_conversion_and_pixel_statistics(self):
        """
        Verify:
        1. Correct unit conversion from UInt16 scaled Kelvin DN to Celsius: (DN * 0.02) - 273.15
        2. Accurate calculation of Mean, Median, Min, Max, Std Dev, and Valid Pixels
        3. Exclusion of invalid / no-data / cloud pixels (DN=0) from calculation
        """
        # Create synthetic GeoTIFF with known values covering the farm polygon:
        # Array of 4 temperatures: 30.0, 32.0, 34.0, 36.0 °C and some None (DN=0)
        # Expected Mean: 33.0 °C, Median: 33.0 °C, Min: 30.0 °C, Max: 36.0 °C
        # 1. Test multi-value array with valid range and no-data (None -> 0)
        temps = [30.0, 36.0, None]
        tiff_bytes = create_synthetic_geotiff(temps, width=60, height=60, origin_lon=72.90, origin_lat=22.60)
        stats = ECOSTRESSService.process_geotiff_data(tiff_bytes, self.farm_a)

        self.assertEqual(stats['min_lst_c'], 30.0)
        self.assertEqual(stats['max_lst_c'], 36.0)
        self.assertTrue(30.0 <= stats['mean_lst_c'] <= 36.0)
        self.assertTrue(30.0 <= stats['median_lst_c'] <= 36.0)
        self.assertGreater(stats['lst_std_c'], 0.0)
        self.assertGreater(stats['valid_pixel_count'], 0)
        # Invalid pixels (DN=0) must NOT be converted as 0 K (-273.15 °C) or 0 °C
        self.assertNotEqual(stats['min_lst_c'], -273.15)
        self.assertNotEqual(stats['min_lst_c'], 0.0)

        # 2. Test exact uniform conversion (32.8 °C) with scattered no-data
        uniform_temps = [32.8, 32.8, None]
        uniform_bytes = create_synthetic_geotiff(uniform_temps, width=60, height=60, origin_lon=72.90, origin_lat=22.60)
        u_stats = ECOSTRESSService.process_geotiff_data(uniform_bytes, self.farm_a)
        self.assertEqual(u_stats['mean_lst_c'], 32.8)
        self.assertEqual(u_stats['median_lst_c'], 32.8)
        self.assertEqual(u_stats['min_lst_c'], 32.8)
        self.assertEqual(u_stats['max_lst_c'], 32.8)
        self.assertEqual(u_stats['lst_std_c'], 0.0)

    def test_farm_with_missing_coordinates(self):
        """Test error handling when farm coordinates are missing or None."""
        mock_farm = MagicMock()
        mock_farm.id = 991
        mock_farm.latitude = None
        mock_farm.longitude = None
        mock_farm.user = self.user_a

        with patch('farms.views._get_authenticated_farm', return_value=(mock_farm, None)):
            res = self.client_a.get(f'/api/farms/{mock_farm.id}/thermal/')
            self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
            self.assertEqual(res.data.get('detail'), 'Farm location is unavailable.')

            res_fetch = self.client_a.post(f'/api/farms/{mock_farm.id}/thermal/fetch/')
            self.assertEqual(res_fetch.status_code, status.HTTP_400_BAD_REQUEST)
            self.assertEqual(res_fetch.data.get('detail'), 'Farm location is unavailable.')

    def test_farm_with_invalid_coordinates(self):
        """Test error handling when farm coordinates are out of valid range."""
        farm_invalid = Farm.objects.create(
            user=self.user_a,
            farm_name='Invalid Range Farm',
            latitude=150.0,  # Out of range (-90 to 90)
            longitude=72.9289,
            crop='Tomato',
            soil_type='red',
            irrigation_type='manual'
        )

        res = self.client_a.get(f'/api/farms/{farm_invalid.id}/thermal/')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(res.data.get('detail'), 'Farm location is unavailable.')

    def test_user_cannot_access_another_users_farm(self):
        """Test requirement 9 & 15: authenticated user must only access their own farm's thermal data."""
        # User A attempts to access Farm B (owned by User B)
        res = self.client_a.get(f'/api/farms/{self.farm_b.id}/thermal/')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(res.data.get('detail'), 'You do not have permission to access thermal data for this farm.')

        # User B attempts to access Farm A (owned by User A)
        res = self.client_b.get(f'/api/farms/{self.farm_a.id}/thermal/')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(res.data.get('detail'), 'You do not have permission to access thermal data for this farm.')

    def test_nonexistent_farm_returns_404(self):
        """Test error handling when farm ID does not exist."""
        res = self.client_a.get('/api/farms/99999/thermal/')
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(res.data.get('detail'), 'No farm found. Please create a farm first.')

    @patch.object(ECOSTRESSService, 'search_latest_granule')
    def test_no_ecostress_observation_available(self, mock_search):
        """Test error handling when CMR finds 0 granules for farm location."""
        mock_search.side_effect = ECOSTRESSNotFoundError(
            "No ECOSTRESS observation is currently available for this farm."
        )

        res = self.client_a.get(f'/api/farms/{self.farm_a.id}/thermal/')
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(res.data.get('detail'), 'No ECOSTRESS observation is currently available for this farm.')

    @patch.object(ECOSTRESSService, 'search_latest_granule')
    @patch.object(ECOSTRESSService, 'download_raster_bytes')
    def test_observation_with_no_valid_pixels(self, mock_download, mock_search):
        """Test error handling when observation is 100% cloud-covered or fill values."""
        mock_search.return_value = {
            'product_name': 'ECO_L2T_LSTE',
            'granule_id': 'ECOv002_L2T_LSTE_TEST_CLOUD',
            'observation_datetime': datetime(2026, 9, 26, 6, 30, tzinfo=timezone.utc),
            'lst_url': 'https://data.lpdaac.earthdatacloud.nasa.gov/lp-prod-protected/test_LST.tif'
        }
        # Synthetic GeoTIFF with all 0s (fill / cloud)
        all_zero_tiff = create_synthetic_geotiff(None, width=60, height=60, origin_lon=72.90, origin_lat=22.60)
        mock_download.return_value = all_zero_tiff

        res = self.client_a.post(f'/api/farms/{self.farm_a.id}/thermal/fetch/')
        self.assertEqual(res.status_code, status.HTTP_422_UNPROCESSABLE_ENTITY)
        self.assertEqual(
            res.data.get('detail'),
            'The latest observation does not contain enough valid thermal data for this farm.'
        )

    @patch.object(ECOSTRESSService, 'search_latest_granule')
    @patch.object(ECOSTRESSService, 'download_raster_bytes')
    def test_successful_thermal_observation_lifecycle(self, mock_download, mock_search):
        """
        Verify complete pipeline:
        Farm coordinates -> ECOSTRESS search -> Download -> Process Pixels -> Store in DB -> GET returns stored
        """
        granule_id = 'ECOv003_L2T_LSTE_46638_002_43QBF_20260926T063732_01'
        obs_time = datetime(2026, 9, 26, 6, 37, 32, tzinfo=timezone.utc)
        mock_search.return_value = {
            'product_name': 'ECO_L2T_LSTE',
            'granule_id': granule_id,
            'observation_datetime': obs_time,
            'lst_url': f'https://data.lpdaac.earthdatacloud.nasa.gov/lp-prod-protected/{granule_id}_LST.tif'
        }

        # 31.5 °C synthetic raster covering farm_a
        mock_download.return_value = create_synthetic_geotiff(31.5, width=60, height=60, origin_lon=72.90, origin_lat=22.60)

        # 1. Fetch thermal observation via POST endpoint
        fetch_res = self.client_a.post(f'/api/farms/{self.farm_a.id}/thermal/fetch/')
        self.assertEqual(fetch_res.status_code, status.HTTP_200_OK)
        data = fetch_res.data

        self.assertEqual(data['farm_id'], self.farm_a.id)
        self.assertEqual(data['ecostress_product_id'], granule_id)
        self.assertEqual(data['mean_lst_c'], 31.5)
        self.assertEqual(data['data_source'], 'NASA ECOSTRESS')
        self.assertGreater(data['valid_pixel_count'], 0)

        # Verify stored in database
        db_obs = ThermalObservation.objects.filter(farm=self.farm_a).first()
        self.assertIsNotNone(db_obs)
        self.assertEqual(db_obs.ecostress_product_id, granule_id)
        self.assertEqual(db_obs.mean_lst_c, 31.5)

        # 2. Avoid repeated downloads: subsequent GET returns stored observation
        # Reset mocks to verify they are NOT called again
        mock_search.reset_mock()
        mock_download.reset_mock()

        get_res = self.client_a.get(f'/api/farms/{self.farm_a.id}/thermal/')
        self.assertEqual(get_res.status_code, status.HTTP_200_OK)
        self.assertEqual(get_res.data['ecostress_product_id'], granule_id)
        self.assertEqual(get_res.data['mean_lst_c'], 31.5)

        mock_search.assert_not_called()
        mock_download.assert_not_called()

    @patch.object(ECOSTRESSService, 'search_latest_granule')
    @patch.object(ECOSTRESSService, 'download_raster_bytes')
    def test_two_farms_different_locations(self, mock_download, mock_search):
        """
        Test Requirement 15.3 & 15.4:
        Confirm that each farm retrieves data using its own coordinates and remains isolated.
        """
        # Farm A (Gujarat): 32.5 °C
        mock_search.return_value = {
            'product_name': 'ECO_L2T_LSTE',
            'granule_id': 'ECOv002_GUJARAT_GRANULE',
            'observation_datetime': datetime(2026, 9, 26, 6, 0, tzinfo=timezone.utc),
            'lst_url': 'https://data.lpdaac.earthdatacloud.nasa.gov/gujarat_LST.tif'
        }
        mock_download.return_value = create_synthetic_geotiff(32.5, width=60, height=60, origin_lon=72.90, origin_lat=22.60)
        res_a = self.client_a.post(f'/api/farms/{self.farm_a.id}/thermal/fetch/')
        self.assertEqual(res_a.status_code, status.HTTP_200_OK)

        # Farm B (Punjab - center point 30.9010, 75.8573): 27.2 °C
        mock_search.return_value = {
            'product_name': 'ECO_L2T_LSTE',
            'granule_id': 'ECOv002_PUNJAB_GRANULE',
            'observation_datetime': datetime(2026, 9, 25, 5, 0, tzinfo=timezone.utc),
            'lst_url': 'https://data.lpdaac.earthdatacloud.nasa.gov/punjab_LST.tif'
        }
        mock_download.return_value = create_synthetic_geotiff(27.2, width=60, height=60, origin_lon=75.84, origin_lat=30.92)
        res_b = self.client_b.post(f'/api/farms/{self.farm_b.id}/thermal/fetch/')
        self.assertEqual(res_b.status_code, status.HTTP_200_OK)

        # Retrieve and verify Farm A
        obs_a = ThermalObservation.objects.filter(farm=self.farm_a).first()
        self.assertIsNotNone(obs_a)
        self.assertEqual(obs_a.ecostress_product_id, 'ECOv002_GUJARAT_GRANULE')
        self.assertEqual(obs_a.mean_lst_c, 32.5)

        # Retrieve and verify Farm B
        obs_b = ThermalObservation.objects.filter(farm=self.farm_b).first()
        self.assertIsNotNone(obs_b)
        self.assertEqual(obs_b.ecostress_product_id, 'ECOv002_PUNJAB_GRANULE')
        self.assertEqual(obs_b.mean_lst_c, 27.2)

        # Verify they are strictly linked to their respective farms
        self.assertNotEqual(obs_a.farm_id, obs_b.farm_id)
        self.assertNotEqual(obs_a.mean_lst_c, obs_b.mean_lst_c)

    def test_et_statistics_calculation(self):
        """
        Verify:
        1. Correct unit preservation (mm/day)
        2. Accurate calculation of Mean, Median, Min, Max, Std Dev, and Valid Pixels
        3. Exclusion of invalid / NaN / 0 / negative pixels from ET calculations
        """
        # 1. Multi-value array with valid values (3.0, 5.0 mm/day) and invalid (None -> NaN, 0.0, -1.0)
        vals = [3.0, 5.0, None, 0.0, -1.0]
        tiff_bytes = create_synthetic_et_geotiff(vals, width=60, height=60, origin_lon=72.90, origin_lat=22.60)
        stats = ECOSTRESSETService.process_et_geotiff_data(tiff_bytes, self.farm_a, unit='mm/day')

        self.assertEqual(stats['min_et'], 3.0)
        self.assertEqual(stats['max_et'], 5.0)
        self.assertTrue(3.0 <= stats['mean_et'] <= 5.0)
        self.assertTrue(3.0 <= stats['median_et'] <= 5.0)
        self.assertGreater(stats['et_std'], 0.0)
        self.assertGreater(stats['valid_pixel_count'], 0)
        self.assertEqual(stats['unit'], 'mm/day')

        # 2. Exact uniform conversion (4.2 mm/day) with scattered NaNs
        uniform_vals = [4.2, 4.2, None]
        u_bytes = create_synthetic_et_geotiff(uniform_vals, width=60, height=60, origin_lon=72.90, origin_lat=22.60)
        u_stats = ECOSTRESSETService.process_et_geotiff_data(u_bytes, self.farm_a, unit='mm/day')
        self.assertEqual(u_stats['mean_et'], 4.2)
        self.assertEqual(u_stats['median_et'], 4.2)
        self.assertEqual(u_stats['min_et'], 4.2)
        self.assertEqual(u_stats['max_et'], 4.2)
        self.assertEqual(u_stats['et_std'], 0.0)
        self.assertEqual(u_stats['unit'], 'mm/day')

    def test_farm_et_with_missing_coordinates(self):
        """Test error handling when farm coordinates are missing or None for ET."""
        mock_farm = MagicMock()
        mock_farm.id = 992
        mock_farm.latitude = None
        mock_farm.longitude = None
        mock_farm.user = self.user_a

        with patch('farms.views._get_authenticated_farm', return_value=(mock_farm, None)):
            res = self.client_a.get(f'/api/farms/{mock_farm.id}/et/')
            self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
            self.assertEqual(res.data.get('detail'), 'Farm location is unavailable.')

            res_fetch = self.client_a.post(f'/api/farms/{mock_farm.id}/et/fetch/')
            self.assertEqual(res_fetch.status_code, status.HTTP_400_BAD_REQUEST)
            self.assertEqual(res_fetch.data.get('detail'), 'Farm location is unavailable.')

    def test_farm_et_with_invalid_coordinates(self):
        """Test error handling when farm coordinates are out of valid range for ET."""
        farm_invalid = Farm.objects.create(
            user=self.user_a,
            farm_name='Invalid Range Farm ET',
            latitude=150.0,
            longitude=72.9289,
            crop='Wheat',
            soil_type='red',
            irrigation_type='manual'
        )

        res = self.client_a.get(f'/api/farms/{farm_invalid.id}/et/')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(res.data.get('detail'), 'Farm location is unavailable.')

    def test_user_cannot_access_another_users_farm_et(self):
        """Test requirement: authenticated user must only access their own farm's ET data."""
        # User A attempts to access Farm B ET
        res = self.client_a.get(f'/api/farms/{self.farm_b.id}/et/')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(res.data.get('detail'), 'You do not have permission to access thermal data for this farm.')

        # User B attempts to access Farm A ET
        res = self.client_b.get(f'/api/farms/{self.farm_a.id}/et/')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(res.data.get('detail'), 'You do not have permission to access thermal data for this farm.')

    @patch.object(ECOSTRESSETService, 'search_latest_granule')
    def test_no_ecostress_et_observation_available(self, mock_search):
        """Test error handling when CMR finds 0 ET granules for farm location."""
        mock_search.side_effect = ECOSTRESSNotFoundError(
            "No ECOSTRESS ET observation is currently available for this farm."
        )

        res = self.client_a.get(f'/api/farms/{self.farm_a.id}/et/')
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(res.data.get('detail'), 'No ECOSTRESS ET observation is currently available for this farm.')

    @patch.object(ECOSTRESSETService, 'search_latest_granule')
    @patch.object(ECOSTRESSService, 'download_raster_bytes')
    def test_et_observation_with_no_valid_pixels(self, mock_download, mock_search):
        """Test error handling when ET observation is 100% cloud-covered or NaN fill values."""
        mock_search.return_value = {
            'product_name': 'ECO_L3T_JET',
            'granule_id': 'ECOv002_L3T_JET_TEST_CLOUD',
            'observation_datetime': datetime(2026, 9, 22, 8, 10, tzinfo=timezone.utc),
            'et_url': 'https://data.lpdaac.earthdatacloud.nasa.gov/lp-prod-protected/test_ETdaily.tif',
            'unit': 'mm/day',
        }
        # Synthetic GeoTIFF with all NaNs
        all_nan_tiff = create_synthetic_et_geotiff(None, width=60, height=60, origin_lon=72.90, origin_lat=22.60)
        mock_download.return_value = all_nan_tiff

        res = self.client_a.post(f'/api/farms/{self.farm_a.id}/et/fetch/')
        self.assertEqual(res.status_code, status.HTTP_422_UNPROCESSABLE_ENTITY)
        self.assertEqual(
            res.data.get('detail'),
            'The latest observation does not contain enough valid ET data for this farm.'
        )

    @patch.object(ECOSTRESSETService, 'search_latest_granule')
    @patch.object(ECOSTRESSService, 'download_raster_bytes')
    def test_successful_et_observation_lifecycle(self, mock_download, mock_search):
        """
        Verify complete ET pipeline:
        Farm coordinates -> ECOSTRESS ET search -> Download -> Process Pixels -> Store in DB -> GET returns stored
        """
        granule_id = 'ECOv002_L3T_JET_46577_001_43QBF_20260922T081019_0713_01'
        obs_time = datetime(2026, 9, 22, 8, 10, 19, tzinfo=timezone.utc)
        mock_search.return_value = {
            'product_name': 'ECO_L3T_JET',
            'granule_id': granule_id,
            'observation_datetime': obs_time,
            'et_url': f'https://data.lpdaac.earthdatacloud.nasa.gov/lp-prod-protected/{granule_id}_ETdaily.tif',
            'unit': 'mm/day',
        }

        # 4.2 mm/day synthetic raster covering farm_a
        mock_download.return_value = create_synthetic_et_geotiff(4.2, width=60, height=60, origin_lon=72.90, origin_lat=22.60)

        # 1. Fetch ET observation via POST endpoint
        fetch_res = self.client_a.post(f'/api/farms/{self.farm_a.id}/et/fetch/')
        self.assertEqual(fetch_res.status_code, status.HTTP_200_OK)
        data = fetch_res.data

        self.assertEqual(data['farm_id'], self.farm_a.id)
        self.assertEqual(data['ecostress_product_id'], granule_id)
        self.assertEqual(data['product_id'], granule_id)
        self.assertEqual(data['mean_et'], 4.2)
        self.assertEqual(data['unit'], 'mm/day')
        self.assertEqual(data['data_source'], 'NASA ECOSTRESS')
        self.assertGreater(data['valid_pixel_count'], 0)

        # Verify stored in database
        db_obs = ETObservation.objects.filter(farm=self.farm_a).first()
        self.assertIsNotNone(db_obs)
        self.assertEqual(db_obs.ecostress_product_id, granule_id)
        self.assertEqual(db_obs.mean_et, 4.2)
        self.assertEqual(db_obs.unit, 'mm/day')

        # 2. Avoid repeated downloads: subsequent GET returns stored observation
        mock_search.reset_mock()
        mock_download.reset_mock()

        get_res = self.client_a.get(f'/api/farms/{self.farm_a.id}/et/')
        self.assertEqual(get_res.status_code, status.HTTP_200_OK)
        self.assertEqual(get_res.data['ecostress_product_id'], granule_id)
        self.assertEqual(get_res.data['mean_et'], 4.2)

        mock_search.assert_not_called()
        mock_download.assert_not_called()

    @patch.object(ECOSTRESSETService, 'search_latest_granule')
    @patch.object(ECOSTRESSService, 'download_raster_bytes')
    def test_two_farms_different_locations_et(self, mock_download, mock_search):
        """
        Confirm that each farm retrieves ET using its own coordinates and remains isolated.
        """
        # Farm A (Gujarat): 4.5 mm/day
        mock_search.return_value = {
            'product_name': 'ECO_L3T_JET',
            'granule_id': 'ECOv002_GUJARAT_ET_GRANULE',
            'observation_datetime': datetime(2026, 9, 22, 8, 0, tzinfo=timezone.utc),
            'et_url': 'https://data.lpdaac.earthdatacloud.nasa.gov/gujarat_ET.tif',
            'unit': 'mm/day',
        }
        mock_download.return_value = create_synthetic_et_geotiff(4.5, width=60, height=60, origin_lon=72.90, origin_lat=22.60)
        res_a = self.client_a.post(f'/api/farms/{self.farm_a.id}/et/fetch/')
        self.assertEqual(res_a.status_code, status.HTTP_200_OK)

        # Farm B (Punjab): 2.8 mm/day
        mock_search.return_value = {
            'product_name': 'ECO_L3T_JET',
            'granule_id': 'ECOv002_PUNJAB_ET_GRANULE',
            'observation_datetime': datetime(2026, 9, 21, 7, 0, tzinfo=timezone.utc),
            'et_url': 'https://data.lpdaac.earthdatacloud.nasa.gov/punjab_ET.tif',
            'unit': 'mm/day',
        }
        mock_download.return_value = create_synthetic_et_geotiff(2.8, width=60, height=60, origin_lon=75.84, origin_lat=30.92)
        res_b = self.client_b.post(f'/api/farms/{self.farm_b.id}/et/fetch/')
        self.assertEqual(res_b.status_code, status.HTTP_200_OK)

        # Retrieve and verify Farm A
        obs_a = ETObservation.objects.filter(farm=self.farm_a).first()
        self.assertIsNotNone(obs_a)
        self.assertEqual(obs_a.ecostress_product_id, 'ECOv002_GUJARAT_ET_GRANULE')
        self.assertEqual(obs_a.mean_et, 4.5)

        # Retrieve and verify Farm B
        obs_b = ETObservation.objects.filter(farm=self.farm_b).first()
        self.assertIsNotNone(obs_b)
        self.assertEqual(obs_b.ecostress_product_id, 'ECOv002_PUNJAB_ET_GRANULE')
        self.assertEqual(obs_b.mean_et, 2.8)

        # Verify they are strictly linked to their respective farms
        self.assertNotEqual(obs_a.farm_id, obs_b.farm_id)
        self.assertNotEqual(obs_a.mean_et, obs_b.mean_et)

    def test_existing_lst_data_remains_unchanged(self):
        """
        Verify requirement: existing LST implementation and data remains 100% intact
        when ET is added.
        """
        # Create an existing LST observation for Farm A
        lst_obs = ThermalObservation.objects.create(
            farm=self.farm_a,
            product_name='ECO_L2T_LSTE',
            ecostress_product_id='EXISTING_LST_GRANULE_123',
            observation_datetime=datetime(2026, 9, 26, 6, 37, tzinfo=timezone.utc),
            mean_lst_c=32.8,
            median_lst_c=32.5,
            min_lst_c=30.4,
            max_lst_c=35.7,
            lst_std_c=1.8,
            valid_pixel_count=24,
            data_source='NASA ECOSTRESS'
        )

        # Create an ET observation for Farm A
        et_obs = ETObservation.objects.create(
            farm=self.farm_a,
            product_name='ECO_L3T_JET',
            ecostress_product_id='EXISTING_ET_GRANULE_456',
            observation_datetime=datetime(2026, 9, 22, 8, 10, tzinfo=timezone.utc),
            mean_et=4.2,
            median_et=4.1,
            min_et=3.5,
            max_et=4.9,
            et_std=0.35,
            valid_pixel_count=24,
            unit='mm/day',
            data_source='NASA ECOSTRESS'
        )

        # Verify LST observation is unchanged
        refreshed_lst = ThermalObservation.objects.get(id=lst_obs.id)
        self.assertEqual(refreshed_lst.mean_lst_c, 32.8)
        self.assertEqual(refreshed_lst.ecostress_product_id, 'EXISTING_LST_GRANULE_123')

        # Verify ET observation coexists
        refreshed_et = ETObservation.objects.get(id=et_obs.id)
        self.assertEqual(refreshed_et.mean_et, 4.2)
        self.assertEqual(refreshed_et.unit, 'mm/day')

        # Verify both endpoints respond with their respective data
        res_lst = self.client_a.get(f'/api/farms/{self.farm_a.id}/thermal/')
        self.assertEqual(res_lst.status_code, status.HTTP_200_OK)
        self.assertEqual(res_lst.data['mean_lst_c'], 32.8)

        res_et = self.client_a.get(f'/api/farms/{self.farm_a.id}/et/')
        self.assertEqual(res_et.status_code, status.HTTP_200_OK)
        self.assertEqual(res_et.data['mean_et'], 4.2)

    # =========================================================================
    # ECOSTRESS ESI (Evaporative Stress Index) Tests
    # =========================================================================

    def test_esi_observation_model_str(self):
        obs = ESIObservation(
            farm=self.farm_a,
            product_name='ECO_L4T_ESI',
            ecostress_product_id='ECOv002_L4T_ESI_46577_001_43QBF_20260922T081019_0713_01',
            observation_datetime=datetime(2026, 9, 22, 8, 10, 19, tzinfo=timezone.utc),
            mean_esi=0.742,
            median_esi=0.735,
            min_esi=0.620,
            max_esi=0.850,
            esi_std=0.052,
            valid_pixel_count=24,
            unit='ratio',
            data_source='NASA ECOSTRESS'
        )
        self.assertIn('ESI 0.742', str(obs))
        self.assertEqual(obs.product_id, 'ECOv002_L4T_ESI_46577_001_43QBF_20260922T081019_0713_01')

    @patch('requests.get')
    def test_search_ecostress_esi_granule_found(self, mock_get):
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {
            'feed': {
                'entry': [{
                    'producer_granule_id': 'ECOv002_L4T_ESI_46577_001_43QBF_20260922T081019_0713_01',
                    'time_start': '2026-09-22T08:10:19.370Z',
                    'links': [
                        {'href': 'https://data.lpdaac.earthdatacloud.nasa.gov/ECOv002_L4T_ESI_ESI.tif'},
                        {'href': 'https://data.lpdaac.earthdatacloud.nasa.gov/ECOv002_L4T_ESI_PET.tif'},
                    ]
                }]
            }
        }
        mock_get.return_value = mock_resp

        granule = ECOSTRESSESIService.search_latest_granule(72.90, 22.50, 72.95, 22.60)
        self.assertEqual(granule['granule_id'], 'ECOv002_L4T_ESI_46577_001_43QBF_20260922T081019_0713_01')
        self.assertEqual(granule['product_name'], 'ECO_L4T_ESI')
        self.assertEqual(granule['unit'], 'ratio')
        self.assertTrue(granule['esi_url'].endswith('_ESI.tif'))

    @patch('requests.get')
    def test_search_esi_granule_not_found(self, mock_get):
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {'feed': {'entry': []}}
        mock_get.return_value = mock_resp

        with self.assertRaises(ECOSTRESSNotFoundError):
            ECOSTRESSESIService.search_latest_granule(72.90, 22.50, 72.95, 22.60)

    def test_esi_api_unauthenticated(self):
        client = APIClient()
        res = client.get(f'/api/farms/{self.farm_a.id}/esi/')
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_esi_unauthorized_farm_access(self):
        res = self.client_b.get(f'/api/farms/{self.farm_a.id}/esi/')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

        res_fetch = self.client_b.post(f'/api/farms/{self.farm_a.id}/esi/fetch/')
        self.assertEqual(res_fetch.status_code, status.HTTP_403_FORBIDDEN)

    @patch.object(ECOSTRESSESIService, 'search_latest_granule')
    def test_esi_api_no_observation(self, mock_search):
        mock_search.side_effect = ECOSTRESSNotFoundError("No ECOSTRESS ESI observation is currently available for this farm.")
        res = self.client_a.get(f'/api/farms/{self.farm_a.id}/esi/')
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(res.data.get('detail'), "No ECOSTRESS ESI observation is currently available for this farm.")

    def test_esi_api_missing_coordinates(self):
        mock_farm = MagicMock()
        mock_farm.id = 993
        mock_farm.latitude = None
        mock_farm.longitude = None
        mock_farm.user = self.user_a

        with patch('farms.views._get_authenticated_farm', return_value=(mock_farm, None)):
            res = self.client_a.get(f'/api/farms/{mock_farm.id}/esi/')
            self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
            self.assertEqual(res.data.get('detail'), 'Farm location is unavailable.')

    def test_esi_api_invalid_coordinates(self):
        farm_invalid = Farm.objects.create(
            user=self.user_a,
            farm_name="Invalid Lat Farm",
            latitude=195.0,  # Invalid
            longitude=72.90
        )
        res = self.client_a.get(f'/api/farms/{farm_invalid.id}/esi/')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(res.data.get('detail'), "Farm location is unavailable.")

    @patch.object(ECOSTRESSESIService, 'search_latest_granule')
    @patch.object(ECOSTRESSService, 'download_raster_bytes')
    def test_esi_api_no_valid_pixels(self, mock_download, mock_search):
        mock_search.return_value = {
            'product_name': 'ECO_L4T_ESI',
            'granule_id': 'ECOv002_L4T_ESI_46577_001_43QBF_20260922T081019_0713_01',
            'observation_datetime': datetime(2026, 9, 22, 8, 10, tzinfo=timezone.utc),
            'esi_url': 'https://data.lpdaac.earthdatacloud.nasa.gov/ECOv002_L4T_ESI_ESI.tif',
            'unit': 'ratio'
        }
        # NaN / fill raster
        mock_download.return_value = create_synthetic_esi_geotiff(np.nan)

        res = self.client_a.post(f'/api/farms/{self.farm_a.id}/esi/fetch/')
        self.assertEqual(res.status_code, status.HTTP_422_UNPROCESSABLE_ENTITY)
        self.assertIn("not contain enough valid ESI data", res.data.get('detail', ''))

    @patch.object(ECOSTRESSESIService, 'search_latest_granule')
    @patch.object(ECOSTRESSService, 'download_raster_bytes')
    def test_esi_api_request_failure(self, mock_download, mock_search):
        mock_search.return_value = {
            'product_name': 'ECO_L4T_ESI',
            'granule_id': 'ECOv002_L4T_ESI_46577_001_43QBF_20260922T081019_0713_01',
            'observation_datetime': datetime(2026, 9, 22, 8, 10, tzinfo=timezone.utc),
            'esi_url': 'https://data.lpdaac.earthdatacloud.nasa.gov/ECOv002_L4T_ESI_ESI.tif',
            'unit': 'ratio'
        }
        mock_download.side_effect = ECOSTRESSDataUnavailableError("Unable to retrieve ECOSTRESS data right now. Please try again later.")
        with self.assertRaises(ECOSTRESSDataUnavailableError):
            ECOSTRESSESIService.fetch_latest_observation(self.farm_a)

    @patch.object(ECOSTRESSESIService, 'search_latest_granule')
    @patch.object(ECOSTRESSService, 'download_raster_bytes')
    def test_esi_api_success(self, mock_download, mock_search):
        granule_id = 'ECOv002_L4T_ESI_46577_001_43QBF_20260922T081019_0713_01'
        obs_time = datetime(2026, 9, 22, 8, 10, 19, tzinfo=timezone.utc)
        mock_search.return_value = {
            'product_name': 'ECO_L4T_ESI',
            'granule_id': granule_id,
            'observation_datetime': obs_time,
            'esi_url': f'https://data.lpdaac.earthdatacloud.nasa.gov/{granule_id}_ESI.tif',
            'unit': 'ratio'
        }
        mock_download.return_value = create_synthetic_esi_geotiff(0.72)

        fetch_res = self.client_a.post(f'/api/farms/{self.farm_a.id}/esi/fetch/')
        self.assertEqual(fetch_res.status_code, status.HTTP_200_OK)
        data = fetch_res.data

        self.assertEqual(data['farm_id'], self.farm_a.id)
        self.assertEqual(data['ecostress_product_id'], granule_id)
        self.assertEqual(data['mean_esi'], 0.72)
        self.assertEqual(data['unit'], 'ratio')
        self.assertEqual(data['data_source'], 'NASA ECOSTRESS')
        self.assertGreater(data['valid_pixel_count'], 0)

        # Subsequent GET returns stored ESI without re-downloading
        mock_search.reset_mock()
        mock_download.reset_mock()

        get_res = self.client_a.get(f'/api/farms/{self.farm_a.id}/esi/')
        self.assertEqual(get_res.status_code, status.HTTP_200_OK)
        self.assertEqual(get_res.data['mean_esi'], 0.72)
        self.assertEqual(get_res.data['unit'], 'ratio')
        mock_search.assert_not_called()
        mock_download.assert_not_called()

    def test_esi_two_farms_distinct_observations(self):
        obs_a = ESIObservation.objects.create(
            farm=self.farm_a,
            product_name='ECO_L4T_ESI',
            ecostress_product_id='ECOv002_GUJARAT_ESI_GRANULE',
            observation_datetime=datetime(2026, 9, 22, 8, 10, tzinfo=timezone.utc),
            mean_esi=0.68,
            median_esi=0.67,
            min_esi=0.61,
            max_esi=0.75,
            esi_std=0.04,
            valid_pixel_count=18,
            unit='ratio',
            data_source='NASA ECOSTRESS'
        )

        obs_b = ESIObservation.objects.create(
            farm=self.farm_b,
            product_name='ECO_L4T_ESI',
            ecostress_product_id='ECOv002_PUNJAB_ESI_GRANULE',
            observation_datetime=datetime(2026, 9, 23, 7, 45, tzinfo=timezone.utc),
            mean_esi=0.82,
            median_esi=0.81,
            min_esi=0.76,
            max_esi=0.88,
            esi_std=0.03,
            valid_pixel_count=32,
            unit='ratio',
            data_source='NASA ECOSTRESS'
        )

        res_a = self.client_a.get(f'/api/farms/{self.farm_a.id}/esi/')
        self.assertEqual(res_a.status_code, status.HTTP_200_OK)
        self.assertEqual(res_a.data['mean_esi'], 0.68)
        self.assertEqual(res_a.data['ecostress_product_id'], 'ECOv002_GUJARAT_ESI_GRANULE')

        res_b = self.client_b.get(f'/api/farms/{self.farm_b.id}/esi/')
        self.assertEqual(res_b.status_code, status.HTTP_200_OK)
        self.assertEqual(res_b.data['mean_esi'], 0.82)
        self.assertEqual(res_b.data['ecostress_product_id'], 'ECOv002_PUNJAB_ESI_GRANULE')

    def test_lst_and_et_remain_unchanged_when_esi_added(self):
        """
        Verify that adding ESI does not modify or disrupt existing LST or ET records.
        """
        lst_obs = ThermalObservation.objects.create(
            farm=self.farm_a,
            product_name='ECO_L2T_LSTE',
            ecostress_product_id='EXISTING_LST_GRANULE_123',
            observation_datetime=datetime(2026, 9, 26, 6, 37, tzinfo=timezone.utc),
            mean_lst_c=32.8,
            median_lst_c=32.5,
            min_lst_c=30.1,
            max_lst_c=35.7,
            lst_std_c=1.8,
            valid_pixel_count=24,
            data_source='NASA ECOSTRESS'
        )

        et_obs = ETObservation.objects.create(
            farm=self.farm_a,
            product_name='ECO_L3T_JET',
            ecostress_product_id='EXISTING_ET_GRANULE_456',
            observation_datetime=datetime(2026, 9, 22, 8, 10, tzinfo=timezone.utc),
            mean_et=4.2,
            median_et=4.1,
            min_et=3.5,
            max_et=4.9,
            et_std=0.35,
            valid_pixel_count=24,
            unit='mm/day',
            data_source='NASA ECOSTRESS'
        )

        esi_obs = ESIObservation.objects.create(
            farm=self.farm_a,
            product_name='ECO_L4T_ESI',
            ecostress_product_id='EXISTING_ESI_GRANULE_789',
            observation_datetime=datetime(2026, 9, 22, 8, 10, tzinfo=timezone.utc),
            mean_esi=0.74,
            median_esi=0.73,
            min_esi=0.65,
            max_esi=0.82,
            esi_std=0.045,
            valid_pixel_count=24,
            unit='ratio',
            data_source='NASA ECOSTRESS'
        )

        # Verify all 3 co-exist independently for Farm A
        self.assertEqual(ThermalObservation.objects.filter(farm=self.farm_a).count(), 1)
        self.assertEqual(ETObservation.objects.filter(farm=self.farm_a).count(), 1)
        self.assertEqual(ESIObservation.objects.filter(farm=self.farm_a).count(), 1)

        # Verify all 3 endpoints respond correctly
        res_lst = self.client_a.get(f'/api/farms/{self.farm_a.id}/thermal/')
        self.assertEqual(res_lst.status_code, status.HTTP_200_OK)
        self.assertEqual(res_lst.data['mean_lst_c'], 32.8)

        res_et = self.client_a.get(f'/api/farms/{self.farm_a.id}/et/')
        self.assertEqual(res_et.status_code, status.HTTP_200_OK)
        self.assertEqual(res_et.data['mean_et'], 4.2)

        res_esi = self.client_a.get(f'/api/farms/{self.farm_a.id}/esi/')
        self.assertEqual(res_esi.status_code, status.HTTP_200_OK)
        self.assertEqual(res_esi.data['mean_esi'], 0.74)
        self.assertEqual(res_esi.data['unit'], 'ratio')

