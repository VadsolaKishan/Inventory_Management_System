from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from apps.users.models import User


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = (
            'id',
            'username',
            'email',
            'first_name',
            'last_name',
            'role',
            'is_active',
            'created_at',
        )
        read_only_fields = ('id', 'created_at')


class RegisterSerializer(serializers.ModelSerializer):
    confirm_password = serializers.CharField(write_only=True)
    password = serializers.CharField(write_only=True, min_length=8, max_length=20, trim_whitespace=False)

    class Meta:
        model = User
        fields = (
            'username',
            'email',
            'first_name',
            'last_name',
            'password',
            'confirm_password',
        )

    def validate(self, attrs):
        if attrs['password'] != attrs['confirm_password']:
            raise serializers.ValidationError({'confirm_password': 'Passwords do not match.'})
        return attrs

    def validate_password(self, value):
        validate_password(value)
        return value

    def create(self, validated_data):
        validated_data.pop('confirm_password')
        password = validated_data.pop('password')
        user = User(role=User.Roles.STAFF, **validated_data)
        user.set_password(password)
        user.save()
        return user


class BaseCreateUserSerializer(serializers.ModelSerializer):
    confirm_password = serializers.CharField(write_only=True)
    password = serializers.CharField(write_only=True, min_length=8, max_length=20, trim_whitespace=False)
    is_active = serializers.BooleanField(default=True)

    class Meta:
        model = User
        fields = (
            'username',
            'email',
            'first_name',
            'last_name',
            'is_active',
            'password',
            'confirm_password',
        )

    def validate(self, attrs):
        if attrs['password'] != attrs['confirm_password']:
            raise serializers.ValidationError({'confirm_password': 'Passwords do not match.'})
        return attrs

    def validate_password(self, value):
        validate_password(value)
        return value

    def get_role(self):
        raise NotImplementedError('Subclasses must implement get_role().')

    def create(self, validated_data):
        validated_data.pop('confirm_password')
        password = validated_data.pop('password')
        user = User(role=self.get_role(), **validated_data)
        user.set_password(password)
        user.save()
        return user


class CreateManagerSerializer(BaseCreateUserSerializer):
    first_name = serializers.CharField(required=True, allow_blank=False)
    last_name = serializers.CharField(required=True, allow_blank=False)

    def get_role(self):
        return User.Roles.MANAGER


class CreateStaffSerializer(BaseCreateUserSerializer):
    def get_role(self):
        return User.Roles.STAFF


class LoginSerializer(serializers.Serializer):
    login = serializers.CharField(max_length=150, trim_whitespace=True)
    password = serializers.CharField(write_only=True, trim_whitespace=False)

    def validate_login(self, value):
        cleaned = value.strip()
        if not cleaned:
            raise serializers.ValidationError('Login is required.')
        return cleaned


class PasswordResetOTPRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()


class PasswordResetOTPConfirmSerializer(serializers.Serializer):
    email = serializers.EmailField()
    otp_code = serializers.CharField(max_length=6, min_length=6)
    new_password = serializers.CharField(write_only=True, min_length=8, max_length=20, trim_whitespace=False)

    def validate_new_password(self, value):
        validate_password(value)
        return value