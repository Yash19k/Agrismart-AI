"""
Management command to simulate a realistic streaming sensor feed for a farm parcel.
Generates historical hourly readings with diurnal temperature/humidity oscillations
and soil moisture decay.

Usage:
  python manage.py simulate_sensor_feed --farm 1 --hours 24
"""
import math
import random
from datetime import timedelta
from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone

from farms.models import Farm
from sensors.models import SensorReading


class Command(BaseCommand):
    help = "Generates a documented simulated sensor feed for a farm parcel"

    def add_arguments(self, parser):
        parser.add_argument('--farm', type=int, required=False, help="Target Farm ID (defaults to first available farm)")
        parser.add_argument('--hours', type=int, default=24, help="Number of hourly readings to simulate (default: 24)")

    def handle(self, *args, **options):
        farm_id = options.get('farm')
        hours = options.get('hours') or 24

        if farm_id:
            farm = Farm.objects.filter(id=farm_id).first()
            if not farm:
                raise CommandError(f"Farm with ID {farm_id} does not exist.")
        else:
            farm = Farm.objects.first()
            if not farm:
                raise CommandError("No farm records found in the database. Run seed_sih_demo first.")

        self.stdout.write(f"[*] Simulating {hours} hours of sensor readings for farm: {farm.farm_name} (ID: {farm.id})...")

        now = timezone.now()
        base_moisture = farm.soil_moisture_pct or 32.0
        base_ph = farm.soil_ph or 6.8
        readings_created = 0

        for h in range(hours, -1, -1):
            timestamp = now - timedelta(hours=h)
            hour_of_day = timestamp.hour

            # Diurnal temperature cycle: peak at 14:00 (32°C), trough at 05:00 (21°C)
            temp_var = math.sin((hour_of_day - 8) * math.pi / 12) * 5.5
            temperature = round(26.5 + temp_var + random.uniform(-0.5, 0.5), 1)

            # Humidity inversely correlates with temperature: peak at 05:00 (85%), trough at 14:00 (45%)
            hum_var = -math.sin((hour_of_day - 8) * math.pi / 12) * 20.0
            humidity = round(max(30.0, min(95.0, 65.0 + hum_var + random.uniform(-2.0, 2.0))), 1)

            # Gradual soil moisture evaporation over time
            decay = (hours - h) * 0.15
            soil_moisture = round(max(15.0, min(60.0, base_moisture - decay + random.uniform(-0.4, 0.4))), 1)

            # pH has minimal diurnal variance
            ph = round(base_ph + random.uniform(-0.1, 0.1), 2)

            SensorReading.objects.create(
                farm=farm,
                soil_moisture=soil_moisture,
                temperature=temperature,
                humidity=humidity,
                ph=ph,
                source='simulated',
            )
            readings_created += 1

        self.stdout.write(self.style.SUCCESS(
            f"[+] Successfully generated {readings_created} simulated sensor readings for '{farm.farm_name}'.\n"
            f"    Latest Reading: Temp={temperature}°C, Humidity={humidity}%, Soil Moisture={soil_moisture}%, pH={ph}"
        ))
