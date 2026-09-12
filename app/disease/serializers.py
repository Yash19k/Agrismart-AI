from rest_framework import serializers
from .models import DiseaseScan


class DiseaseScanSerializer(serializers.ModelSerializer):
    confidence_percent = serializers.SerializerMethodField()
    image_url          = serializers.SerializerMethodField()

    class Meta:
        model  = DiseaseScan
        fields = (
            'id', 'predicted_class', 'confidence', 'confidence_percent',
            'severity', 'is_healthy', 'model_status', 'crop_type',
            'image_url', 'created_at',
        )

    def get_confidence_percent(self, obj):
        return f"{obj.confidence * 100:.1f}%" if obj.confidence is not None else None

    def get_image_url(self, obj):
        if obj.image:
            req = self.context.get('request')
            return req.build_absolute_uri(obj.image.url) if req else obj.image.url
        return None


class DiseasePredictSerializer(serializers.Serializer):
    image     = serializers.ImageField(required=True)
    crop_type = serializers.CharField(required=False, default='Unknown', allow_blank=True)
    farm_id   = serializers.IntegerField(required=False, allow_null=True)
