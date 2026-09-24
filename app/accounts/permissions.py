"""
Role-based DRF permission classes for AgriSmart.

Usage in views:
    from accounts.permissions import IsFarmer, IsExpertOrOfficer, IsOfficer

    @permission_classes([IsExpertOrOfficer])
    def my_expert_view(request): ...
"""
from rest_framework.permissions import BasePermission


class IsFarmer(BasePermission):
    """Allows access only to authenticated users with role='farmer'."""
    message = 'This action is available only for farmer accounts.'

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and getattr(request.user, 'role', '') == 'farmer'
        )


class IsExpertOrOfficer(BasePermission):
    """Allows access to authenticated users with role='expert' or 'officer'."""
    message = 'This action requires expert or officer credentials.'

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and getattr(request.user, 'role', '') in ('expert', 'officer')
        )


class IsOfficer(BasePermission):
    """Allows access only to authenticated users with role='officer'."""
    message = 'This action is restricted to agriculture officers.'

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and getattr(request.user, 'role', '') == 'officer'
        )


class IsOwnerOrStaff(BasePermission):
    """
    Object-level permission: allows the owning farmer OR expert/officer.
    Views must implement get_object() or pass the object to has_object_permission().
    """
    message = 'You do not have permission to access this resource.'

    def has_object_permission(self, request, view, obj):
        if not request.user or not request.user.is_authenticated:
            return False
        role = getattr(request.user, 'role', '')
        if role in ('expert', 'officer'):
            return True
        # Farmer: must own the object
        owner = getattr(obj, 'user', None) or getattr(obj, 'farmer', None)
        return owner == request.user
