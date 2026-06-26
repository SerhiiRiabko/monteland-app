from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel
from typing import Annotated

from ....core.database import get_db
from ....core.deps import get_current_user, get_optional_user
from ....core.redis import set_land_cache, delete_land_cache, geo_add
from ....models.land import LandForSell, LandStatus, LandForBuy
from ....models.user import User

router = APIRouter()


# ── Schemas ───────────────────────────────────────────────────────────────────

class LandForSellCreate(BaseModel):
    broj: str | None = None
    region: str | None = None
    city: str | None = None
    address: str | None = None
    lat: float | None = None
    lon: float | None = None
    area_m2: int | None = None
    price_eur: int | None = None
    description: str | None = None
    contacts: dict | None = None


class LandForSellOut(BaseModel):
    id: str
    seller_id: str
    broj: str | None
    region: str | None
    city: str | None
    area_m2: int | None
    price_eur: int | None
    status: LandStatus
    photos: list | None
    created_at: str

    model_config = {"from_attributes": True}


class LandForBuyCreate(BaseModel):
    region: str | None = None
    cities: list[str] = []
    area_min_m2: int | None = None
    area_max_m2: int | None = None
    price_min_eur: int | None = None
    price_max_eur: int | None = None
    channels: dict | None = None


# ── Endpoints — LandForSell ───────────────────────────────────────────────────

@router.post("/sell", response_model=LandForSellOut, status_code=status.HTTP_201_CREATED)
async def create_listing(
    data: LandForSellCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    listing = LandForSell(seller_id=user.id, **data.model_dump())
    db.add(listing)
    await db.flush()
    await db.refresh(listing)

    # Sync to Redis geo-cache
    if listing.lat and listing.lon:
        await geo_add(listing.id, listing.lon, listing.lat)
        await set_land_cache(listing.id, {
            "region": listing.region or "",
            "city": listing.city or "",
            "area_m2": listing.area_m2 or 0,
            "price_eur": listing.price_eur or 0,
            "status": listing.status,
            "lat": listing.lat,
            "lon": listing.lon,
        })

    return listing


@router.get("/sell", response_model=list[LandForSellOut])
async def list_listings(
    region: str | None = Query(None),
    city: str | None = Query(None),
    area_min: int | None = Query(None),
    area_max: int | None = Query(None),
    price_min: int | None = Query(None),
    price_max: int | None = Query(None),
    status: LandStatus = Query(LandStatus.ACTIVE),
    limit: Annotated[int, Query(le=100)] = 50,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
):
    q = select(LandForSell).where(LandForSell.status == status)
    if region:
        q = q.where(LandForSell.region == region)
    if city:
        q = q.where(LandForSell.city == city)
    if area_min:
        q = q.where(LandForSell.area_m2 >= area_min)
    if area_max:
        q = q.where(LandForSell.area_m2 <= area_max)
    if price_min:
        q = q.where(LandForSell.price_eur >= price_min)
    if price_max:
        q = q.where(LandForSell.price_eur <= price_max)

    result = await db.execute(q.limit(limit).offset(offset))
    return result.scalars().all()


@router.patch("/sell/{land_id}/status")
async def update_status(
    land_id: str,
    new_status: LandStatus,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    land = await db.get(LandForSell, land_id)
    if not land:
        raise HTTPException(404, "Not found")
    if land.seller_id != user.id and user.role.value != "admin":
        raise HTTPException(403, "Not your listing")

    land.status = new_status
    if new_status != LandStatus.ACTIVE:
        await delete_land_cache(land_id)
    return {"status": new_status}


# ── Endpoints — LandForBuy ────────────────────────────────────────────────────

@router.post("/buy", status_code=status.HTTP_201_CREATED)
async def create_buy_request(
    data: LandForBuyCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    req = LandForBuy(buyer_id=user.id, **data.model_dump())
    db.add(req)
    await db.flush()

    # Count matching active listings for "wow moment"
    q = select(func.count(LandForSell.id)).where(LandForSell.status == LandStatus.ACTIVE)
    if data.region:
        q = q.where(LandForSell.region == data.region)
    if data.area_min_m2:
        q = q.where(LandForSell.area_m2 >= data.area_min_m2)
    if data.area_max_m2:
        q = q.where(LandForSell.area_m2 <= data.area_max_m2)
    if data.price_max_eur:
        q = q.where(LandForSell.price_eur <= data.price_max_eur)

    count = await db.scalar(q) or 0
    return {"id": req.id, "matching_listings": count}


# ── Simple lead (no auth — manager reviews via SQLAdmin) ─────────────────────

class LeadCreate(BaseModel):
    name: str
    phone: str
    location: str                        # free text: "Будва, Режевичи" or "Kotor region"
    area_m2: int | None = None
    source: str = "whatsapp"             # "whatsapp" | "callback" | "form"


class LeadResponse(BaseModel):
    id: str


@router.post("/lead", response_model=LeadResponse, status_code=status.HTTP_201_CREATED)
async def create_lead(data: LeadCreate, db: AsyncSession = Depends(get_db)):
    """
    Anonymous lead from the simple sell form.
    Creates a LandForSell with status=pending_review, no seller_id.
    Manager processes it via SQLAdmin.
    WhatsApp URL is built client-side — no number needed here.
    """
    lead = LandForSell(
        seller_id=None,
        city=data.location,
        area_m2=data.area_m2,
        status=LandStatus.PENDING_REVIEW,
        contacts={
            "name": data.name,
            "phone": data.phone,
            "source": data.source,
        },
        admin_notes=f"Lead via {data.source} — {data.name} / {data.phone}",
    )
    db.add(lead)
    await db.flush()
    await db.refresh(lead)
    return LeadResponse(id=lead.id)


# ── Price analytics (Searcher — anonymous) ─────────────────────────────────────

@router.get("/analytics/price")
async def price_analytics(
    region: str | None = Query(None),
    city: str | None = Query(None),
    area_min: int | None = Query(None),
    area_max: int | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """Returns min/max/median prices for anonymous Searcher."""
    q = select(LandForSell.price_eur).where(
        LandForSell.status == LandStatus.ACTIVE,
        LandForSell.price_eur.isnot(None),
    )
    if region:
        q = q.where(LandForSell.region == region)
    if city:
        q = q.where(LandForSell.city == city)
    if area_min:
        q = q.where(LandForSell.area_m2 >= area_min)
    if area_max:
        q = q.where(LandForSell.area_m2 <= area_max)

    result = await db.execute(q)
    prices = sorted([r[0] for r in result.all()])

    if len(prices) < 3:
        return {"count": len(prices), "message": "Not enough data"}

    mid = len(prices) // 2
    median = prices[mid] if len(prices) % 2 else (prices[mid - 1] + prices[mid]) // 2

    return {
        "count": len(prices),
        "min": prices[0],
        "max": prices[-1],
        "median": median,
    }