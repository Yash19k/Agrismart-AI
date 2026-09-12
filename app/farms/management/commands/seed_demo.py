from django.core.management.base import BaseCommand
from accounts.models import User
from farms.models import Farm, Crop, Activity, WeatherSnapshot, SustainabilityRecord
from disease.models import DiseaseScan


class Command(BaseCommand):
    help = 'Seeds a default demo farmer and farm with initial records'

    def handle(self, *args, **options):
        # Create or update demo farmer
        user, created = User.objects.get_or_create(
            username='farmer_demo',
            defaults={
                'email': 'farmer@agrismart.ai',
                'first_name': 'Ramesh',
                'last_name': 'Patel',
                'phone': '9876543210',
            }
        )
        if created:
            user.set_password('farmer123')
            user.save()
            self.stdout.write(self.style.SUCCESS(f'Created user: {user.username}'))
        else:
            self.stdout.write(f'User already exists: {user.username}')

        # Create or get demo farm in Anand / Gujarat
        farm, f_created = Farm.objects.get_or_create(
            user=user,
            farm_name='Patel Organic Farms',
            defaults={
                'latitude': 22.5645,
                'longitude': 72.9289,
                'location_name': 'Anand, Gujarat',
                'crop': 'Tomato',
                'soil_type': 'black',
                'farm_size': 4.5,
                'irrigation_type': 'drip',
            }
        )
        if f_created:
            self.stdout.write(self.style.SUCCESS(f'Created farm: {farm.farm_name}'))
        else:
            self.stdout.write(f'Farm already exists: {farm.farm_name}')

        # Seed crops
        for cname, emoji in [('Tomato', '🍅'), ('Chilli', '🌶️'), ('Okra', '🥦')]:
            Crop.objects.get_or_create(
                farm=farm,
                name=cname,
                defaults={'emoji': emoji, 'status': 'active'}
            )

        # Seed initial activity
        Activity.objects.get_or_create(
            farm=farm,
            title=f'{farm.farm_name} registered',
            defaults={
                'icon': '🏡',
                'sub': farm.location_display,
                'activity_type': 'farm',
            }
        )

        self.stdout.write(self.style.SUCCESS('Seeding complete! User: farmer_demo (pass: farmer123)'))
