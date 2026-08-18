from config.settings.base import *

DEBUG = True

# Celery tasks run synchronously in local development unless a worker is running.
CELERY_TASK_ALWAYS_EAGER = env.bool("CELERY_TASK_ALWAYS_EAGER", default=True)
CELERY_TASK_EAGER_PROPAGATES = True
