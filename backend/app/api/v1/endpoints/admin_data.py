"""Admin-only API endpoints (separate from SQLAdmin UI)."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel

from ....core.database import get_db
from ....core.deps import require_admin
from ....models.land import LandForSell, LandStatus, LandForBuy
from ....models.user import User
from ....models.ticket import AssistantTicket, TicketStatus

router = APIRouter()


@router.get("/stats")
async def dashboard_stats(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    """Quick stats for admin dashboard."""
    users_count = await db.scalar(select(func.count(User.id)))
    active_listings = await db.scalar(
        select(func.count(LandForSell.id)).where(LandForSell.status == LandStatus.ACTIVE)
    )
    open_tickets = await db.scalar(
        select(func.count(AssistantTicket.id)).where(AssistantTicket.status == TicketStatus.NEW)
    )
    return {
        "users": users_count,
        "active_listings": active_listings,
        "open_tickets": open_tickets,
    }


class LandBulkCreate(BaseModel):
    """Bulk data entry for plots — columns will be extended later."""
    items: list[dict]


@router.post("/lands/bulk", status_code=201)
async def bulk_create_lands(
    data: LandBulkCreate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """Bulk import plots (CSV/form data entry from admin)."""
    created = []
    for item in data.items:
        land = LandForSell(seller_id=admin.id, **{
            k: v for k, v in item.items()
            if k in LandForSell.__table__.columns.keys()
        })
        db.add(land)
        created.append(land)
    await db.flush()
    return {"created": len(created)}