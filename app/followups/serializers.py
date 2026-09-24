from rest_framework import serializers
from .models import FollowUp


class FollowUpSerializer(serializers.ModelSerializer):
    farm_name = serializers.CharField(source='farm.farm_name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    outcome_display = serializers.CharField(source='get_outcome_display', read_only=True)

    original_scan_image_url = serializers.SerializerMethodField()
    original_crop = serializers.CharField(source='original_scan.crop_type', read_only=True)
    original_disease = serializers.CharField(source='original_scan.disease_name', read_only=True)
    original_severity = serializers.CharField(source='original_scan.severity', read_only=True)

    recheck_scan_image_url = serializers.SerializerMethodField()
    recheck_disease = serializers.CharField(source='recheck_scan.disease_name', read_only=True)
    recheck_is_healthy = serializers.BooleanField(source='recheck_scan.is_healthy', read_only=True)

    class Meta:
        model = FollowUp
        fields = (
            'id', 'original_scan', 'recheck_scan', 'farm', 'farm_name', 'user',
            'scheduled_date', 'status', 'status_display', 'outcome', 'outcome_display',
            'intervention_applied', 'recovery_percentage', 'notes',
            'original_scan_image_url', 'original_crop', 'original_disease', 'original_severity',
            'recheck_scan_image_url', 'recheck_disease', 'recheck_is_healthy',
            'completed_at', 'created_at'
        )
        read_only_fields = ('id', 'created_at')

    def get_original_scan_image_url(self, obj):
        if obj.original_scan and obj.original_scan.image:
            request = self.context.get('request')
            return request.build_absolute_uri(obj.original_scan.image.url) if request else obj.original_scan.image.url
        return None

    def get_recheck_scan_image_url(self, obj):
        if obj.recheck_scan and obj.recheck_scan.image:
            request = self.context.get('request')
            return request.build_absolute_uri(obj.recheck_scan.image.url) if request else obj.recheck_scan.image.url
        return None

    def create(self, validated_data):
        if 'request' in self.context and self.context['request'].user.is_authenticated:
            validated_data['user'] = self.context['request'].user
        return super().create(validated_data)
