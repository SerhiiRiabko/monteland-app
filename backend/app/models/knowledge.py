import uuid
import enum
from datetime import datetime, timezone, date
from typing import Optional
import sqlalchemy as sa
from sqlalchemy import String, Text, Boolean, Date, DateTime, Enum as SAEnum, ForeignKey, Index
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID
from ..core.database import Base

try:
    from pgvector.sqlalchemy import Vector as _Vector
    _VECTOR_AVAILABLE = True
except ImportError:
    _VECTOR_AVAILABLE = False


class SourceType(str, enum.Enum):
    LAW = "law"               # Montenegro laws (ownership, foreigners)
    URBAN_NORM = "urban_norm" # Ki/Kz, DUP/UTU per municipality
    FAQ = "faq"               # Expert Q&A, legalization guides
    LAND_DATA = "land_data"   # Specific plot description


class KnowledgeChunk(Base):
    """RAG knowledge base — chunked documents with vector embeddings."""
    __tablename__ = "knowledge_chunks"

    id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4())
    )

    # Source metadata
    source_type: Mapped[SourceType] = mapped_column(SAEnum(SourceType), nullable=False, index=True)
    source_title: Mapped[str] = mapped_column(String(255), nullable=False)
    source_url: Mapped[str | None] = mapped_column(Text)
    municipality: Mapped[str | None] = mapped_column(String(100), index=True)

    # Content
    content: Mapped[str] = mapped_column(Text, nullable=False)
    content_summary: Mapped[str | None] = mapped_column(Text)

    # Vector embedding (1536 dims — text-embedding-3-small or voyage-3)
    # Falls back to Text on local dev without pgvector
    if _VECTOR_AVAILABLE:
        embedding: Mapped[Optional[list]] = mapped_column(_Vector(1536), nullable=True)
    else:
        embedding: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Optional link to a specific land listing
    land_id: Mapped[str | None] = mapped_column(
        UUID(as_uuid=False), ForeignKey("land_for_sell.id", ondelete="CASCADE"), nullable=True, index=True
    )

    # i18n
    language: Mapped[str] = mapped_column(String(5), default="ru", index=True)

    # Lifecycle
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, index=True)
    valid_from: Mapped[date | None] = mapped_column(Date, nullable=True)
    valid_until: Mapped[date | None] = mapped_column(Date, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    __table_args__ = (
        Index("idx_kc_source_type", "source_type"),
        Index("idx_kc_municipality", "municipality"),
        Index("idx_kc_active", "is_active", postgresql_where=sa.text("is_active = TRUE")),
    )


# Keep old KnowledgeBase/KnowledgeCategory for backwards compatibility with SQLAdmin
class KnowledgeCategory(str, enum.Enum):
    LEGAL = "legal"
    PRICING = "pricing"
    REGIONS = "regions"
    FAQ = "faq"
    PROCESS = "process"


class KnowledgeBase(Base):
    """Legacy — kept for backwards compatibility. Use KnowledgeChunk for RAG."""
    __tablename__ = "knowledge_base"

    id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    category: Mapped[KnowledgeCategory] = mapped_column(
        SAEnum(KnowledgeCategory), index=True, nullable=False
    )
    title: Mapped[str] = mapped_column(String(300), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    lang: Mapped[str] = mapped_column(String(5), default="en", index=True)
    embedding: Mapped[str | None] = mapped_column(sa.Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
