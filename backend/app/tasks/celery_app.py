from celery import Celery
from ..core.config import settings

celery_app = Celery(
    "monteland",
    broker=settings.REDIS_URL.replace("/0", "/1"),  # separate DB for Celery
    backend=settings.REDIS_URL.replace("/0", "/2"),
    include=["app.tasks.notifications", "app.tasks.matching"],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Europe/Podgorica",
    enable_utc=True,
    task_routes={
        "app.tasks.notifications.*": {"queue": "notifications"},
        "app.tasks.matching.*": {"queue": "default"},
    },
    beat_schedule={
        "draft-user-reminders": {
            "task": "app.tasks.notifications.send_draft_reminders",
            "schedule": 86400,  # once a day
        },
    },
)