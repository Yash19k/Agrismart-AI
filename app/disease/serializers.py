from rest_framework import serializers
from .models import DiseaseScan


class DiseaseScanSerializer(serializers.ModelSerializer):
    confidence_percent = serializers.SerializerMethodField()
    image_url          = serializers.SerializerMethodField()
    final_diagnosis    = serializers.CharField(read_only=True)
    is_verified        = serializers.BooleanField(read_only=True)

    class Meta:
        model  = DiseaseScan
        fields = (
            'id', 'predicted_class', 'confidence', 'confidence_percent',
            'severity', 'farmer_leaf_extent', 'is_healthy', 'model_status', 'crop_type',
            'plant_name', 'disease_name', 'final_diagnosis', 'is_verified',
            'image_url', 'created_at', 'needs_expert_review', 'priority', 'referral_recommended',
        )

    def get_confidence_percent(self, obj):
        return f"{obj.confidence * 100:.1f}%" if obj.confidence is not None else None

    def get_image_url(self, obj):
        if obj.image:
            req = self.context.get('request')
            return req.build_absolute_uri(obj.image.url) if req else obj.image.url
        return None


class DiseasePredictSerializer(serializers.Serializer):
    image        = serializers.ImageField(required=True)
    crop_type    = serializers.CharField(required=False, default='Unknown', allow_blank=True)
    farm_id      = serializers.IntegerField(required=False, allow_null=True)
    leaf_extent  = serializers.ChoiceField(
        choices=['<10%', '10-30%', '>30%', 'unknown'],
        required=False,
        default='unknown'
    )
