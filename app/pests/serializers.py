from rest_framework import serializers
from .models import PestObservation, PEST_THRESHOLDS


class PestObservationSerializer(serializers.ModelSerializer):
    farm_name = serializers.CharField(source='farm.farm_name', read_only=True)
    trap_type_display = serializers.CharField(source='get_trap_type_display', read_only=True)
    threshold_level_display = serializers.CharField(source='get_threshold_level_display', read_only=True)
    threshold_limits = serializers.SerializerMethodField()

    class Meta:
        model = PestObservation
        fields = (
            'id', 'farm', 'farm_name', 'user', 'trap_type', 'trap_type_display',
            'pest_type', 'pest_count', 'threshold_level', 'threshold_level_display',
            'threshold_limits', 'image', 'notes', 'observed_at', 'created_at'
        )
        read_only_fields = ('id', 'threshold_level', 'created_at')

    def get_threshold_limits(self, obj):
        pt = (obj.pest_type or 'other').lower()
        return PEST_THRESHOLDS.get(pt, PEST_THRESHOLDS['other'])

    def create(self, validated_data):
        if 'request' in self.context and self.context['request'].user.is_authenticated:
            validated_data['user'] = self.context['request'].user
        return super().create(validated_data)
