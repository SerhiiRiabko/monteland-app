"""RAG service — semantic search over knowledge_chunks + Claude answer generation."""
from __future__ import annotations

import logging
from typing import Any

import anthropic
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..core.config import settings
from ..models.knowledge import KnowledgeChunk

logger = logging.getLogger(__name__)

# ── Embedding client ───────────────────────────────────────────────────────────

async def get_embedding(text: str) -> list[float]:
    """
    Returns a 1536-dim vector for the given text.
    Uses OpenAI text-embedding-3-small.
    Falls back to a zero vector if API key is not configured (DEV mode).
    """
    if not settings.OPENAI_API_KEY:
        logger.warning("OPENAI_API_KEY not set — returning zero embedding (DEV mode)")
        return [0.0] * settings.EMBEDDING_DIM

    try:
        import openai
        client = openai.AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        response = await client.embeddings.create(
            model=settings.EMBEDDING_MODEL,
            input=text,
        )
        return response.data[0].embedding
    except Exception as e:
        logger.error(f"Embedding error: {e}")
        return [0.0] * settings.EMBEDDING_DIM


# ── Semantic search ────────────────────────────────────────────────────────────

async def search_relevant_chunks(
    db: AsyncSession,
    query: str,
    municipality: str | None = None,
    source_types: list[str] | None = None,
    language: str = "ru",
    top_k: int = 5,
) -> list[KnowledgeChunk]:
    """
    Find the most semantically relevant knowledge chunks for a given query.
    Pre-filters by municipality and source_type before vector comparison.
    """
    query_embedding = await get_embedding(query)

    stmt = (
        select(KnowledgeChunk)
        .where(KnowledgeChunk.is_active == True)  # noqa: E712
        .where(KnowledgeChunk.language == language)
    )

    if municipality:
        from sqlalchemy import or_
        stmt = stmt.where(
            or_(
                KnowledgeChunk.municipality == municipality,
                KnowledgeChunk.municipality.is_(None),   # country-wide norms always included
            )
        )

    if source_types:
        stmt = stmt.where(KnowledgeChunk.source_type.in_(source_types))

    # Vector similarity — only works with pgvector installed
    try:
        stmt = stmt.order_by(
            KnowledgeChunk.embedding.cosine_distance(query_embedding)
        ).limit(top_k)
    except Exception:
        # pgvector not available locally — return first N rows
        stmt = stmt.limit(top_k)

    result = await db.execute(stmt)
    return list(result.scalars().all())


# ── Claude RAG answer ──────────────────────────────────────────────────────────

SYSTEM_PROMPT = """Ты — AI-консультант платформы MonteLand по земельным вопросам в Черногории.

Правила:
1. Отвечай ТОЛЬКО на основе предоставленного контекста из базы знаний.
2. Для каждого факта о законе или нормативе обязательно указывай источник в формате [Источник: название].
3. Если в контексте недостаточно информации — прямо скажи об этом и предложи связаться с юристом платформы.
4. НИКОГДА не придумывай статьи законов, нормативы (Ki, Kz, DUP, UTU) или цифры, которых нет в контексте.
5. Отвечай на том языке, на котором задан вопрос (русский, украинский или английский).
6. Если вопрос выходит за рамки земельного рынка Черногории — вежливо перенаправь.
"""

ESCALATION_PHRASES = [
    "недостаточно информации",
    "рекомендую уточнить у юриста",
    "обратитесь к юристу",
    "not enough information",
    "consult a lawyer",
]


async def ask_land_advisor(
    db: AsyncSession,
    user_question: str,
    municipality: str | None = None,
    land_context: dict[str, Any] | None = None,
    language: str = "ru",
) -> dict[str, Any]:
    """
    Full RAG pipeline:
    1. Semantic search in knowledge_chunks
    2. Build context + prompt
    3. Ask Claude
    4. Return answer + sources + escalation flag

    Returns:
        {
          "answer": str,
          "sources": [{"title": str, "url": str | None}],
          "needs_lawyer": bool,
          "chunks_used": int,
        }
    """
    if not settings.ANTHROPIC_API_KEY:
        return {
            "answer": "AI-консультант не настроен. Пожалуйста, свяжитесь с нами напрямую.",
            "sources": [],
            "needs_lawyer": True,
            "chunks_used": 0,
        }

    chunks = await search_relevant_chunks(
        db, user_question, municipality=municipality, language=language
    )

    if not chunks:
        return {
            "answer": (
                "У меня нет информации по этому вопросу в базе знаний. "
                "Рекомендую уточнить у нашего юриста — он ответит в течение дня."
            ),
            "sources": [],
            "needs_lawyer": True,
            "chunks_used": 0,
        }

    # Build context blocks with source attribution
    context_parts: list[str] = []
    sources: list[dict] = []
    seen_titles: set[str] = set()

    for chunk in chunks:
        context_parts.append(f"[Источник: {chunk.source_title}]\n{chunk.content}")
        if chunk.source_title not in seen_titles:
            sources.append({"title": chunk.source_title, "url": chunk.source_url})
            seen_titles.add(chunk.source_title)

    context_text = "\n\n---\n\n".join(context_parts)

    land_info = ""
    if land_context:
        land_info = (
            f"\n\nДанные участка:\n"
            f"Площадь: {land_context.get('area_m2')} м², "
            f"Регион: {land_context.get('region')}, "
            f"Город: {land_context.get('city')}"
        )
        if land_context.get("ki"):
            land_info += f", Ki: {land_context['ki']}, Kz: {land_context.get('kz')}"

    user_message = (
        f"Контекст из базы знаний:\n\n{context_text}"
        f"{land_info}\n\n"
        f"Вопрос: {user_question}"
    )

    client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)

    response = client.messages.create(
        model=settings.AI_MODEL_QUALITY,
        max_tokens=1024,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_message}],
    )

    answer_text: str = response.content[0].text

    needs_lawyer = any(phrase in answer_text.lower() for phrase in ESCALATION_PHRASES)

    return {
        "answer": answer_text,
        "sources": sources,
        "needs_lawyer": needs_lawyer,
        "chunks_used": len(chunks),
    }
