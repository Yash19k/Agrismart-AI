from rest_framework import serializers
from .models import ExpertReview
from disease.serializers import DiseaseScanSerializer


class ExpertReviewSerializer(serializers.ModelSerializer):
    expert_name = serializers.CharField(source='expert.get_full_name', read_only=True)
    scan_image_url = serializers.SerializerMethodField()
    scan_crop = serializers.CharField(source='scan.crop_type', read_only=True)
    scan_disease = serializers.CharField(source='scan.disease_name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    farm_name = serializers.CharField(source='scan.farm.farm_name', read_only=True)

    class Meta:
        model = ExpertReview
        fields = (
            'id', 'scan', 'expert', 'expert_name', 'farm_name', 'status', 'status_display',
            'ai_predicted_class', 'ai_confidence', 'scan_image_url', 'scan_crop', 'scan_disease',
            'expert_crop', 'expert_disease', 'expert_severity', 'is_healthy',
            'confidence_rating', 'diagnosis_notes', 'action_plan',
            'reviewed_at', 'created_at'
        )
        read_only_fields = ('id', 'ai_predicted_class', 'ai_confidence', 'reviewed_at', 'created_at')

    def get_scan_image_url(self, obj):
        if obj.scan and obj.scan.image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.scan.image.url)
            return obj.scan.image.url
        return None

    def create(self, validated_data):
        if 'request' in self.context and self.context['request'].user.is_authenticated:
            validated_data['expert'] = self.context['request'].user
        return super().create(validated_data)
