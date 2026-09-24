from django.contrib.auth import authenticate
from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken
from .models import User


class RegisterSerializer(serializers.Serializer):
    name = serializers.CharField()
    email = serializers.CharField()
    password = serializers.CharField(write_only=True, min_length=6)

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

    def create(self, validated_data):
        name = validated_data.pop('name', '')
        identifier = validated_data['email'].strip()
        password = validated_data['password']
        role = validated_data.get('role', 'farmer')
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
            role=role,
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
        fields = ('id', 'name', 'email', 'phone', 'preferred_language', 'role')

    def get_name(self, obj):
        return obj.get_full_name() or obj.username
