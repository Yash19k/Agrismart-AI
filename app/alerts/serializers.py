from rest_framework import serializers
from .models import Alert


class AlertSerializer(serializers.ModelSerializer):
    class Meta:
        model = Alert
        fields = (
            'id', 'alert_type', 'related_scan', 'message',
            'is_read', 'created_at',
        )
        read_only_fields = ('id', 'alert_type', 'related_scan', 'message', 'created_at')
