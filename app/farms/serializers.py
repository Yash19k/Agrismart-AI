from rest_framework import serializers
from .models import (
    Farm, Crop, ThermalObservation, ETObservation, ESIObservation,
    WeatherObservation, EnvironmentalRiskAssessment
)
from .utils import normalize_and_validate_polygon, calculate_geodesic_area_acres


class ThermalObservationSerializer(serializers.ModelSerializer):
    farm_id = serializers.IntegerField(source='farm.id', read_only=True)
    farm_name = serializers.CharField(source='farm.farm_name', read_only=True)

    class Meta:
        model = ThermalObservation
        fields = (
            'id',
            'farm_id',
            'farm_name',
            'product_name',
            'ecostress_product_id',
            'observation_datetime',
            'mean_lst_c',
            'median_lst_c',
            'min_lst_c',
            'max_lst_c',
            'lst_std_c',
            'valid_pixel_count',
            'data_source',
            'created_at',
        )
        read_only_fields = ('id', 'created_at')


class ETObservationSerializer(serializers.ModelSerializer):
    farm_id = serializers.IntegerField(source='farm.id', read_only=True)
    farm_name = serializers.CharField(source='farm.farm_name', read_only=True)
    product_id = serializers.CharField(source='ecostress_product_id', read_only=True)

    class Meta:
        model = ETObservation
        fields = (
            'id',
            'farm_id',
            'farm_name',
            'product_name',
            'ecostress_product_id',
            'product_id',
            'observation_datetime',
            'mean_et',
            'median_et',
            'min_et',
            'max_et',
            'et_std',
            'valid_pixel_count',
            'unit',
            'data_source',
            'created_at',
        )
        read_only_fields = ('id', 'created_at')


class ESIObservationSerializer(serializers.ModelSerializer):
    farm_id = serializers.IntegerField(source='farm.id', read_only=True)
    farm_name = serializers.CharField(source='farm.farm_name', read_only=True)
    product_id = serializers.CharField(source='ecostress_product_id', read_only=True)

    class Meta:
        model = ESIObservation
        fields = (
            'id',
            'farm_id',
            'farm_name',
            'product_name',
            'ecostress_product_id',
            'product_id',
            'observation_datetime',
            'mean_esi',
            'median_esi',
            'min_esi',
            'max_esi',
            'esi_std',
            'valid_pixel_count',
            'unit',
            'data_source',
            'created_at',
        )
        read_only_fields = ('id', 'created_at')


class WeatherObservationSerializer(serializers.ModelSerializer):
    farm_id = serializers.IntegerField(source='farm.id', read_only=True)
    farm_name = serializers.CharField(source='farm.farm_name', read_only=True)

    class Meta:
        model = WeatherObservation
        fields = (
            'id',
            'farm_id',
            'farm_name',
            'observation_datetime',
            'temperature',
            'relative_humidity',
            'apparent_temperature',
            'precipitation',
            'wind_speed',
            'wind_direction',
            'soil_moisture',
            'vapour_pressure_deficit',
            'et0_fao',
            'weather_code',
            'data_source',
            'created_at',
        )
        read_only_fields = ('id', 'created_at')


class EnvironmentalRiskAssessmentSerializer(serializers.ModelSerializer):
    farm_id = serializers.IntegerField(source='farm.id', read_only=True)
    farm_name = serializers.CharField(source='farm.farm_name', read_only=True)

    class Meta:
        model = EnvironmentalRiskAssessment
        fields = (
            'id',
            'farm_id',
            'farm_name',
            'assessment_datetime',
            'stress_level',
            'summary',
            'reasons',
            'lst_status',
            'et_status',
            'esi_status',
            'weather_status',
            'data_sufficiency',
            'created_at',
        )
        read_only_fields = ('id', 'created_at')


class CropSerializer(serializers.ModelSerializer):
    class Meta:
        model = Crop
        fields = ('id', 'name', 'emoji', 'planted_at', 'status', 'created_at')
        read_only_fields = ('id', 'created_at')


class FarmSerializer(serializers.ModelSerializer):
    crops = CropSerializer(many=True, read_only=True)
    location_display = serializers.ReadOnlyField()
    farm_size = serializers.ReadOnlyField()

    class Meta:
        model = Farm
        fields = (
            'id', 'farm_name', 'latitude', 'longitude', 'location_name',
            'location_display', 'farm_boundary', 'farm_area_acres', 'farm_size',
            'crop', 'crop_variety', 'crop_stage', 'soil_type',
            'soil_ph', 'soil_moisture_pct', 'irrigation_type',
            'crops', 'created_at', 'updated_at',
        )
        read_only_fields = ('id', 'created_at', 'updated_at')

    def validate_latitude(self, value):
        if value is None or not (-90 <= value <= 90):
            raise serializers.ValidationError("Latitude must be between -90 and 90.")
        return value

    def validate_longitude(self, value):
        if value is None or not (-180 <= value <= 180):
            raise serializers.ValidationError("Longitude must be between -180 and 180.")
        return value

    def validate(self, attrs):
        # Validate and recalculate boundary & area
        boundary = attrs.get('farm_boundary')
        if boundary is not None:
            normalized = normalize_and_validate_polygon(boundary)
            if not normalized:
                raise serializers.ValidationError({
                    'farm_boundary': 'Invalid farm boundary. Please provide a valid closed polygon with at least 3 points.'
                })
            attrs['farm_boundary'] = normalized
            # Recalculate area on the backend using geodesic calculation
            attrs['farm_area_acres'] = calculate_geodesic_area_acres(normalized)

        return attrs

    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)
