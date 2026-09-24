from rest_framework import serializers
from .models import Farm, Crop


class CropSerializer(serializers.ModelSerializer):
    class Meta:
        model = Crop
        fields = ('id', 'name', 'emoji', 'planted_at', 'status', 'created_at')
        read_only_fields = ('id', 'created_at')


class FarmSerializer(serializers.ModelSerializer):
    crops = CropSerializer(many=True, read_only=True)
    location_display = serializers.ReadOnlyField()

    class Meta:
        model = Farm
        fields = (
            'id', 'farm_name', 'latitude', 'longitude', 'location_name',
            'location_display', 'crop', 'crop_stage', 'soil_type', 'farm_size',
            'irrigation_type', 'crops', 'created_at', 'updated_at',
        )
        read_only_fields = ('id', 'created_at', 'updated_at')

    def validate_latitude(self, value):
        if not (-90 <= value <= 90):
            raise serializers.ValidationError("Latitude must be between -90 and 90.")
        return value

    def validate_longitude(self, value):
        if not (-180 <= value <= 180):
            raise serializers.ValidationError("Longitude must be between -180 and 180.")
        return value

    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)
