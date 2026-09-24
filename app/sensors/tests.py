from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from rest_framework import status

from farms.models import Farm
from sensors.models import SensorReading

User = get_user_model()


class SensorReadingAPITests(APITestCase):
    def setUp(self):
        self.farmer = User.objects.create_user(
            username='sensor_tester',
            email='sensor@tester.com',
            password='Password123!',
            role='farmer'
        )
        self.client.force_authenticate(user=self.farmer)
        self.farm = Farm.objects.create(
            user=self.farmer,
            farm_name='Sensor Test Plot',
            crop='Tomato',
            latitude=22.5645,
            longitude=72.9289
        )

    def test_sensor_reading_create_and_list(self):
        # 1. Post a new manual sensor reading
        payload = {
            'farm': self.farm.id,
            'soil_moisture': 36.5,
            'temperature': 28.2,
            'humidity': 68.0,
            'ph': 6.5,
            'source': 'manual'
        }
        create_resp = self.client.post('/api/sensors/readings/', payload, format='json')
        self.assertEqual(create_resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(create_resp.data['soil_moisture'], 36.5)
        self.assertEqual(create_resp.data['source'], 'manual')

        # 2. Query latest sensor reading
        latest_resp = self.client.get(f'/api/sensors/latest/?farm_id={self.farm.id}')
        self.assertEqual(latest_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(latest_resp.data['soil_moisture'], 36.5)
        self.assertEqual(latest_resp.data['temperature'], 28.2)

    def test_sensor_ownership_enforcement(self):
        # Another farmer cannot post readings for someone else's farm
        other_farmer = User.objects.create_user(
            username='other_sensor_tester',
            email='other@tester.com',
            password='Password123!',
            role='farmer'
        )
        self.client.force_authenticate(user=other_farmer)
        payload = {
            'farm': self.farm.id,
            'soil_moisture': 30.0,
            'source': 'manual'
        }
        resp = self.client.post('/api/sensors/readings/', payload, format='json')
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)
