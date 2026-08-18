from config.settings.base import *

DEBUG = False

# Strict transport security in production.
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SECURE_SSL_REDIRECT = env.bool("DJANGO_SECURE_SSL_REDIRECT", default=True)
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
CSRF_TRUSTED_ORIGINS = env.list("CSRF_TRUSTED_ORIGINS", default=[])

# Redis-backed cache for production.
from django.core.cache.backends.redis import RedisCache  # noqa: F401

CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.redis.RedisCache",
        "LOCATION": env("REDIS_URL", default="redis://localhost:6379/0"),
    }
}

# Celery broker/result derived from the same Redis on Render.
CELERY_BROKER_URL = env(
    "CELERY_BROKER_URL",
    default=f"{env('REDIS_URL', default='redis://localhost:6379/0')}/1",
)
CELERY_RESULT_BACKEND = env(
    "CELERY_RESULT_BACKEND",
    default=f"{env('REDIS_URL', default='redis://localhost:6379/0')}/2",
)

# Production email requires an SMTP provider (Render does not ship one).
EMAIL_BACKEND = env(
    "EMAIL_BACKEND", default="django.core.mail.backends.smtp.EmailBackend"
)
