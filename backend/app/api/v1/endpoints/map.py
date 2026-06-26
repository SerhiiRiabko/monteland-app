from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from ....core.database import get_db
from ....core.redis import get_redis, GEO_KEY, get_land_cache
from ....models.land import LandForSell, LandStatus

router = APIRouter()


@router.get("/points")
async def map_points(
    lat: float = Query(..., description="Center latitude"),
    lon: float = Query(..., description="Center longitude"),
    radius_km: float = Query(100, le=500),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns lightweight geo-points for map rendering.
    Uses Redis geo-index for fast lookup, falls back to SQL.
    """
    r = get_redis()

    try:
        ids = await r.geosearch(
            GEO_KEY, longitude=lon, latitude=lat,
            radius=radius_km, unit="km", sort="ASC", count=500,
        )
        if ids:
            points = []
            for land_id in ids:
                data = await get_land_cache(land_id)
                if data and data.get("status") == LandStatus.ACTIVE:
                    points.append({
                        "id": land_id,
                        "lat": float(data["lat"]),
                        "lon": float(data["lon"]),
                        "price_eur": int(data.get("price_eur", 0)),
                        "area_m2": int(data.get("area_m2", 0)),
                        "city": data.get("city", ""),
                        "region": data.get("region", ""),
                        "status": data.get("status", "active"),
                    })
            return {"points": points, "source": "redis"}
    except Exception:
        pass  # Fall back to SQL

    # SQL fallback
    result = await db.execute(
        select(
            LandForSell.id, LandForSell.lat, LandForSell.lon,
            LandForSell.price_eur, LandForSell.area_m2,
            LandForSell.city, LandForSell.region,
        ).where(
            LandForSell.status == LandStatus.ACTIVE,
            LandForSell.lat.isnot(None),
            LandForSell.lon.isnot(None),
        ).limit(500)
    )
    rows = result.all()
    return {
        "points": [
            {"id": r.id, "lat": r.lat, "lon": r.lon,
             "price_eur": r.price_eur, "area_m2": r.area_m2,
             "city": r.city, "region": r.region, "status": "active"}
            for r in rows
        ],
        "source": "sql",
    }