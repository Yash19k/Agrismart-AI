from rest_framework import serializers
from .models import FeedbackRecord


class FeedbackRecordSerializer(serializers.ModelSerializer):
    is_concordant = serializers.BooleanField(read_only=True)
    scan_image_url = serializers.SerializerMethodField()
    split_display = serializers.CharField(source='get_dataset_split_display', read_only=True)
    source_display = serializers.CharField(source='get_validation_source_display', read_only=True)

    class Meta:
        model = FeedbackRecord
        fields = (
            'id', 'scan', 'review', 'image_path', 'scan_image_url',
            'original_prediction', 'original_confidence', 'ground_truth_label',
            'is_concordant', 'validation_source', 'source_display',
            'dataset_split', 'split_display', 'notes', 'created_at'
        )
        read_only_fields = ('id', 'is_concordant', 'created_at')

    def get_scan_image_url(self, obj):
        if obj.scan and obj.scan.image:
            request = self.context.get('request')
            return request.build_absolute_uri(obj.scan.image.url) if request else obj.scan.image.url
        return None
