from rest_framework import serializers
from .models import SensorReading
from farms.models import Farm


class SensorReadingSerializer(serializers.ModelSerializer):
    farm_name = serializers.ReadOnlyField(source='farm.farm_name')

    class Meta:
        model = SensorReading
        fields = (
            'id', 'farm', 'farm_name', 'soil_moisture', 'temperature',
            'humidity', 'ph', 'source', 'recorded_at'
        )
        read_only_fields = ('id', 'recorded_at')

    def validate_soil_moisture(self, value):
        if value is not None and not (0 <= value <= 100):
            raise serializers.ValidationError("Soil moisture must be between 0% and 100%.")
        return value

    def validate_humidity(self, value):
        if value is not None and not (0 <= value <= 100):
            raise serializers.ValidationError("Relative humidity must be between 0% and 100%.")
        return value

    def validate_ph(self, value):
        if value is not None and not (0 <= value <= 14):
            raise serializers.ValidationError("Soil pH must be between 0 and 14.")
        return value
