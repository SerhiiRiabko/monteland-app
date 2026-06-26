import uuid
import enum
from datetime import datetime, timezone
from sqlalchemy import String, Integer, Float, Boolean, DateTime, Enum as SAEnum, Text, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from ..core.database import Base


class LandStatus(str, enum.Enum):
    PENDING_REVIEW = "pending_review"   # lead submitted without auth — manager reviews
    ACTIVE = "active"
    SOLD = "sold"
    SUSPENDED = "suspended"


class LandForSell(Base):
    """Plot for sale — created by Seller."""
    __tablename__ = "land_for_sell"

    id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    seller_id: Mapped[str | None] = mapped_column(
        UUID(as_uuid=False), ForeignKey("users.id", ondelete="SET NULL"), index=True, nullable=True
    )

    # Cadastral identification (key field for Montenegro)
    broj: Mapped[str | None] = mapped_column(String(50), index=True)

    # Location
    region: Mapped[str | None] = mapped_column(String(100), index=True)
    city: Mapped[str | None] = mapped_column(String(100), index=True)
    address: Mapped[str | None] = mapped_column(String(300))
    lat: Mapped[float | None] = mapped_column(Float)
    lon: Mapped[float | None] = mapped_column(Float)

    # Plot details
    area_m2: Mapped[int | None] = mapped_column(Integer, index=True)
    price_eur: Mapped[int | None] = mapped_column(Integer, index=True)
    description: Mapped[str | None] = mapped_column(Text)

    # Media — list of relative paths/URLs
    photos: Mapped[list | None] = mapped_column(JSON, default=list)

    # Contact override (may differ from user's profile contacts)
    contacts: Mapped[dict | None] = mapped_column(JSON, default=dict)

    # Status
    status: Mapped[LandStatus] = mapped_column(
        SAEnum(LandStatus), default=LandStatus.ACTIVE, index=True
    )

    # Admin notes
    admin_notes: Mapped[str | None] = mapped_column(Text)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    seller = relationship("User", foreign_keys=[seller_id], lazy="selectin")

    def __str__(self) -> str:
        parts = [self.region or "—", self.city or "—"]
        if self.area_m2:
            parts.append(f"{self.area_m2}м²")
        if self.price_eur:
            parts.append(f"€{self.price_eur:,}")
        return " · ".join(parts) + f" [{self.status}]"


class LandForBuy(Base):
    """Purchase request — created by Buyer."""
    __tablename__ = "land_for_buy"

    id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    buyer_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )

    # Search criteria
    region: Mapped[str | None] = mapped_column(String(100), index=True)
    cities: Mapped[list | None] = mapped_column(JSON, default=list)   # multi-select
    area_min_m2: Mapped[int | None] = mapped_column(Integer)
    area_max_m2: Mapped[int | None] = mapped_column(Integer)
    price_min_eur: Mapped[int | None] = mapped_column(Integer)
    price_max_eur: Mapped[int | None] = mapped_column(Integer)

    # Preferred notification channels
    channels: Mapped[dict | None] = mapped_column(JSON, default=dict)

    is_active: Mapped[bool] = mapped_column(Boolean, default=True, index=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    buyer = relationship("User", foreign_keys=[buyer_id], lazy="selectin")

    def __str__(self) -> str:
        region = self.region or "будь-який регіон"
        price = f"€{self.price_min_eur or 0}–€{self.price_max_eur or '∞'}"
        active = "✓" if self.is_active else "✗"
        return f"[{active}] {region} {price}"