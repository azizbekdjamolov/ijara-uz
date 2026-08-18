import os
from datetime import timedelta

from celery import Celery
from celery.schedules import crontab

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.dev")

app = Celery("ijara")
app.config_from_object("django.conf:settings", namespace="CELERY")
app.autodiscover_tasks()

app.conf.beat_schedule = {
    "expire-overdue-listings": {
        "task": "apps.ai.tasks.expire_listings_task",
        "schedule": crontab(minute=0, hour=3),
    },
    "requeue-stuck-ai-listings": {
        "task": "apps.ai.tasks.requeue_stuck_listings_task",
        "schedule": timedelta(minutes=15),
    },
}
