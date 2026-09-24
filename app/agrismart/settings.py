"""AgriSmart Django Settings — app/agrismart/settings.py"""
import os
from pathlib import Path
from datetime import timedelta

# Load local environment variables if present
try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).resolve().parent.parent / '.env', override=True)
except ImportError:
    pass

BASE_DIR = Path(__file__).resolve().parent.parent
PROJECT_ROOT = Path(os.environ.get('PROJECT_ROOT', BASE_DIR.parent)).resolve()
MODEL_DIR = Path(os.environ.get('MODEL_DIR', PROJECT_ROOT / 'model')).resolve()

# ── Security & Debug ──────────────────────────────────────────────────────────
SECRET_KEY = os.environ.get("SECRET_KEY")
if not SECRET_KEY:
    # Safe fallback strictly for local development when SECRET_KEY is not set in environment
    SECRET_KEY = "django-insecure-agrismart-dev-key-change-in-production"

DEBUG = os.environ.get("DEBUG", "False") == "True"

# ── ALLOWED_HOSTS ─────────────────────────────────────────────────────────────
ALLOWED_HOSTS = ['localhost', '127.0.0.1', 'testserver']

render_external_hostname = os.environ.get('RENDER_EXTERNAL_HOSTNAME')
if render_external_hostname:
    ALLOWED_HOSTS.append(render_external_hostname)

allowed_hosts_env = os.environ.get('ALLOWED_HOSTS')
if allowed_hosts_env:
    ALLOWED_HOSTS.extend([h.strip() for h in allowed_hosts_env.split(',') if h.strip()])

# ── Application Definition ────────────────────────────────────────────────────
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'whitenoise.runserver_nostatic',
    'django.contrib.staticfiles',
    # Third-party
    'rest_framework',
    'rest_framework_simplejwt',
    'corsheaders',
    # AgriSmart apps
    'accounts',
    'farms',
    'weather',
    'disease',
    'sustainability',
    'dashboard',
    'assistant',
    'irrigation',
    'crops',
    # SIH P0 modules
    'risk',
    'pests',
    'hotspots',
    'expert',
    'followups',
    'feedback',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',  # Must be before CommonMiddleware
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',  # WhiteNoise for static files
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'agrismart.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'agrismart.wsgi.application'

# ── Database (PostgreSQL via DATABASE_URL with SQLite fallback) ───────────────
try:
    import dj_database_url
except ImportError:
    dj_database_url = None

DATABASE_URL = os.environ.get('DATABASE_URL')
if dj_database_url and DATABASE_URL:
    DATABASES = {
        'default': dj_database_url.config(
            default=DATABASE_URL,
            conn_max_age=600,
            conn_health_checks=True,
        )
    }
else:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }

AUTH_USER_MODEL = 'accounts.User'

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'Asia/Kolkata'
USE_I18N = True
USE_TZ = True

# ── Static & Media Files ──────────────────────────────────────────────────────
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# ── Django REST Framework ─────────────────────────────────────────────────────
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
    ],
}

# ── JWT Configuration ─────────────────────────────────────────────────────────
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(days=7),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=30),
    'AUTH_HEADER_TYPES': ('Bearer',),
    'UPDATE_LAST_LOGIN': True,
}

# ── CORS & CSRF ───────────────────────────────────────────────────────────────
# Default allowed origins include local React dev server
CORS_ALLOWED_ORIGINS = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
]

# Support FRONTEND_URL env var (e.g., https://your-frontend.vercel.app)
frontend_url_env = os.environ.get('FRONTEND_URL')
if frontend_url_env:
    for url in frontend_url_env.split(','):
        clean_url = url.strip().rstrip('/')
        if clean_url and clean_url not in CORS_ALLOWED_ORIGINS:
            CORS_ALLOWED_ORIGINS.append(clean_url)

# Support explicit CORS_ALLOWED_ORIGINS env var
cors_env = os.environ.get('CORS_ALLOWED_ORIGINS')
if cors_env:
    for url in cors_env.split(','):
        clean_url = url.strip().rstrip('/')
        if clean_url and clean_url not in CORS_ALLOWED_ORIGINS:
            CORS_ALLOWED_ORIGINS.append(clean_url)

# CSRF Trusted Origins derived from CORS allowed origins
CSRF_TRUSTED_ORIGINS = [
    origin for origin in CORS_ALLOWED_ORIGINS
    if origin.startswith(('http://', 'https://'))
]
csrf_env = os.environ.get('CSRF_TRUSTED_ORIGINS')
if csrf_env:
    for url in csrf_env.split(','):
        clean_url = url.strip().rstrip('/')
        if clean_url and clean_url not in CSRF_TRUSTED_ORIGINS:
            CSRF_TRUSTED_ORIGINS.append(clean_url)

CORS_ALLOW_CREDENTIALS = True

# ── Cache — in-memory for development ─────────────────────────────────────────
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
        'LOCATION': 'agrismart-weather-cache',
    }
}
# Responses cached for 30 minutes to avoid repeated API calls
WEATHER_CACHE_TIMEOUT = int(os.environ.get('WEATHER_CACHE_TIMEOUT', 60 * 30))
WEATHER_API_KEY = os.environ.get('WEATHER_API_KEY', '093b53ee057a4907ab9104918261209')
WEATHER_PROVIDER = os.environ.get('WEATHER_PROVIDER', 'weatherapi')

# ── Groq LLM Configuration ──────────────────────────────────────────────────
GROQ_API_KEY = os.environ.get('GROQ_API_KEY', '')
GROQ_MODEL = os.environ.get('GROQ_MODEL', 'openai/gpt-oss-120b')

# ── Email Configuration ───────────────────────────────────────────────────────
EMAIL_BACKEND = os.environ.get(
    'EMAIL_BACKEND',
    'django.core.mail.backends.console.EmailBackend' if DEBUG else 'django.core.mail.backends.smtp.EmailBackend'
)
EMAIL_HOST = os.environ.get('EMAIL_HOST', '')
EMAIL_PORT = int(os.environ.get('EMAIL_PORT', 587))
EMAIL_USE_TLS = os.environ.get('EMAIL_USE_TLS', 'True') == 'True'
EMAIL_HOST_USER = os.environ.get('EMAIL_HOST_USER', '')
EMAIL_HOST_PASSWORD = os.environ.get('EMAIL_HOST_PASSWORD', '')
DEFAULT_FROM_EMAIL = os.environ.get('DEFAULT_FROM_EMAIL', EMAIL_HOST_USER or 'noreply@agrismart.ai')

# ── Production Security Hardening ─────────────────────────────────────────────
if not DEBUG:
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
    SECURE_SSL_REDIRECT = os.environ.get('SECURE_SSL_REDIRECT', 'False') == 'True'
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_BROWSER_XSS_FILTER = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    X_FRAME_OPTIONS = 'DENY'

# ── Logging ───────────────────────────────────────────────────────────────────
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {'console': {'class': 'logging.StreamHandler'}},
    'root': {'handlers': ['console'], 'level': 'INFO'},
    'loggers': {
        'weather':    {'handlers': ['console'], 'level': 'DEBUG', 'propagate': False},
        'dashboard':  {'handlers': ['console'], 'level': 'INFO',  'propagate': False},
        'irrigation': {'handlers': ['console'], 'level': 'INFO',  'propagate': False},
    },
}
