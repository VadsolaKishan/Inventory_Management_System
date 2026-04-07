import logging

from django.conf import settings
from django.contrib.auth import authenticate
from django.core.mail import send_mail
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import AuthenticationFailed, ValidationError
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken

from apps.users.models import PasswordResetOTP, User
from apps.users.permissions import IsManagerOnly, IsManagerOrSuperUser, IsSuperUserOnly
from apps.users.serializers import (
    CreateManagerSerializer,
    CreateStaffSerializer,
	LoginSerializer,
	PasswordResetOTPConfirmSerializer,
	PasswordResetOTPRequestSerializer,
	RegisterSerializer,
	UserSerializer,
)


logger = logging.getLogger(__name__)


def build_token_response(user):
	refresh = RefreshToken.for_user(user)
	return {
		'refresh': str(refresh),
		'access': str(refresh.access_token),
		'user': UserSerializer(user).data,
	}


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
		user = authenticate(
			username=serializer.validated_data['username'],
			password=serializer.validated_data['password'],
		)
		if not user:
			raise AuthenticationFailed('Invalid username or password.')
		if not user.is_active:
			raise AuthenticationFailed('User account is inactive.')
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
