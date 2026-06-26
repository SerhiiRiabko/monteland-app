from .celery_app import celery_app


@celery_app.task(name="app.tasks.matching.run_matching")
def run_matching(land_id: int) -> dict:
    """Placeholder for future buyer-seller matching logic."""
    return {"status": "not_implemented", "land_id": land_id}
