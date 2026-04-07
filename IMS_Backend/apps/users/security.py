import hashlib
from datetime import timedelta

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from apps.users.models import LoginLockoutState

SAFE_LOGIN_ERROR_MESSAGE = 'Invalid username or password'


def get_client_ip(request):
    forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR', '')
    if forwarded_for:
        return forwarded_for.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR', 'unknown').strip() or 'unknown'


def normalize_login_identifier(value):
    return (value or '').strip().lower()


def _get_limits():
    max_attempts = max(1, int(getattr(settings, 'LOGIN_MAX_ATTEMPTS', 3)))
    attempt_window = max(60, int(getattr(settings, 'LOGIN_ATTEMPT_WINDOW_SECONDS', 500)))
    lockout_window = max(60, int(getattr(settings, 'LOGIN_LOCKOUT_SECONDS', 500)))
    return max_attempts, attempt_window, lockout_window


def _make_cache_key(identifier, ip_address):
    normalized_identifier = normalize_login_identifier(identifier)
    # Account lockout is intentionally identifier-based to ensure consistent blocking.
    return hashlib.sha256(normalized_identifier.encode('utf-8')).hexdigest()


def _seconds_until(future_time, now_time):
    return max(1, int((future_time - now_time).total_seconds()))


def check_login_block(identifier, ip_address):
    _, _, lockout_window = _get_limits()
    key = _make_cache_key(identifier, ip_address)
    now_time = timezone.now()
    record = LoginLockoutState.objects.filter(identifier_hash=key).first()

    if not record:
        return False, 0

    lock_until = record.lock_until
    if not lock_until or lock_until <= now_time:
        return False, 0

    # If limits were reduced, cap any previously stored longer lockout.
    max_allowed_lock_until = now_time + timedelta(seconds=lockout_window)
    if lock_until > max_allowed_lock_until:
        lock_until = max_allowed_lock_until
        record.lock_until = lock_until
        record.save(update_fields=['lock_until', 'updated_at'])

    retry_after = _seconds_until(lock_until, now_time)
    return True, retry_after


def register_failed_login(identifier, ip_address):
    max_attempts, attempt_window, lockout_window = _get_limits()
    key = _make_cache_key(identifier, ip_address)
    now_time = timezone.now()

    with transaction.atomic():
        record, _ = LoginLockoutState.objects.select_for_update().get_or_create(
            identifier_hash=key,
            defaults={
                'failure_count': 0,
                'first_failure_at': now_time,
                'lock_until': None,
            },
        )

        if record.lock_until and record.lock_until > now_time:
            return True, _seconds_until(record.lock_until, now_time)

        if (now_time - record.first_failure_at).total_seconds() > attempt_window:
            record.failure_count = 0
            record.first_failure_at = now_time
            record.lock_until = None

        record.failure_count += 1

        if record.failure_count >= max_attempts:
            record.lock_until = now_time + timedelta(seconds=lockout_window)

        record.save()

        if record.lock_until and record.lock_until > now_time:
            return True, _seconds_until(record.lock_until, now_time)

    return False, 0


def clear_failed_logins(identifier, ip_address):
    key = _make_cache_key(identifier, ip_address)
    LoginLockoutState.objects.filter(identifier_hash=key).delete()
