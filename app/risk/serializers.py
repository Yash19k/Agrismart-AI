from rest_framework import serializers
from .models import RiskAssessment


class RiskCalculationInputSerializer(serializers.Serializer):
    farm_id = serializers.IntegerField(required=False, allow_null=True)
    crop_stage = serializers.CharField(required=False, default='vegetative')
    humidity = serializers.FloatField(required=False, default=60.0)
    temperature = serializers.FloatField(required=False, default=25.0)
    rainfall_prob = serializers.FloatField(required=False, default=20.0)
    disease_confidence = serializers.FloatField(required=False, default=0.0)
    disease_severity = serializers.CharField(required=False, default='low')
    is_healthy = serializers.BooleanField(required=False, default=True)
    pest_count = serializers.IntegerField(required=False, default=0)
    local_incidence_count = serializers.IntegerField(required=False, default=0)
    disease_name = serializers.CharField(required=False, default='')


class RiskAssessmentSerializer(serializers.ModelSerializer):
    farm_name = serializers.CharField(source='farm.farm_name', read_only=True)

    class Meta:
        model = RiskAssessment
        fields = (
            'id', 'farm', 'farm_name', 'scan', 'crop_name', 'crop_stage',
            'risk_score', 'risk_level', 'breakdown', 'ipm_actions',
            'forecast', 'created_at'
        )
        read_only_fields = ('id', 'created_at')
