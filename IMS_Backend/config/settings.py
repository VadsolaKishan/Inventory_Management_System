import os
import sys
from datetime import timedelta
from pathlib import Path
from urllib.parse import parse_qs, unquote, urlparse
from django.core.exceptions import ImproperlyConfigured


BASE_DIR = Path(__file__).resolve().parent.parent

env_file = BASE_DIR / '.env'
if env_file.exists():
    for raw_line in env_file.read_text(encoding='utf-8').splitlines():
        line = raw_line.strip()
        if not line or line.startswith('#') or '=' not in line:
            continue
        key, value = line.split('=', 1)
        os.environ.setdefault(key.strip(), value.strip())


def to_bool(value: str | None, default: bool = False) -> bool:
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def to_list(value: str | None, default: list[str]) -> list[str]:
    if not value:
        return default
    return [item.strip() for item in value.split(",") if item.strip()]


def normalize_env_value(value: str | None) -> str:
    if value is None:
        return ""
    cleaned = value.strip()
    if len(cleaned) >= 2 and cleaned[0] == cleaned[-1] and cleaned[0] in {'"', "'"}:
        return cleaned[1:-1].strip()
    return cleaned


def parse_postgres_url(database_url: str) -> dict:
    parsed = urlparse(database_url)
    scheme = parsed.scheme.lower()
    if scheme not in {"postgres", "postgresql"}:
        raise ValueError("DATABASE_URL must use postgres:// or postgresql://")

    options = {key: values[-1] for key, values in parse_qs(parsed.query).items()}

    return {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": parsed.path.lstrip("/") or "postgres",
        "USER": unquote(parsed.username or ""),
        "PASSWORD": unquote(parsed.password or ""),
        "HOST": parsed.hostname or "127.0.0.1",
        "PORT": str(parsed.port or "5432"),
        "OPTIONS": options,
        "CONN_MAX_AGE": int(os.getenv("DB_CONN_MAX_AGE", "60")),
    }


SECRET_KEY = normalize_env_value(os.getenv("DJANGO_SECRET_KEY"))

if not SECRET_KEY:
    raise ImproperlyConfigured("DJANGO_SECRET_KEY must be set.")

DEBUG = to_bool(os.getenv("DJANGO_DEBUG"), default=False)

ALLOWED_HOSTS = to_list(os.getenv("DJANGO_ALLOWED_HOSTS"), ["127.0.0.1", "localhost"])

render_external_hostname = normalize_env_value(os.getenv("RENDER_EXTERNAL_HOSTNAME"))
if render_external_hostname and render_external_hostname not in ALLOWED_HOSTS:
    ALLOWED_HOSTS.append(render_external_hostname)


INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'corsheaders',
    'rest_framework',
    'rest_framework_simplejwt.token_blacklist',
    'django_filters',
    'apps.users.apps.UsersConfig',
    'apps.products.apps.ProductsConfig',
    'apps.warehouse.apps.WarehouseConfig',
    'apps.inventory.apps.InventoryConfig',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'config.middleware.APIPerformanceLoggingMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'


database_url = normalize_env_value(os.getenv("DATABASE_URL"))
db_engine = os.getenv("DB_ENGINE", "postgresql").lower()

if database_url:
    DATABASES = {"default": parse_postgres_url(database_url)}
elif db_engine == "sqlite":
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "db.sqlite3",
        }
    }
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": os.getenv("DB_NAME", "neondb"),
            "USER": os.getenv("DB_USER", "neondb_owner"),
            "PASSWORD": os.getenv("DB_PASSWORD", ""),
            "HOST": os.getenv("DB_HOST", "127.0.0.1"),
            "PORT": os.getenv("DB_PORT", "5432"),
            "OPTIONS": {
                "sslmode": os.getenv("DB_SSLMODE", "require"),
                "channel_binding": os.getenv("DB_CHANNEL_BINDING", "require"),
            },
        }
    }


AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
        'OPTIONS': {
            'min_length': 8,
        },
    },
    {
        'NAME': 'apps.users.validators.StrongPasswordRegexValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]


LANGUAGE_CODE = 'en-us'

TIME_ZONE = 'UTC'

USE_I18N = True

USE_TZ = True


STATIC_URL = 'static/'

STATIC_ROOT = BASE_DIR / 'staticfiles'
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

AUTH_USER_MODEL = 'users.User'

CSRF_TRUSTED_ORIGINS = to_list(os.getenv("CSRF_TRUSTED_ORIGINS"), [])
if render_external_hostname:
    render_origin = f"https://{render_external_hostname}"
    if render_origin not in CSRF_TRUSTED_ORIGINS:
        CSRF_TRUSTED_ORIGINS.append(render_origin)

SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
IS_DJANGO_RUNSERVER = 'runserver' in sys.argv
DEFAULT_SECURE_RUNTIME = not DEBUG and not IS_DJANGO_RUNSERVER

USE_X_FORWARDED_HOST = to_bool(os.getenv("USE_X_FORWARDED_HOST"), default=DEFAULT_SECURE_RUNTIME)
SECURE_SSL_REDIRECT = to_bool(os.getenv("SECURE_SSL_REDIRECT"), default=DEFAULT_SECURE_RUNTIME)
SESSION_COOKIE_SECURE = to_bool(os.getenv("SESSION_COOKIE_SECURE"), default=DEFAULT_SECURE_RUNTIME)
CSRF_COOKIE_SECURE = to_bool(os.getenv("CSRF_COOKIE_SECURE"), default=DEFAULT_SECURE_RUNTIME)
SECURE_HSTS_SECONDS = int(
    os.getenv("SECURE_HSTS_SECONDS", "31536000" if DEFAULT_SECURE_RUNTIME else "0")
)
SECURE_HSTS_INCLUDE_SUBDOMAINS = to_bool(
    os.getenv("SECURE_HSTS_INCLUDE_SUBDOMAINS"),
    default=DEFAULT_SECURE_RUNTIME,
)
SECURE_HSTS_PRELOAD = to_bool(os.getenv("SECURE_HSTS_PRELOAD"), default=DEFAULT_SECURE_RUNTIME)
SECURE_CONTENT_TYPE_NOSNIFF = to_bool(os.getenv("SECURE_CONTENT_TYPE_NOSNIFF"), default=True)

if IS_DJANGO_RUNSERVER:
    SECURE_SSL_REDIRECT = False
    SESSION_COOKIE_SECURE = False
    CSRF_COOKIE_SECURE = False
    SECURE_HSTS_SECONDS = 0
    SECURE_HSTS_INCLUDE_SUBDOMAINS = False
    SECURE_HSTS_PRELOAD = False

CORS_ALLOWED_ORIGINS = to_list(
    os.getenv("CORS_ALLOWED_ORIGINS"),
    [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
)

CORS_ALLOW_CREDENTIALS = True

CACHE_BACKEND = os.getenv('CACHE_BACKEND', 'locmem').strip().lower()
REDIS_CACHE_URL = normalize_env_value(os.getenv('REDIS_CACHE_URL'))

if CACHE_BACKEND == 'redis' and REDIS_CACHE_URL:
    CACHES = {
        'default': {
            'BACKEND': 'django.core.cache.backends.redis.RedisCache',
            'LOCATION': REDIS_CACHE_URL,
            'TIMEOUT': int(os.getenv('CACHE_DEFAULT_TIMEOUT_SECONDS', '300')),
            'KEY_PREFIX': os.getenv('CACHE_KEY_PREFIX', 'ims'),
        }
    }
else:
    CACHES = {
        'default': {
            'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
            'LOCATION': 'ims-local-cache',
            'TIMEOUT': int(os.getenv('CACHE_DEFAULT_TIMEOUT_SECONDS', '300')),
        }
    }

DASHBOARD_CACHE_TTL_SECONDS = int(os.getenv('DASHBOARD_CACHE_TTL_SECONDS', '60'))
ALERTS_CACHE_TTL_SECONDS = int(os.getenv('ALERTS_CACHE_TTL_SECONDS', '60'))
API_SLOW_REQUEST_THRESHOLD_MS = int(os.getenv('API_SLOW_REQUEST_THRESHOLD_MS', '500'))

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    'DEFAULT_FILTER_BACKENDS': (
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ),
    'DEFAULT_PAGINATION_CLASS': 'config.pagination.StandardResultsSetPagination',
    'PAGE_SIZE': int(os.getenv("PAGE_SIZE", "20")),
    # Prevent ?format=pdf/xlsx from being interpreted as renderer suffix.
    'URL_FORMAT_OVERRIDE': None,
}

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=int(os.getenv("JWT_ACCESS_MINUTES", "20"))),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=int(os.getenv("JWT_REFRESH_DAYS", "1"))),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'UPDATE_LAST_LOGIN': True,
}

LOGIN_MAX_ATTEMPTS = int(os.getenv("LOGIN_MAX_ATTEMPTS", "3"))
LOGIN_ATTEMPT_WINDOW_SECONDS = int(os.getenv("LOGIN_ATTEMPT_WINDOW_SECONDS", "500"))
LOGIN_LOCKOUT_SECONDS = int(os.getenv("LOGIN_LOCKOUT_SECONDS", "500"))

EMAIL_BACKEND = os.getenv("EMAIL_BACKEND", "django.core.mail.backends.smtp.EmailBackend")
EMAIL_HOST = os.getenv("EMAIL_HOST", "smtp.gmail.com")
EMAIL_PORT = int(os.getenv("EMAIL_PORT", "587"))
EMAIL_HOST_USER = normalize_env_value(os.getenv("EMAIL_HOST_USER"))
EMAIL_HOST_PASSWORD = normalize_env_value(os.getenv("EMAIL_HOST_PASSWORD"))
if EMAIL_HOST.lower().endswith("gmail.com"):
    # Gmail app passwords are often pasted with spaces (xxxx xxxx xxxx xxxx).
    EMAIL_HOST_PASSWORD = EMAIL_HOST_PASSWORD.replace(" ", "")
EMAIL_USE_TLS = to_bool(os.getenv("EMAIL_USE_TLS"), default=True)
EMAIL_USE_SSL = to_bool(os.getenv("EMAIL_USE_SSL"), default=False)
EMAIL_TIMEOUT = int(os.getenv("EMAIL_TIMEOUT", "8"))

DEFAULT_FROM_EMAIL = os.getenv("DEFAULT_FROM_EMAIL", EMAIL_HOST_USER or "no-reply@ims.local")
PASSWORD_RESET_OTP_SUBJECT = os.getenv(
    "PASSWORD_RESET_OTP_SUBJECT",
    "Your Inventory Management System OTP",
)
OTP_REQUIRE_REAL_EMAIL_DELIVERY = to_bool(
    os.getenv("OTP_REQUIRE_REAL_EMAIL_DELIVERY"),
    default=True,
)
OTP_REQUEST_FAIL_HARD = to_bool(
    os.getenv("OTP_REQUEST_FAIL_HARD"),
    default=False,
)

PASSWORD_RESET_OTP_EXPIRY_MINUTES = int(os.getenv("PASSWORD_RESET_OTP_EXPIRY_MINUTES", "10"))

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'standard': {
            'format': '%(asctime)s %(levelname)s [%(name)s] %(message)s',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'standard',
        },
    },
    'loggers': {
        'apps.users.auth': {
            'handlers': ['console'],
            'level': os.getenv('AUTH_LOG_LEVEL', 'INFO'),
            'propagate': False,
        },
        'apps.performance.api': {
            'handlers': ['console'],
            'level': os.getenv('PERF_LOG_LEVEL', 'WARNING'),
            'propagate': False,
        },
    },
}
