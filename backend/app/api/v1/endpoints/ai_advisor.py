from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from ....core.database import get_db
from ....services.rag_service import ask_land_advisor

router = APIRouter()


class AskRequest(BaseModel):
    question: str
    municipality: str | None = None
    language: str = "ru"


class SourceItem(BaseModel):
    title: str
    url: str | None = None


class AskResponse(BaseModel):
    answer: str
    sources: list[SourceItem]
    needs_lawyer: bool
    chunks_used: int


@router.post("/ask", response_model=AskResponse)
async def ask_advisor(body: AskRequest, db: AsyncSession = Depends(get_db)):
    """
    RAG-powered land advisor.
    Searches knowledge_chunks by semantic similarity, then asks Claude.
    Returns answer with source attribution + escalation flag.
    """
    result = await ask_land_advisor(
        db=db,
        user_question=body.question,
        municipality=body.municipality,
        language=body.language,
    )
    return AskResponse(**result)


@router.get("/ask", response_model=AskResponse)
async def ask_advisor_get(
    q: str = Query(..., description="User question"),
    municipality: str | None = Query(None),
    lang: str = Query("ru"),
    db: AsyncSession = Depends(get_db),
):
    """GET version for quick browser testing."""
    result = await ask_land_advisor(
        db=db,
        user_question=q,
        municipality=municipality,
        language=lang,
    )
    return AskResponse(**result)
