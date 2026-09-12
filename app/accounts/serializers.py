from django.contrib.auth import authenticate
from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken
from .models import User


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6)
    name = serializers.CharField()

    class Meta:
        model = User
        fields = ('name', 'email', 'password')

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("An account with this email already exists.")
        return value

    def create(self, validated_data):
        name = validated_data.pop('name', '')
        email = validated_data['email']
        parts = name.strip().split(' ', 1)
        first = parts[0]
        last = parts[1] if len(parts) > 1 else ''
        user = User.objects.create_user(
            username=email,
            email=email,
            password=validated_data['password'],
            first_name=first,
            last_name=last,
        )
        return user


class LoginSerializer(serializers.Serializer):
    email = serializers.CharField()
    password = serializers.CharField(write_only=True)

    def validate(self, data):
        email = data.get('email', '').strip()
        password = data.get('password', '')
        user = authenticate(username=email, password=password)
        if not user:
            try:
                u = User.objects.get(email=email)
                user = authenticate(username=u.username, password=password)
            except User.DoesNotExist:
                pass
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
        fields = ('id', 'name', 'email', 'phone', 'preferred_language')

    def get_name(self, obj):
        return obj.get_full_name() or obj.username
