import random
from datetime import timedelta

from django.conf import settings
from django.contrib.auth.models import AbstractUser, UserManager as DjangoUserManager
from django.db import models
from django.utils import timezone


class UserManager(DjangoUserManager):
	def create_superuser(self, username, email=None, password=None, **extra_fields):
		extra_fields.setdefault('role', 'manager')

		first_name = (extra_fields.get('first_name') or '').strip()
		last_name = (extra_fields.get('last_name') or '').strip()
		if not first_name:
			raise ValueError('Superuser must have a first name.')
		if not last_name:
			raise ValueError('Superuser must have a last name.')

		extra_fields['first_name'] = first_name
		extra_fields['last_name'] = last_name
		return super().create_superuser(username, email, password, **extra_fields)


class User(AbstractUser):
	class Roles(models.TextChoices):
		MANAGER = 'manager', 'Manager'
		STAFF = 'staff', 'Staff'

	REQUIRED_FIELDS = ['email', 'first_name', 'last_name']
	objects = UserManager()

	email = models.EmailField(unique=True)
	role = models.CharField(
		max_length=32,
		choices=Roles.choices,
		default=Roles.STAFF,
	)
	created_at = models.DateTimeField(auto_now_add=True)

	class Meta:
		db_table = 'ims_user_accounts'

	def __str__(self):
		return f'{self.username} ({self.get_role_display()})'


class PasswordResetOTP(models.Model):
	user = models.ForeignKey(
		settings.AUTH_USER_MODEL,
		on_delete=models.CASCADE,
		related_name='password_reset_otps',
	)
	otp_code = models.CharField(max_length=6)
	expires_at = models.DateTimeField()
	is_used = models.BooleanField(default=False)
	created_at = models.DateTimeField(auto_now_add=True)

	class Meta:
		db_table = 'ims_password_reset_otps'
		ordering = ['-created_at']

	def __str__(self):
		return f'OTP for {self.user.username} ({self.otp_code})'

	@classmethod
	def generate_for_user(cls, user):
		otp_code = f'{random.randint(0, 999999):06d}'
		expiry_minutes = getattr(settings, 'PASSWORD_RESET_OTP_EXPIRY_MINUTES', 10)
		cls.objects.filter(
			user=user,
			is_used=False,
			expires_at__gt=timezone.now(),
		).update(is_used=True)
		return cls.objects.create(
			user=user,
			otp_code=otp_code,
			expires_at=timezone.now() + timedelta(minutes=expiry_minutes),
		)

	def is_valid(self):
		return not self.is_used and self.expires_at > timezone.now()
