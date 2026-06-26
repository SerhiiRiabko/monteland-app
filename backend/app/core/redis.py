from typing import Any
import redis.asyncio as aioredis
from .config import settings

_pool: aioredis.Redis | None = None
_redis_available: bool | None = None  # None = not yet checked


def get_redis() -> aioredis.Redis | None:
    """Returns Redis client, or None if Redis is not available (graceful degradation)."""
    global _pool, _redis_available
    if _redis_available is False:
        return None
    if _pool is None:
        _pool = aioredis.from_url(
            settings.REDIS_URL,
            encoding="utf-8",
            decode_responses=True,
        )
    return _pool


async def close_redis():
    global _pool
    if _pool:
        await _pool.aclose()
        _pool = None


# ── Land geo-cache helpers ────────────────────────────────────────────────────

GEO_KEY = "land:geo"


async def _check_available() -> bool:
    global _redis_available
    r = get_redis()
    if r is None:
        return False
    try:
        await r.ping()
        _redis_available = True
        return True
    except Exception:
        _redis_available = False
        print("[redis] not available — using SQL fallback for map")
        return False


async def geo_add(land_id: str, lon: float, lat: float):
    r = get_redis()
    if r:
        try:
            await r.geoadd(GEO_KEY, [lon, lat, land_id])
        except Exception:
            pass


async def geo_remove(land_id: str):
    r = get_redis()
    if r:
        try:
            await r.zrem(GEO_KEY, land_id)
        except Exception:
            pass


async def set_land_cache(land_id: str, data: dict[str, Any]):
    r = get_redis()
    if r:
        try:
            await r.hset(f"land:{land_id}", mapping={k: str(v) for k, v in data.items()})
        except Exception:
            pass


async def get_land_cache(land_id: str) -> dict | None:
    r = get_redis()
    if not r:
        return None
    try:
        data = await r.hgetall(f"land:{land_id}")
        return data if data else None
    except Exception:
        return None


async def delete_land_cache(land_id: str):
    r = get_redis()
    if r:
        try:
            await r.delete(f"land:{land_id}")
            await r.zrem(GEO_KEY, land_id)
        except Exception:
            pass


async def get_lands_in_bounds(lon: float, lat: float, radius_km: float = 100) -> list[str]:
    r = get_redis()
    if not r:
        return []
    try:
        return await r.geosearch(
            GEO_KEY, longitude=lon, latitude=lat,
            radius=radius_km, unit="km", sort="ASC",
        )
    except Exception:
        return []