from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from rest_framework import status

from farms.models import Farm
from disease.models import DiseaseScan
from referral.models import Referral

User = get_user_model()


class ReferralAPITests(APITestCase):
    def setUp(self):
        self.farmer = User.objects.create_user(
            username='ref_farmer',
            email='ref_farmer@test.com',
            password='Password123!',
            role='farmer'
        )
        self.expert = User.objects.create_user(
            username='ref_expert',
            email='ref_expert@test.com',
            password='Password123!',
            role='expert'
        )
        self.farm = Farm.objects.create(
            user=self.farmer,
            farm_name='Referral Test Farm',
            crop='Tomato',
            latitude=22.5645,
            longitude=72.9289
        )
        self.scan = DiseaseScan.objects.create(
            user=self.farmer,
            farm=self.farm,
            predicted_class='Tomato___Late_blight',
            confidence=0.88,
            is_healthy=False,
            model_status='ready'
        )

    def test_referral_creation_and_request_flow(self):
        # 1. System/Farmer creates a recommended referral
        self.client.force_authenticate(user=self.farmer)
        create_resp = self.client.post('/api/referrals/', {
            'farm': self.farm.id,
            'scan': self.scan.id,
            'type': 'kvk',
            'reason': 'High pathogen virulence requires diagnostic verification.',
            'status': 'recommended',
        }, format='json')
        self.assertEqual(create_resp.status_code, status.HTTP_201_CREATED)
        ref_id = create_resp.data['id']
        self.assertEqual(create_resp.data['status'], 'recommended')

        # 2. Farmer requests formal assistance
        patch_resp = self.client.patch(f'/api/referrals/{ref_id}/', {
            'status': 'requested'
        }, format='json')
        self.assertEqual(patch_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(patch_resp.data['status'], 'requested')

        # 3. Expert resolves the referral
        self.client.force_authenticate(user=self.expert)
        resolve_resp = self.client.patch(f'/api/referrals/{ref_id}/', {
            'status': 'completed',
            'notes': 'Visited plot; confirmed late blight symptoms. Delivered bio-agent pack.'
        }, format='json')
        self.assertEqual(resolve_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resolve_resp.data['status'], 'completed')
        self.assertIn('late blight symptoms', resolve_resp.data['notes'])
