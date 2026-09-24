from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from rest_framework import status

User = get_user_model()


class AuthAndPermissionMatrixTests(APITestCase):
    def setUp(self):
        self.farmer = User.objects.create_user(
            username='test_farmer',
            email='farmer@test.com',
            password='Password123!',
            role='farmer'
        )
        self.expert = User.objects.create_user(
            username='test_expert',
            email='expert@test.com',
            password='Password123!',
            role='expert'
        )
        self.officer = User.objects.create_user(
            username='test_officer',
            email='officer@test.com',
            password='Password123!',
            role='officer'
        )

    def test_jwt_auth_workflow(self):
        # 1. Login with valid credentials
        resp = self.client.post('/api/auth/login/', {
            'email': 'test_farmer',
            'password': 'Password123!'
        })
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn('access', resp.data)
        token = resp.data['access']

        # 2. Authenticate /me with Bearer token
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        me_resp = self.client.get('/api/auth/me/')
        self.assertEqual(me_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(me_resp.data['email'], 'farmer@test.com')
        self.assertEqual(me_resp.data['role'], 'farmer')

        # 3. Invalid credentials
        self.client.credentials()  # clear credentials
        fail_resp = self.client.post('/api/auth/login/', {
            'email': 'test_farmer',
            'password': 'WrongPassword!'
        })
        self.assertEqual(fail_resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_anonymous_access_permissions(self):
        # Public endpoints must succeed
        self.assertEqual(self.client.get('/api/health/').status_code, status.HTTP_200_OK)
        self.assertEqual(self.client.get('/api/weather/health/').status_code, status.HTTP_200_OK)

        # Protected endpoints must reject unauthenticated requests
        protected_urls = [
            ('/api/farms/', 'get'),
            ('/api/sensors/readings/', 'get'),
            ('/api/referrals/', 'get'),
            ('/api/risk/calculate/', 'post'),
            ('/api/weather/context/?lat=22.5&lon=72.9', 'get'),
            ('/api/dashboard/officer/', 'get'),
            ('/api/feedback/stats/', 'get'),
            ('/api/expert/queue/', 'get'),
        ]
        for url, method in protected_urls:
            if method == 'get':
                r = self.client.get(url)
            else:
                r = self.client.post(url, {})
            self.assertEqual(r.status_code, status.HTTP_401_UNAUTHORIZED, f"URL {url} should require auth")

    def test_role_based_access_matrix(self):
        # Farmer trying officer-only endpoints -> 403 Forbidden
        self.client.force_authenticate(user=self.farmer)
        self.assertEqual(self.client.get('/api/dashboard/officer/').status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(self.client.get('/api/feedback/stats/').status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(self.client.get('/api/expert/queue/').status_code, status.HTTP_403_FORBIDDEN)

        # Expert can access review queue, but not officer dashboard or feedback stats
        self.client.force_authenticate(user=self.expert)
        self.assertEqual(self.client.get('/api/expert/queue/').status_code, status.HTTP_200_OK)
        self.assertEqual(self.client.get('/api/dashboard/officer/').status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(self.client.get('/api/feedback/stats/').status_code, status.HTTP_403_FORBIDDEN)

        # Officer can access regional dashboard, feedback stats, and review queue
        self.client.force_authenticate(user=self.officer)
        self.assertEqual(self.client.get('/api/dashboard/officer/').status_code, status.HTTP_200_OK)
        self.assertEqual(self.client.get('/api/feedback/stats/').status_code, status.HTTP_200_OK)
        self.assertEqual(self.client.get('/api/expert/queue/').status_code, status.HTTP_200_OK)
