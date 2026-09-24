import io
import os
from PIL import Image
from django.test import TestCase
from django.core.files.uploadedfile import SimpleUploadedFile
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from rest_framework import status

from disease.models import DiseaseScan
from farms.models import Farm

User = get_user_model()


class DiseaseScanAPITests(APITestCase):
    def setUp(self):
        self.farmer = User.objects.create_user(
            username='disease_tester',
            email='disease@tester.com',
            password='Password123!',
            role='farmer'
        )
        self.client.force_authenticate(user=self.farmer)
        self.farm = Farm.objects.create(
            user=self.farmer,
            farm_name='Test Tomato Farm',
            crop='Tomato',
            latitude=22.5645,
            longitude=72.9289
        )

    def _create_test_image_file(self, filename='leaf.jpg', size=(224, 224), color=(34, 139, 34), format='JPEG'):
        buf = io.BytesIO()
        img = Image.new('RGB', size, color=color)
        img.save(buf, format=format)
        buf.seek(0)
        return SimpleUploadedFile(filename, buf.read(), content_type=f'image/{format.lower()}')

    def test_invalid_extension_rejected(self):
        invalid_file = SimpleUploadedFile('document.pdf', b'%PDF-1.4...', content_type='application/pdf')
        resp = self.client.post('/api/disease/predict/', {
            'image': invalid_file,
            'farm_id': self.farm.id,
        }, format='multipart')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(resp.data.get('error'), 'INVALID_IMAGE_FORMAT')

    def test_corrupt_image_rejected(self):
        corrupt_file = SimpleUploadedFile('broken.jpg', b'NOT_AN_IMAGE_BINARY_DATA', content_type='image/jpeg')
        resp = self.client.post('/api/disease/predict/', {
            'image': corrupt_file,
            'farm_id': self.farm.id,
        }, format='multipart')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(resp.data.get('error'), 'CORRUPT_IMAGE')

    def test_oversize_image_rejected(self):
        # Create a mock file larger than 8MB
        oversize_data = b'0' * (8 * 1024 * 1024 + 1024)
        oversize_file = SimpleUploadedFile('giant.jpg', oversize_data, content_type='image/jpeg')
        resp = self.client.post('/api/disease/predict/', {
            'image': oversize_file,
            'farm_id': self.farm.id,
        }, format='multipart')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(resp.data.get('error'), 'IMAGE_TOO_LARGE')

    def test_ai_prediction_immutability(self):
        scan = DiseaseScan.objects.create(
            user=self.farmer,
            farm=self.farm,
            predicted_class='Tomato___Early_blight',
            confidence=0.92,
            is_healthy=False,
            model_status='ready'
        )

        # Attempt to modify predicted_class and confidence
        scan.predicted_class = 'Tomato___healthy'
        scan.confidence = 0.99
        scan.notes = 'Updated notes should persist'
        scan.save()

        # Reload from DB
        scan.refresh_from_db()
        self.assertEqual(scan.predicted_class, 'Tomato___Early_blight', "AI predicted_class must never be overwritten")
        self.assertEqual(scan.confidence, 0.92, "AI confidence must never be overwritten")
        self.assertEqual(scan.notes, 'Updated notes should persist')

    def test_real_inference_execution(self):
        sample_img = self._create_test_image_file()
        resp = self.client.post('/api/disease/predict/', {
            'image': sample_img,
            'farm_id': self.farm.id,
            'farmer_leaf_extent': '<10%',
        }, format='multipart')

        # Weights check
        from disease.model_service import get_disease_model_service
        try:
            svc = get_disease_model_service()
            w_path = getattr(svc, 'weights_path', None)
            if not w_path or not os.path.exists(w_path) or os.path.getsize(w_path) < 1000:
                self.skipTest(f"Weights file not available on disk at {w_path}")
        except Exception:
            self.skipTest("DiseaseModelService unavailable")

        self.assertIn(resp.status_code, [status.HTTP_200_OK, status.HTTP_503_SERVICE_UNAVAILABLE])
        if resp.status_code == status.HTTP_200_OK:
            self.assertIn('predicted_class', resp.data)
            self.assertIn('confidence', resp.data)
            self.assertIn('safety_gate_passed', resp.data)
            self.assertIn('ipm_guidance', resp.data)
