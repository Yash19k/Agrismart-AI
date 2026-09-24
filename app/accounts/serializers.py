from django.contrib.auth import authenticate
from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken
from .models import User


class RegisterSerializer(serializers.Serializer):
    """Public registration — always creates a farmer account."""
    name = serializers.CharField()
    email = serializers.CharField()
    password = serializers.CharField(write_only=True, min_length=6)

    # Accept role field from frontend but silently force it to 'farmer'
    role = serializers.CharField(required=False, default='farmer')

    def validate_email(self, value):
        val = value.strip()
        if '@' in val:
            if User.objects.filter(email__iexact=val).exists():
                raise serializers.ValidationError("An account with this email already exists.")
        else:
            if User.objects.filter(phone=val).exists() or User.objects.filter(username__iexact=val).exists():
                raise serializers.ValidationError("An account with this mobile number already exists.")
        return val

    def validate_role(self, value):
        # Public signup is ALWAYS farmer — prevent privilege escalation
        return 'farmer'

    def create(self, validated_data):
        name = validated_data.pop('name', '')
        identifier = validated_data['email'].strip()
        password = validated_data['password']
        parts = name.strip().split(' ', 1)
        first = parts[0]
        last = parts[1] if len(parts) > 1 else ''

        email = identifier if '@' in identifier else f"{identifier}@agrismart.local"
        phone = identifier if '@' not in identifier else ''

        user = User.objects.create_user(
            username=identifier.lower(),
            email=email.lower(),
            password=password,
            first_name=first,
            last_name=last,
            phone=phone,
            role='farmer',  # Always farmer for public signup
        )
        return user


class StaffRegisterSerializer(serializers.Serializer):
    """
    Invite-only registration for expert / officer accounts.
    Requires an existing officer's JWT token and a valid invite code.
    """
    name = serializers.CharField()
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=6)
    role = serializers.ChoiceField(choices=['expert', 'officer'])
    invite_code = serializers.CharField()

    # Expert-specific fields
    credentials_note = serializers.CharField(required=False, default='', allow_blank=True)
    is_verified_expert = serializers.BooleanField(required=False, default=False)

    # Region assignment
    assigned_region = serializers.CharField(required=False, default='', allow_blank=True)
    assigned_region_lat = serializers.FloatField(required=False, allow_null=True, default=None)
    assigned_region_lon = serializers.FloatField(required=False, allow_null=True, default=None)
    assigned_region_radius_km = serializers.FloatField(required=False, default=50.0)

    def validate_email(self, value):
        val = value.strip().lower()
        if User.objects.filter(email__iexact=val).exists():
            raise serializers.ValidationError("An account with this email already exists.")
        return val

    def validate_invite_code(self, value):
        # For hackathon scope: accept a known invite code
        # In production this would be a single-use DB token
        import os
        valid_code = os.environ.get('STAFF_INVITE_CODE', 'AGRISMART-STAFF-2024')
        if value.strip() != valid_code:
            raise serializers.ValidationError("Invalid invite code.")
        return value

    def create(self, validated_data):
        name = validated_data.pop('name', '')
        validated_data.pop('invite_code', None)
        email = validated_data.pop('email').strip().lower()
        password = validated_data.pop('password')
        role = validated_data.pop('role')

        parts = name.strip().split(' ', 1)
        first = parts[0]
        last = parts[1] if len(parts) > 1 else ''

        user = User.objects.create_user(
            username=email,
            email=email,
            password=password,
            first_name=first,
            last_name=last,
            role=role,
            is_verified_expert=validated_data.get('is_verified_expert', role == 'expert'),
            credentials_note=validated_data.get('credentials_note', ''),
            assigned_region=validated_data.get('assigned_region', ''),
            assigned_region_lat=validated_data.get('assigned_region_lat'),
            assigned_region_lon=validated_data.get('assigned_region_lon'),
            assigned_region_radius_km=validated_data.get('assigned_region_radius_km', 50.0),
        )
        return user


class LoginSerializer(serializers.Serializer):
    email = serializers.CharField()
    password = serializers.CharField(write_only=True)

    def validate(self, data):
        identifier = data.get('email', '').strip()
        password = data.get('password', '')

        # 1. Direct authenticate with raw identifier
        user = authenticate(username=identifier, password=password)

        # 2. Case-insensitive lookup by email, username, or phone
        if not user:
            u = (
                User.objects.filter(email__iexact=identifier).first()
                or User.objects.filter(username__iexact=identifier).first()
                or User.objects.filter(phone=identifier).first()
            )
            if u:
                user = authenticate(username=u.username, password=password)
                if not user and u.check_password(password):
                    user = u

        if not user:
            raise serializers.ValidationError("Invalid email or password.")
        if not user.is_active:
            raise serializers.ValidationError("This account is disabled.")
        data['user'] = user
        return data


class UserProfileSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            'id', 'name', 'email', 'phone', 'preferred_language', 'role',
            'is_verified_expert', 'credentials_note',
            'assigned_region', 'assigned_region_lat', 'assigned_region_lon',
            'assigned_region_radius_km', 'is_demo',
        )

    def get_name(self, obj):
        return obj.get_full_name() or obj.username
