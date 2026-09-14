from rest_framework import serializers
from .models import CropPredictionRecord


class CropPredictInputSerializer(serializers.Serializer):
    N = serializers.FloatField(
        required=True,
        min_value=0.0,
        max_value=250.0,
        help_text="Nitrogen ratio in soil (kg/ha)"
    )
    P = serializers.FloatField(
        required=True,
        min_value=0.0,
        max_value=250.0,
        help_text="Phosphorus ratio in soil (kg/ha)"
    )
    K = serializers.FloatField(
        required=True,
        min_value=0.0,
        max_value=300.0,
        help_text="Potassium ratio in soil (kg/ha)"
    )
    temperature = serializers.FloatField(
        required=True,
        min_value=-5.0,
        max_value=60.0,
        help_text="Temperature in degree Celsius"
    )
    humidity = serializers.FloatField(
        required=True,
        min_value=0.0,
        max_value=100.0,
        help_text="Relative humidity in percentage"
    )
    ph = serializers.FloatField(
        required=True,
        min_value=2.0,
        max_value=14.0,
        help_text="Soil pH value"
    )
    rainfall = serializers.FloatField(
        required=True,
        min_value=0.0,
        max_value=600.0,
        help_text="Rainfall in mm"
    )
    farm_id = serializers.IntegerField(
        required=False,
        allow_null=True,
        help_text="Optional associated farm ID"
    )


class CropPredictionRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = CropPredictionRecord
        fields = '__all__'
