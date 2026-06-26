from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from ....core.database import get_db
from ....models.cms import CmsString

router = APIRouter()


@router.get("/{lang}")
async def get_cms_strings(lang: str, db: AsyncSession = Depends(get_db)):
    """Return all CMS strings for a language as key→value dict."""
    result = await db.execute(
        select(CmsString).where(CmsString.lang == lang)
    )
    rows = result.scalars().all()
    return {row.key: row.value for row in rows}


@router.get("/{lang}/{key}")
async def get_cms_string(lang: str, key: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(CmsString).where(CmsString.lang == lang, CmsString.key == key)
    )
    row = result.scalar_one_or_none()
    if not row:
        return {"key": key, "value": None}
    return {"key": row.key, "value": row.value}