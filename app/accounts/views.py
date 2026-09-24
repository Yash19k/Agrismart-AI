from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from .models import User
from .serializers import RegisterSerializer, LoginSerializer, UserProfileSerializer, StaffRegisterSerializer
from .permissions import IsOfficer


def _tokens(user):
    refresh = RefreshToken.for_user(user)
    return {'access': str(refresh.access_token), 'refresh': str(refresh)}


def _user_payload(user):
    return {
        'id': user.id,
        'name': user.get_full_name() or user.username,
        'email': user.email,
        'role': getattr(user, 'role', 'farmer'),
        'preferred_language': getattr(user, 'preferred_language', 'en'),
        'is_verified_expert': getattr(user, 'is_verified_expert', False),
        'assigned_region': getattr(user, 'assigned_region', ''),
        'isOnboarded': True,
        'farm': {},
    }


@api_view(['POST'])
@permission_classes([AllowAny])
def register_view(request):
    """Public registration — always creates a farmer account."""
    serializer = RegisterSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        tokens = _tokens(user)
        return Response({**tokens, 'user': _user_payload(user)}, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsOfficer])
def register_staff_view(request):
    """
    Invite-only registration for expert / officer accounts.
    POST /api/auth/register-staff/
    Requires an existing officer's JWT token and a valid invite code.
    """
    serializer = StaffRegisterSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        return Response({
            'user': _user_payload(user),
            'message': f'{user.get_full_name()} registered as {user.role}.',
        }, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    serializer = LoginSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.validated_data['user']
        tokens = _tokens(user)
        return Response({**tokens, 'user': _user_payload(user)})
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
def reset_password_view(request):
    """Allows user to change / reset password by providing username/email."""
    identifier = request.data.get('identifier', '').strip()
    new_password = request.data.get('new_password', '').strip()

    if not identifier:
        return Response({'detail': 'Please provide your username or email address.'}, status=status.HTTP_400_BAD_REQUEST)

    if not new_password or len(new_password) < 6:
        return Response({'detail': 'New password must be at least 6 characters long.'}, status=status.HTTP_400_BAD_REQUEST)

    user = User.objects.filter(username__iexact=identifier).first()
    if not user:
        user = User.objects.filter(email__iexact=identifier).first()
    if not user:
        user = User.objects.filter(phone=identifier).first()

    if not user:
        return Response({'detail': f'No account found with username or email "{identifier}".'}, status=status.HTTP_404_NOT_FOUND)

    user.set_password(new_password)
    user.save()
    return Response({'success': True, 'message': 'Password changed successfully! You can now log in with your new password.'})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def profile_view(request):
    serializer = UserProfileSerializer(request.user)
    return Response(serializer.data)
