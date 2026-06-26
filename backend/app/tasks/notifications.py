"""Notification tasks — email, Telegram, reminders."""
from .celery_app import celery_app


@celery_app.task(name="app.tasks.notifications.send_draft_reminders")
def send_draft_reminders():
    """Send 7-day reminder to draft users who haven't registered."""
    # TODO: implement in Phase 3
    pass


@celery_app.task(name="app.tasks.notifications.notify_buyer_match")
def notify_buyer_match(buyer_id: str, land_id: str):
    """Notify buyer when a matching plot appears."""
    # TODO: implement in Phase 4
    pass


@celery_app.task(name="app.tasks.notifications.notify_seller_new_buyer")
def notify_seller_new_buyer(seller_id: str, land_id: str, buyer_count: int):
    """Notify seller when a new buyer matches their plot."""
    # TODO: implement in Phase 4
    pass