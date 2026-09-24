"""
Seed comprehensive SIH demo datasets across Gujarat.
Populates 25 farms, 40 scans, 30 pest traps, 15 expert reviews, 10 follow-ups, and feedback records.
"""
from datetime import date, timedelta
import random
from django.core.management.base import BaseCommand
from django.utils import timezone
from accounts.models import User
from farms.models import Farm, Crop, Activity
from disease.models import DiseaseScan
from pests.models import PestObservation
from expert.models import ExpertReview
from followups.models import FollowUp
from feedback.models import FeedbackRecord
from risk.engine import calculate_risk
from risk.models import RiskAssessment


class Command(BaseCommand):
    help = 'Seeds realistic 25-farm Gujarat regional surveillance dataset for SIH prototype demo'

    def handle(self, *args, **options):
        self.stdout.write('Starting SIH prototype data generation...')

        # 1. Users
        farmer, _ = User.objects.get_or_create(
            username='farmer_demo',
            defaults={'email': 'farmer@agrismart.ai', 'first_name': 'Ramesh', 'last_name': 'Patel', 'phone': '9876543210', 'role': 'farmer', 'is_demo': True}
        )
        farmer.set_password('farmer123')
        farmer.role = 'farmer'
        farmer.is_demo = True
        farmer.save()

        expert, _ = User.objects.get_or_create(
            username='expert_demo',
            defaults={'email': 'expert@agrismart.ai', 'first_name': 'Dr. Sunita', 'last_name': 'Sharma', 'phone': '9811122233', 'role': 'expert', 'is_demo': True}
        )
        expert.set_password('expert123')
        expert.role = 'expert'
        expert.is_demo = True
        expert.save()

        officer, _ = User.objects.get_or_create(
            username='officer_demo',
            defaults={'email': 'officer@agrismart.ai', 'first_name': 'Rajesh', 'last_name': 'Varma', 'phone': '9844455566', 'role': 'officer', 'is_demo': True}
        )
        officer.set_password('officer123')
        officer.role = 'officer'
        officer.is_demo = True
        officer.save()

        # 2. 25 Gujarat Farms across 5 clusters
        farm_specs = [
            # Anand Cluster (Vegetables, Tobacco, Banana)
            ("Patel Organic Farms", 22.5645, 72.9289, "Anand, Anand", "Tomato", "flowering", 4.5, "drip", "black"),
            ("Charotar Agro Fields", 22.5100, 72.9800, "Petlad, Anand", "Tomato", "flowering", 3.0, "drip", "alluvial"),
            ("Borsad Precision Farm", 22.4120, 72.9010, "Borsad, Anand", "Chilli", "fruiting", 5.2, "sprinkler", "loamy"),
            ("Khambhat Coastal Plots", 22.3150, 72.6200, "Khambhat, Anand", "Potato", "vegetative", 2.8, "flood", "alluvial"),
            ("Sardar Krishi Farm", 22.5800, 72.9600, "Anand North, Anand", "Tomato", "flowering", 6.0, "drip", "black"),

            # Ahmedabad Peri-Urban Cluster
            ("Sabarmati Greens", 23.0225, 72.5714, "Sanand, Ahmedabad", "Tomato", "flowering", 8.0, "drip", "loamy"),
            ("Sanand Cotton Estate", 22.9850, 72.3800, "Sanand, Ahmedabad", "Cotton", "vegetative", 12.0, "flood", "black"),
            ("Bavla Vegetable Nursery", 22.8350, 72.3600, "Bavla, Ahmedabad", "Okra", "seedling", 3.5, "drip", "alluvial"),
            ("Dholka Heritage Farms", 22.7200, 72.4400, "Dholka, Ahmedabad", "Tomato", "fruiting", 5.0, "sprinkler", "loamy"),
            ("Viramgam Agro Trust", 23.1200, 72.0300, "Viramgam, Ahmedabad", "Wheat", "vegetative", 10.0, "flood", "black"),

            # Vadodara / Narmada Cluster
            ("Narmada Valley Horticulture", 22.3072, 73.1812, "Padra, Vadodara", "Tomato", "flowering", 6.5, "drip", "black"),
            ("Padra Chilli Plantation", 22.2400, 73.0800, "Padra, Vadodara", "Chilli", "flowering", 4.2, "drip", "black"),
            ("Karjan Riverbed Farm", 22.0500, 73.1700, "Karjan, Vadodara", "Cotton", "flowering", 7.0, "flood", "alluvial"),
            ("Dabhoi Banana Agro", 22.1800, 73.4300, "Dabhoi, Vadodara", "Tomato", "vegetative", 4.0, "drip", "loamy"),
            ("Savli Agri Horizons", 22.5600, 73.2200, "Savli, Vadodara", "Maize", "seedling", 5.5, "manual", "red"),

            # Rajkot / Saurashtra Groundnut & Cotton Cluster
            ("Saurashtra Groundnut Farm", 22.3039, 70.8022, "Gondal, Rajkot", "Groundnut", "flowering", 15.0, "sprinkler", "black"),
            ("Gondal Precision Estate", 21.9600, 70.7900, "Gondal, Rajkot", "Cotton", "vegetative", 18.0, "drip", "black"),
            ("Jasdan Dryland Farm", 22.0300, 71.2000, "Jasdan, Rajkot", "Groundnut", "fruiting", 11.0, "manual", "red"),
            ("Jetpur Agro Fields", 21.7500, 70.6200, "Jetpur, Rajkot", "Cotton", "flowering", 8.5, "drip", "black"),
            ("Morbi Ceramic Belt Agro", 22.8100, 70.8300, "Morbi, Rajkot", "Chilli", "vegetative", 4.0, "sprinkler", "sandy"),

            # Surat / South Gujarat Cluster
            ("Tapi Agri Venture", 21.1702, 72.8311, "Bardoli, Surat", "Tomato", "flowering", 5.0, "drip", "alluvial"),
            ("Bardoli Sugar Belt Farm", 21.1200, 73.1100, "Bardoli, Surat", "Sugarcane", "vegetative", 9.0, "flood", "clayey"),
            ("Navsari Fruit Orchards", 20.9500, 72.9200, "Navsari, Surat", "Tomato", "flowering", 4.8, "drip", "alluvial"),
            ("Kamrej High-Tech Greenhouse", 21.2700, 72.9600, "Kamrej, Surat", "Chilli", "flowering", 3.2, "drip", "loamy"),
            ("Mahuva Riverfront Plot", 21.0200, 73.1500, "Mahuva, Surat", "Okra", "fruiting", 6.0, "drip", "black"),
        ]

        farms = []
        varieties = {
            "Tomato": "Abhinav (F1)",
            "Chilli": "G-4 Bhagya",
            "Potato": "Kufri Jyoti",
            "Cotton": "BT-II Hybrid",
            "Wheat": "GW-496",
            "Groundnut": "GG-20",
            "Okra": "Gujarat Anand Okra-5",
            "Sugarcane": "Co-86032",
            "Maize": "HQPM-1",
        }

        for name, lat, lon, loc, crop, stage, size, irrig, soil in farm_specs:
            f, _ = Farm.objects.get_or_create(
                farm_name=name,
                defaults={
                    'user': farmer,
                    'latitude': lat,
                    'longitude': lon,
                    'location_name': loc,
                    'crop': crop,
                    'crop_variety': varieties.get(crop, "Improved Local Selection"),
                    'crop_stage': stage,
                    'farm_size': size,
                    'irrigation_type': irrig,
                    'soil_type': soil,
                    'soil_ph': 6.8,
                    'soil_moisture_pct': 34.0,
                }
            )
            # Ensure crop_stage and context updated
            f.crop_stage = stage
            f.crop = crop
            f.crop_variety = varieties.get(crop, "Improved Local Selection")
            f.soil_ph = 6.8
            f.soil_moisture_pct = 34.0
            f.save()
            farms.append(f)

        self.stdout.write(self.style.SUCCESS(f'Created/updated {len(farms)} demo farms with context.'))

        # Seed simulated sensor readings for each farm
        from sensors.models import SensorReading
        now = timezone.now()
        for f in farms:
            SensorReading.objects.get_or_create(
                farm=f,
                recorded_at=now - timedelta(hours=2),
                defaults={
                    'soil_moisture': 34.0,
                    'temperature': 27.5,
                    'humidity': 64.0,
                    'ph': 6.8,
                    'source': 'simulated',
                }
            )

        # 3. 40 Disease Scans
        disease_catalog = [
            ("Tomato", "Early Blight", "Tomato___Early_blight", False, "high", 0.91),
            ("Tomato", "Late Blight", "Tomato___Late_blight", False, "high", 0.94),
            ("Tomato", "Healthy Foliage", "Tomato___healthy", True, "none", 0.98),
            ("Chilli", "Bacterial Spot", "Pepper__bell___Bacterial_spot", False, "medium", 0.88),
            ("Potato", "Early Blight", "Potato___Early_blight", False, "medium", 0.86),
            ("Potato", "Late Blight", "Potato___Late_blight", False, "high", 0.93),
            ("Tomato", "Leaf Mold", "Tomato___Leaf_Mold", False, "low", 0.82),
            ("Tomato", "Healthy Foliage", "Tomato___healthy", True, "none", 0.97),
        ]

        scans = []
        for idx in range(40):
            farm = farms[idx % len(farms)]
            cat = disease_catalog[idx % len(disease_catalog)]
            # If in Anand/Sanand cluster, skew towards early blight & late blight outbreak
            if idx < 12:
                cat = disease_catalog[0] if idx % 2 == 0 else disease_catalog[1]

            scan_date = now - timedelta(days=idx // 2, hours=(idx % 6) * 3)
            scan = DiseaseScan.objects.create(
                farm=farm,
                user=farmer,
                crop_type=cat[0],
                plant_name=cat[0],
                disease_name=cat[1],
                predicted_class=cat[2],
                is_healthy=cat[3],
                severity=cat[4],
                confidence=cat[5],
                model_status='ready',
                needs_expert_review=not cat[3] and (cat[5] < 0.80 or cat[4] == 'high' or idx < 8),
                priority='urgent' if cat[4] == 'high' else 'normal',
                farmer_leaf_extent='>30%' if cat[4] == 'high' else ('10-30%' if cat[4] == 'medium' else '<10%'),
            )
            scan.created_at = scan_date
            scan.save()
            scans.append(scan)

        self.stdout.write(self.style.SUCCESS(f'Created {len(scans)} disease scans.'))

        # 4. 30 Pest Observations
        pest_catalog = [
            ('Whitefly', 'sticky_yellow', 32, 'action_required'),
            ('Whitefly', 'sticky_yellow', 18, 'alert'),
            ('Thrips', 'sticky_blue', 22, 'alert'),
            ('Thrips', 'sticky_blue', 29, 'action_required'),
            ('Aphid', 'sticky_yellow', 42, 'action_required'),
            ('Bollworm', 'pheromone', 8, 'alert'),
            ('Spider Mite', 'manual', 16, 'alert'),
            ('Fruit Fly', 'pheromone', 18, 'action_required'),
            ('Whitefly', 'sticky_yellow', 6, 'normal'),
            ('Thrips', 'sticky_blue', 4, 'normal'),
        ]

        for p_idx in range(30):
            farm = farms[p_idx % len(farms)]
            spec = pest_catalog[p_idx % len(pest_catalog)]
            obs = PestObservation.objects.create(
                farm=farm,
                user=farmer,
                pest_type=spec[0],
                trap_type=spec[1],
                pest_count=spec[2] + (p_idx % 5),
                notes=f"Periodic scouting trap count checked at {farm.farm_name}.",
                observed_at=now - timedelta(days=p_idx // 3, hours=p_idx % 8)
            )

        self.stdout.write(self.style.SUCCESS('Created 30 pest trap observations.'))

        # 5. 15 Expert Reviews
        for r_idx in range(15):
            scan = scans[r_idx]
            if scan.is_healthy:
                status = 'confirmed'
                exp_crop = scan.crop_type
                exp_disease = 'Healthy Foliage'
                exp_sev = 'none'
                is_hlth = True
                notes = 'Verified: No fungal sporulation, chlorosis or bacterial halo observed on specimen.'
            elif r_idx % 3 == 0:
                # Corrected diagnosis
                status = 'corrected'
                exp_crop = scan.crop_type
                exp_disease = 'Late Blight' if 'Early' in scan.disease_name else 'Early Blight'
                exp_sev = 'high'
                is_hlth = False
                notes = 'Differential diagnosis: Concentric rings absent; lesions show rapid water-soaking on leaf margins under wet morning dew.'
            else:
                status = 'confirmed'
                exp_crop = scan.crop_type
                exp_disease = scan.disease_name
                exp_sev = scan.severity
                is_hlth = False
                notes = 'Confirmed clinical presentation matching pathogen morphology.'

            review, _ = ExpertReview.objects.get_or_create(
                scan=scan,
                defaults={
                    'expert': expert,
                    'status': status,
                    'expert_crop': exp_crop,
                    'expert_disease': exp_disease,
                    'expert_severity': exp_sev,
                    'is_healthy': is_hlth,
                    'confidence_rating': 5,
                    'diagnosis_notes': notes,
                    'action_plan': 'Apply registered protective copper or bio-agent immediately. Follow 10-day safety interval.'
                }
            )

            # Auto create feedback record with is_demo=True
            FeedbackRecord.objects.get_or_create(
                scan=scan,
                defaults={
                    'review': review,
                    'reviewer': expert,
                    'is_demo': True,
                    'image_path': scan.image.name if scan.image else f"scans/{scan.id}.jpg",
                    'image_sha256': f"demo_sha256_scan_{scan.id}",
                    'crop': exp_crop,
                    'region': scan.farm.location_name if scan.farm else '',
                    'original_prediction': scan.predicted_class,
                    'original_confidence': scan.confidence,
                    'ground_truth_label': f"{exp_crop}___{exp_disease.replace(' ', '_')}",
                    'validation_source': 'expert_verified',
                    'dataset_split': 'train' if r_idx < 10 else ('val' if r_idx < 13 else 'test'),
                    'notes': notes
                }
            )

        self.stdout.write(self.style.SUCCESS('Created 15 expert reviews and demo feedback records.'))

        # Seed 8 Referrals
        from referral.models import Referral
        from referral.kvk_directory import lookup_nearest_kvk
        for ref_idx in range(8):
            s = scans[ref_idx]
            kvk_entry = lookup_nearest_kvk(s.farm.location_name, s.farm.latitude, s.farm.longitude)
            status_val = 'completed' if ref_idx < 3 else ('requested' if ref_idx < 6 else 'recommended')
            Referral.objects.get_or_create(
                scan=s,
                farm=s.farm,
                defaults={
                    'type': 'kvk',
                    'reason': 'Automated referral triggered by elevated foliar pathogen pressure.',
                    'status': status_val,
                    'requested_by': farmer,
                    'directory_entry': kvk_entry,
                    'notes': 'Resolved with certified KVK agronomist advisory.' if status_val == 'completed' else '',
                }
            )

        self.stdout.write(self.style.SUCCESS('Created 8 referral records.'))

        # 6. 10 Follow-ups
        for fu_idx in range(10):
            orig_scan = scans[fu_idx]
            recheck = scans[20 + fu_idx] if fu_idx < 6 else None
            is_comp = fu_idx < 6

            FollowUp.objects.create(
                original_scan=orig_scan,
                recheck_scan=recheck,
                farm=orig_scan.farm,
                user=farmer,
                scheduled_date=date.today() - timedelta(days=2) if is_comp else date.today() + timedelta(days=4),
                status='completed' if is_comp else 'scheduled',
                outcome='resolved' if is_comp else 'pending',
                intervention_applied='Applied bio-fungicide Trichoderma harzianum and improved canopy pruning.' if is_comp else '',
                recovery_percentage=90.0 if is_comp else None,
                notes='Follow-up recheck indicates significant cessation of leaf lesions.' if is_comp else 'Awaiting scheduled scouting.',
                completed_at=now - timedelta(days=1) if is_comp else None
            )

        self.stdout.write(self.style.SUCCESS('Created 10 follow-up records.'))
        self.stdout.write(self.style.SUCCESS('=== SIH Prototype Demo Dataset Seeding COMPLETE ==='))
        self.stdout.write('Demo Accounts:')
        self.stdout.write('  1. Farmer:   farmer_demo / farmer123')
        self.stdout.write('  2. Expert:   expert_demo / expert123')
        self.stdout.write('  3. Officer:  officer_demo / officer123')
