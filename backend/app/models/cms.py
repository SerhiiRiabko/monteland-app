import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Text, DateTime, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID
from ..core.database import Base


class CmsString(Base):
    """Editable UI texts — buttons, labels, page content. Managed via Admin."""
    __tablename__ = "cms_strings"
    __table_args__ = (
        UniqueConstraint("key", "lang", name="uq_cms_key_lang"),
    )

    id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    key: Mapped[str] = mapped_column(String(200), index=True, nullable=False)
    lang: Mapped[str] = mapped_column(String(5), nullable=False, default="en")
    value: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str | None] = mapped_column(String(500))

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )