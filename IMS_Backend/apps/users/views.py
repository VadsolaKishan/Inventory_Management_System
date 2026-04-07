import logging

from django.conf import settings
from django.contrib.auth.hashers import check_password, make_password
from django.contrib.auth.models import update_last_login
from django.core.mail import send_mail
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import AuthenticationFailed, ValidationError
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken

from apps.users.models import PasswordResetOTP, User
from apps.users.permissions import IsManagerOnly, IsManagerOrSuperUser, IsSuperUserOnly
from apps.users.security import (
	SAFE_LOGIN_ERROR_MESSAGE,
	check_login_block,
	clear_failed_logins,
	get_client_ip,
	normalize_login_identifier,
	register_failed_login,
)
from apps.users.serializers import (
    CreateManagerSerializer,
    CreateStaffSerializer,
	LoginSerializer,
	PasswordResetOTPConfirmSerializer,
	PasswordResetOTPRequestSerializer,
	RegisterSerializer,
	UserSerializer,
)


logger = logging.getLogger('apps.users.auth')
DUMMY_PASSWORD_HASH = make_password('ims-login-dummy-password')


def build_token_response(user):
	refresh = RefreshToken.for_user(user)
	access = refresh.access_token
	public_user = {
		'username': user.username,
		'role': user.role,
	}
	return {
		'user': public_user,
		'access_token': str(access),
		'refresh_token': str(refresh),
		# Backward-compatible token keys for existing clients.
		'access': str(access),
		'refresh': str(refresh),
	}


def find_user_by_login(login_identifier):
	user = User.objects.filter(email__iexact=login_identifier).first()
	if user:
		return user
	return User.objects.filter(username__iexact=login_identifier).first()


def verify_password_constant_time(user, raw_password):
	if not user:
		check_password(raw_password, DUMMY_PASSWORD_HASH)
		return False
	return user.check_password(raw_password)


def send_password_reset_otp_email(user, otp):
	require_real_delivery = getattr(settings, 'OTP_REQUIRE_REAL_EMAIL_DELIVERY', True)
	if require_real_delivery and getattr(settings, 'EMAIL_BACKEND', '') == 'django.core.mail.backends.console.EmailBackend':
		raise RuntimeError('Email backend is set to console backend, so OTP emails are not deliverable.')

	expiry_minutes = getattr(settings, 'PASSWORD_RESET_OTP_EXPIRY_MINUTES', 10)
	subject = getattr(
		settings,
		'PASSWORD_RESET_OTP_SUBJECT',
		'Your Inventory Management System OTP',
	)
	recipient_name = user.get_full_name().strip() or user.username
	message = (
		f'Hello {recipient_name},\n\n'
		'We received a request to reset your password for Inventory Management System.\n'
		f'Your OTP is: {otp.otp_code}\n'
		f'This OTP will expire in {expiry_minutes} minutes.\n\n'
		'If you did not request this reset, you can safely ignore this email.'
	)

	sent_count = send_mail(
		subject=subject,
		message=message,
		from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', None),
		recipient_list=[user.email],
		fail_silently=False,
	)

	if sent_count != 1:
		raise RuntimeError('SMTP transport did not accept the OTP email.')


class AuthViewSet(viewsets.GenericViewSet):
	queryset = User.objects.all()
	permission_classes = [AllowAny]

	@action(detail=False, methods=['post'], url_path='register')
	def register(self, request):
		serializer = RegisterSerializer(data=request.data)
		serializer.is_valid(raise_exception=True)
		user = serializer.save()
		return Response(build_token_response(user), status=status.HTTP_201_CREATED)

	@action(detail=False, methods=['post'], url_path='login')
	def login(self, request):
		serializer = LoginSerializer(data=request.data)
		serializer.is_valid(raise_exception=True)
		login_identifier = serializer.validated_data['login']
		password = serializer.validated_data['password']
		client_ip = get_client_ip(request)
		normalized_identifier = normalize_login_identifier(login_identifier)

		is_blocked, retry_after = check_login_block(normalized_identifier, client_ip)
		if is_blocked:
			logger.warning(
				'Blocked login attempt identifier=%s ip=%s retry_after_seconds=%s',
				normalized_identifier,
				client_ip,
				retry_after,
			)
			return Response(
				{
					'detail': f'Too many login attempts. Please try again later. Expected available in {retry_after} seconds.',
					'retry_after_seconds': retry_after,
				},
				status=status.HTTP_429_TOO_MANY_REQUESTS,
			)

		user = find_user_by_login(login_identifier)
		password_valid = verify_password_constant_time(user, password)
		if not user or not password_valid or not user.is_active:
			newly_blocked, new_retry_after = register_failed_login(normalized_identifier, client_ip)
			logger.warning(
				'Failed login attempt identifier=%s ip=%s blocked=%s retry_after_seconds=%s user_id=%s active=%s',
				normalized_identifier,
				client_ip,
				newly_blocked,
				new_retry_after,
				getattr(user, 'id', None),
				getattr(user, 'is_active', None),
			)
			if newly_blocked:
				return Response(
					{
						'detail': (
							f'Too many login attempts. Please try again later. '
							f'Expected available in {new_retry_after} seconds.'
						),
						'retry_after_seconds': new_retry_after,
					},
					status=status.HTTP_429_TOO_MANY_REQUESTS,
				)
			raise AuthenticationFailed(SAFE_LOGIN_ERROR_MESSAGE)

		clear_failed_logins(normalized_identifier, client_ip)
		update_last_login(None, user)
		logger.info(
			'Successful login user_id=%s username=%s role=%s ip=%s',
			user.id,
			user.username,
			user.role,
			client_ip,
		)
		return Response(build_token_response(user), status=status.HTTP_200_OK)

	@action(
		detail=False,
		methods=['post'],
		url_path='password-reset/request-otp',
		permission_classes=[AllowAny],
	)
	def request_password_reset_otp(self, request):
		serializer = PasswordResetOTPRequestSerializer(data=request.data)
		serializer.is_valid(raise_exception=True)
		email = serializer.validated_data['email']
		user = User.objects.filter(email__iexact=email).first()
		default_response = {
			'detail': 'If the account exists, an OTP has been sent to the registered email address.',
		}

		if not user:
			return Response(default_response, status=status.HTTP_200_OK)

		otp = PasswordResetOTP.generate_for_user(user)
		try:
			send_password_reset_otp_email(user, otp)
		except Exception:
			otp.is_used = True
			otp.save(update_fields=['is_used'])
			logger.exception('Failed to send password reset OTP email for user_id=%s', user.id)
			return Response(
				{'detail': 'Unable to deliver OTP email right now. Please verify email settings and try again.'},
				status=status.HTTP_503_SERVICE_UNAVAILABLE,
			)

		return Response(
			default_response,
			status=status.HTTP_200_OK,
		)

	@action(
		detail=False,
		methods=['post'],
		url_path='password-reset/confirm',
		permission_classes=[AllowAny],
	)
	def confirm_password_reset(self, request):
		serializer = PasswordResetOTPConfirmSerializer(data=request.data)
		serializer.is_valid(raise_exception=True)
		email = serializer.validated_data['email']
		otp_code = serializer.validated_data['otp_code']
		new_password = serializer.validated_data['new_password']

		user = User.objects.filter(email__iexact=email).first()
		if not user:
			raise ValidationError({'email': 'No account found for this email.'})

		otp = (
			PasswordResetOTP.objects.filter(
				user=user,
				otp_code=otp_code,
				is_used=False,
			)
			.order_by('-created_at')
			.first()
		)
		if not otp or not otp.is_valid():
			raise ValidationError({'otp_code': 'Invalid or expired OTP.'})

		user.set_password(new_password)
		user.save(update_fields=['password'])
		otp.is_used = True
		otp.save(update_fields=['is_used'])
		return Response({'detail': 'Password reset successful.'}, status=status.HTTP_200_OK)

	@action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
	def me(self, request):
		return Response(UserSerializer(request.user).data, status=status.HTTP_200_OK)


class UserViewSet(
	mixins.ListModelMixin,
	mixins.RetrieveModelMixin,
	viewsets.GenericViewSet,
):
	queryset = User.objects.all().order_by('-created_at')
	serializer_class = UserSerializer
	permission_classes = [IsAuthenticated, IsManagerOrSuperUser]
	filterset_fields = ['role', 'is_active']
	search_fields = ['username', 'email', 'first_name', 'last_name']
	ordering_fields = ['created_at', 'username', 'email']

	def get_permissions(self):
		if self.action == 'create_manager':
			permission_classes = [IsAuthenticated, IsSuperUserOnly]
		elif self.action == 'create_staff':
			permission_classes = [IsAuthenticated, IsManagerOnly]
		else:
			permission_classes = self.permission_classes
		return [permission() for permission in permission_classes]

	@action(detail=False, methods=['post'], url_path='create-manager')
	def create_manager(self, request):
		serializer = CreateManagerSerializer(data=request.data)
		serializer.is_valid(raise_exception=True)
		user = serializer.save()
		return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)

	@action(detail=False, methods=['post'], url_path='create-staff')
	def create_staff(self, request):
		serializer = CreateStaffSerializer(data=request.data)
		serializer.is_valid(raise_exception=True)
		user = serializer.save()
		return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)
