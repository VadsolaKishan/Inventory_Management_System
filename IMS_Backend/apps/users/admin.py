from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin

from apps.users.models import PasswordResetOTP, User


@admin.register(User)
class UserAdmin(DjangoUserAdmin):
	fieldsets = DjangoUserAdmin.fieldsets + (
		('Role', {'fields': ('role',)}),
	)
	list_display = ('username', 'email', 'role', 'is_active', 'is_staff')
	list_filter = ('role', 'is_active', 'is_staff')


@admin.register(PasswordResetOTP)
class PasswordResetOTPAdmin(admin.ModelAdmin):
	list_display = ('user', 'otp_code', 'expires_at', 'is_used', 'created_at')
	list_filter = ('is_used', 'created_at')
	search_fields = ('user__username', 'user__email', 'otp_code')
