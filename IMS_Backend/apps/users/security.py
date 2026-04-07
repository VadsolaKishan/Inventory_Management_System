import hashlib

from django.conf import settings
from django.core.cache import cache
from django.utils import timezone

SAFE_LOGIN_ERROR_MESSAGE = 'Invalid username or password'


def get_client_ip(request):
    forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR', '')
    if forwarded_for:
        return forwarded_for.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR', 'unknown').strip() or 'unknown'


def normalize_login_identifier(value):
    return (value or '').strip().lower()


def _get_limits():
    max_attempts = max(1, int(getattr(settings, 'LOGIN_MAX_ATTEMPTS', 5)))
    attempt_window = max(60, int(getattr(settings, 'LOGIN_ATTEMPT_WINDOW_SECONDS', 900)))
    lockout_window = max(60, int(getattr(settings, 'LOGIN_LOCKOUT_SECONDS', 900)))
    return max_attempts, attempt_window, lockout_window


def _make_cache_key(identifier, ip_address):
    normalized_identifier = normalize_login_identifier(identifier)
    normalized_ip = (ip_address or 'unknown').strip().lower()
    digest = hashlib.sha256(f'{normalized_identifier}|{normalized_ip}'.encode('utf-8')).hexdigest()
    return f'auth:login-attempts:{digest}'


def _now_ts():
    return int(timezone.now().timestamp())


def check_login_block(identifier, ip_address):
    _, _, lockout_window = _get_limits()
    key = _make_cache_key(identifier, ip_address)
    now_ts = _now_ts()
    record = cache.get(key)

    if not record:
        return False, 0

    lock_until = int(record.get('lock_until', 0) or 0)
    if lock_until <= now_ts:
        return False, 0

    # If limits were reduced, cap any previously stored longer lockout.
    max_allowed_lock_until = now_ts + lockout_window
    if lock_until > max_allowed_lock_until:
        lock_until = max_allowed_lock_until
        record['lock_until'] = lock_until

    retry_after = max(1, lock_until - now_ts)
    cache.set(key, record, timeout=max(retry_after, lockout_window))
    return True, retry_after


def register_failed_login(identifier, ip_address):
    max_attempts, attempt_window, lockout_window = _get_limits()
    key = _make_cache_key(identifier, ip_address)
    now_ts = _now_ts()

    record = cache.get(key) or {'count': 0, 'first_failure': now_ts, 'lock_until': 0}

    first_failure = int(record.get('first_failure', now_ts) or now_ts)
    lock_until = int(record.get('lock_until', 0) or 0)

    if lock_until > now_ts:
        retry_after = max(1, lock_until - now_ts)
        cache.set(key, record, timeout=max(retry_after, lockout_window))
        return True, retry_after

    if now_ts - first_failure > attempt_window:
        record = {'count': 0, 'first_failure': now_ts, 'lock_until': 0}

    record['count'] = int(record.get('count', 0) or 0) + 1

    if record['count'] >= max_attempts:
        record['lock_until'] = now_ts + lockout_window

    timeout = max(lockout_window, attempt_window)
    cache.set(key, record, timeout=timeout)

    if int(record.get('lock_until', 0) or 0) > now_ts:
        return True, max(1, int(record['lock_until']) - now_ts)

    return False, 0


def clear_failed_logins(identifier, ip_address):
    key = _make_cache_key(identifier, ip_address)
    cache.delete(key)
