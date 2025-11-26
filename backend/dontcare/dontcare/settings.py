"""
dontcare 프로젝트의 Django 설정 파일

Django 5.2.6을 사용하여 'django-admin startproject'로 생성되었습니다.

이 파일에 대한 자세한 정보는 다음을 참조하세요:
https://docs.djangoproject.com/en/5.2/topics/settings/

모든 설정과 값의 전체 목록은 다음을 참조하세요:
https://docs.djangoproject.com/en/5.2/ref/settings/
"""

from pathlib import Path
from datetime import timedelta
from urllib.parse import urlparse
import environ
import os

# 프로젝트 내부의 경로는 다음과 같이 구성합니다: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# environ 초기화
env = environ.Env()
environ.Env.read_env(os.path.join(BASE_DIR, ".env"))


# 빠른 시작 개발 설정 - 프로덕션에 적합하지 않음
# 자세한 내용은 https://docs.djangoproject.com/en/5.2/howto/deployment/checklist/ 참조

SECRET_KEY = env("SECRET_KEY")
DEBUG = env.bool("DEBUG", default=False)
# URL 구성
APPEND_SLASH = True
ALLOWED_HOSTS = env.list("ALLOWED_HOSTS")


# 애플리케이션 정의

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.sites",
    # 로컬 앱
    "accounts",
    "portfolio",
    "crawlings",
    "stocks",
    # REST 프레임워크 및 JWT
    "rest_framework",
    "rest_framework.authtoken",
    "rest_framework_simplejwt.token_blacklist",
    "dj_rest_auth",
    "dj_rest_auth.registration",
    "allauth",
    "allauth.account",
    "allauth.socialaccount",
    # 기본 contrib
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",  # ★ 추가: CORS
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",  # ★ 추가: CSRF
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "allauth.account.middleware.AccountMiddleware",
]

ROOT_URLCONF = "dontcare.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "dontcare.wsgi.application"


# 데이터베이스
# https://docs.djangoproject.com/en/5.2/ref/settings/#databases

# DATABASES = {
#     'default': {
#         'ENGINE': 'django.db.backends.sqlite3',
#         'NAME': BASE_DIR / 'db.sqlite3',
#     }
# }


DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": env("DB_NAME"),
        "USER": env("DB_USER"),
        "PASSWORD": env("DB_PASSWORD"),
        "HOST": env("DB_HOST"),
        "PORT": env("DB_PORT"),
        "OPTIONS": {
            "options": "-c client_encoding=UTF8",
        },
    }
}


# 비밀번호 검증
# https://docs.djangoproject.com/en/5.2/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.CommonPasswordValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.NumericPasswordValidator",
    },
]


# 국제화
# https://docs.djangoproject.com/en/5.2/topics/i18n/

LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True


# 정적 파일
# https://docs.djangoproject.com/en/5.2/howto/static-files/

STATIC_URL = "static/"

# 미디어 파일 (업로드된 파일)
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"


# 기본 기본 키 필드 타입
# https://docs.djangoproject.com/en/5.2/ref/settings/#default-auto-field

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"


# 커스텀 사용자 모델
AUTH_USER_MODEL = "accounts.User"


# Sites 프레임워크
SITE_ID = 1

# 인증 백엔드
AUTHENTICATION_BACKENDS = [
    "django.contrib.auth.backends.ModelBackend",
    "allauth.account.auth_backends.AuthenticationBackend",
]

# Allauth 설정
ACCOUNT_UNIQUE_EMAIL = True
ACCOUNT_USER_MODEL_USERNAME_FIELD = "email"
ACCOUNT_LOGIN_METHODS = {"email"}
ACCOUNT_SIGNUP_FIELDS = ["email*", "password1*", "password2*"]
ACCOUNT_EMAIL_VERIFICATION = "none"  # OTP 인증으로 대체하므로 mandatory 해제
ACCOUNT_ADAPTER = "accounts.adapters.CustomAccountAdapter"

# JWT 및 인증 설정
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=env.int("JWT_ACCESS_TOKEN_LIFETIME")),
    "REFRESH_TOKEN_LIFETIME": timedelta(minutes=env.int("JWT_REFRESH_TOKEN_LIFETIME")),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "UPDATE_LAST_LOGIN": True,
    "AUTH_HEADER_TYPES": ("Bearer",),
    "AUTH_HEADER_NAME": "HTTP_AUTHORIZATION",
    "USER_ID_FIELD": "id",
    "USER_ID_CLAIM": "user_id",
    "TOKEN_OBTAIN_SERIALIZER": "accounts.serializers.JWTLoginSerializer",
    "TOKEN_REFRESH_SERIALIZER": "rest_framework_simplejwt.serializers.TokenRefreshSerializer",
    "TOKEN_VERIFY_SERIALIZER": "rest_framework_simplejwt.serializers.TokenVerifySerializer",
}

REST_USE_JWT = True
REST_AUTH = {
    "USE_JWT": True,
    "JWT_AUTH_COOKIE": None,  # Access token은 쿠키에 저장하지 않음 (메모리 저장)
    "JWT_AUTH_REFRESH_COOKIE": "refresh",  # Refresh token은 httpOnly Cookie에 저장
    "JWT_AUTH_REFRESH_COOKIE_PATH": "/",  # 쿠키 경로 설정 (로그아웃 시 삭제를 위해 필요)
    "JWT_AUTH_COOKIE_DOMAIN": None,  # 쿠키 도메인 설정 (로그아웃 시 삭제를 위해 필요)
    "JWT_AUTH_HTTPONLY": True,  # Refresh token을 httpOnly Cookie에 저장
    "JWT_AUTH_SAMESITE": "Lax",
    "JWT_AUTH_SECURE": env.bool("JWT_AUTH_SECURE"),
    "JWT_TOKEN_CLAIMS_SERIALIZER": "accounts.serializers.JWTLoginSerializer",  # JWT 토큰 생성 시 사용할 serializer
    "JWT_SERIALIZER": "accounts.serializers.CustomJWTSerializer",  # JWT 응답 생성 시 사용할 serializer
    "USER_DETAILS_SERIALIZER": "accounts.serializers.CustomUserDetailsSerializer",  # /auth/user/ 엔드포인트 커스터마이징
    "REGISTER_SERIALIZER": "accounts.serializers.CustomRegisterSerializer",
    "SIGNUP_FIELDS": {
        "email": {"required": True, "write_only": True},
        "name": {"required": False, "write_only": True},
        "password1": {"required": True, "write_only": True},
        "password2": {"required": True, "write_only": True},
    },
    "OLD_PASSWORD_FIELD_ENABLED": True,  # 비밀번호 변경 시 현재 비밀번호 검증 활성화
}


# 리다이렉트 URL
LOGIN_REDIRECT_URL = "/"
ACCOUNT_LOGOUT_REDIRECT_URL = "/"


# 개발용 이메일 백엔드
EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
EMAIL_HOST = env("EMAIL_HOST")
EMAIL_PORT = env("EMAIL_PORT")
EMAIL_USE_TLS = env.bool("EMAIL_USE_TLS")
EMAIL_HOST_USER = env("EMAIL_HOST_USER")
EMAIL_HOST_PASSWORD = env("EMAIL_HOST_PASSWORD")
DEFAULT_FROM_EMAIL = env("DEFAULT_FROM_EMAIL")

# ───────────── 쿠키 인증용 CORS/CSRF (중요) ─────────────
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOWED_ORIGINS = env.list("CORS_ALLOWED_ORIGINS")

# CSRF 쿠키: JS가 읽어 헤더에 실어 보낼 수 있게(개발 편의)
CSRF_TRUSTED_ORIGINS = env.list("CSRF_TRUSTED_ORIGINS")
CSRF_COOKIE_NAME = "csrftoken"
CSRF_COOKIE_HTTPONLY = False
CSRF_COOKIE_SECURE = env.bool("CSRF_COOKIE_SECURE")

# 세션 쿠키(로그인 세션은 안 쓰더라도, 일관성 있게 보안 옵션 설정)
SESSION_COOKIE_SECURE = env.bool("SESSION_COOKIE_SECURE")
SESSION_COOKIE_HTTPONLY = env.bool("SESSION_COOKIE_HTTPONLY")

# ───────────── Redis 캐시 설정 (OTP 저장용) ─────────────
# Redis URL 구성 (환경변수 필수)
REDIS_URL = env("REDIS_URL")

CACHES = {
    "default": {
        "BACKEND": "django_redis.cache.RedisCache",
        "LOCATION": REDIS_URL,
        "OPTIONS": {
            "CLIENT_CLASS": "django_redis.client.DefaultClient",
            "SOCKET_CONNECT_TIMEOUT": env.int("REDIS_CONNECT_TIMEOUT"),
            "SOCKET_TIMEOUT": env.int("REDIS_SOCKET_TIMEOUT"),
            "CONNECTION_POOL_KWARGS": {
                "max_connections": env.int("REDIS_MAX_CONNECTIONS"),
                "retry_on_timeout": True,
                "socket_keepalive": True,
                "socket_keepalive_options": {},
            },
            "SERIALIZER": "django_redis.serializers.json.JSONSerializer",
            "COMPRESSOR": "django_redis.compressors.zlib.ZlibCompressor",
            "IGNORE_EXCEPTIONS": env.bool("REDIS_IGNORE_EXCEPTIONS"),
        },
    }
}

# Redis 연결 예외 무시 (선택사항)
DJANGO_REDIS_IGNORE_EXCEPTIONS = env.bool("DJANGO_REDIS_IGNORE_EXCEPTIONS")
