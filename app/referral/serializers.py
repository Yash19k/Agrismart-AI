from rest_framework import serializers
from .models import Referral


class ReferralSerializer(serializers.ModelSerializer):
    farm_name = serializers.ReadOnlyField(source='farm.farm_name')
    farmer_name = serializers.ReadOnlyField(source='farm.user.get_full_name')
    scan_disease = serializers.ReadOnlyField(source='scan.disease_name')
    scan_crop = serializers.ReadOnlyField(source='scan.crop_type')
    scan_image_url = serializers.SerializerMethodField()

    class Meta:
        model = Referral
        fields = (
            'id', 'scan', 'farm', 'farm_name', 'farmer_name',
            'scan_disease', 'scan_crop', 'scan_image_url',
            'type', 'reason', 'status', 'requested_by',
            'directory_entry', 'notes', 'created_at', 'updated_at'
        )
        read_only_fields = ('id', 'created_at', 'updated_at')

    def get_scan_image_url(self, obj):
        if obj.scan and obj.scan.image:
            req = self.context.get('request')
            return req.build_absolute_uri(obj.scan.image.url) if req else obj.scan.image.url
        return None
