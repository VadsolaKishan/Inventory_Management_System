from rest_framework.permissions import SAFE_METHODS, BasePermission

from apps.users.models import User


def is_superuser(user):
    return bool(user and user.is_authenticated and user.is_superuser)


def is_manager(user, allow_superuser=True):
    if allow_superuser and is_superuser(user):
        return True
    return bool(user and user.is_authenticated and user.role == User.Roles.MANAGER)


def is_staff_member(user):
    return bool(user and user.is_authenticated and user.role == User.Roles.STAFF)


class IsSuperUserOnly(BasePermission):
    def has_permission(self, request, view):
        return is_superuser(request.user)


class IsManagerOnly(BasePermission):
    def has_permission(self, request, view):
        return is_manager(request.user, allow_superuser=True)


class IsManagerOrSuperUser(BasePermission):
    def has_permission(self, request, view):
        return is_manager(request.user, allow_superuser=True)


class IsManagerOrStaff(BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and (
                request.user.role in {User.Roles.MANAGER, User.Roles.STAFF}
                or request.user.is_superuser
            )
        )


class IsManagerOrReadOnly(BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.method in SAFE_METHODS:
            return True
        return is_manager(request.user, allow_superuser=True)


class IsInventoryManager(BasePermission):
    def has_permission(self, request, view):
        return is_manager(request.user, allow_superuser=True)


class IsInventoryManagerOrWarehouseStaff(BasePermission):
    def has_permission(self, request, view):
        return IsManagerOrStaff().has_permission(request, view)


class IsInventoryManagerOrReadOnly(BasePermission):
    def has_permission(self, request, view):
        return IsManagerOrReadOnly().has_permission(request, view)