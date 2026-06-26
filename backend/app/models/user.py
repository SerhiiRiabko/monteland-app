import uuid
import enum
from datetime import datetime, timezone
from sqlalchemy import String, Boolean, DateTime, Enum as SAEnum, Text, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from ..core.database import Base


class UserRole(str, enum.Enum):
    ADMIN = "admin"
    SELLER = "seller"
    BUYER = "buyer"
    DRAFT = "draft"


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(SAEnum(UserRole), default=UserRole.BUYER, nullable=False)

    # Profile
    full_name: Mapped[str | None] = mapped_column(String(200))
    preferred_lang: Mapped[str] = mapped_column(String(5), default="en")

    # Contacts
    telegram: Mapped[str | None] = mapped_column(String(100))
    phone: Mapped[str | None] = mapped_column(String(30))
    whatsapp: Mapped[str | None] = mapped_column(String(30))
    viber: Mapped[str | None] = mapped_column(String(30))
    instagram: Mapped[str | None] = mapped_column(String(100))

    # Flags
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    is_dual_role: Mapped[bool] = mapped_column(Boolean, default=False)

    # Email verification
    verification_token: Mapped[str | None] = mapped_column(String(100), index=True)

    # Password reset
    reset_token: Mapped[str | None] = mapped_column(String(100), index=True)
    reset_token_expires: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    last_active_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    # Admin-only: back-references for viewing user's listings and searches
    lands_for_sell = relationship(
        "LandForSell", foreign_keys="[LandForSell.seller_id]",
        lazy="selectin", viewonly=True
    )
    lands_for_buy = relationship(
        "LandForBuy", foreign_keys="[LandForBuy.buyer_id]",
        lazy="selectin", viewonly=True
    )

    def __str__(self) -> str:
        return self.full_name or self.email or self.phone or str(self.id)[:8]


class MessengerChannel(str, enum.Enum):
    WHATSAPP = "whatsapp"
    VIBER = "viber"
    TELEGRAM = "telegram"


class PhoneOTP(Base):
    """Temporary OTP codes for phone-based messenger registration."""
    __tablename__ = "phone_otps"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    phone: Mapped[str] = mapped_column(String(30), index=True, nullable=False)
    channel: Mapped[MessengerChannel] = mapped_column(SAEnum(MessengerChannel), nullable=False)
    code: Mapped[str] = mapped_column(String(6), nullable=False)
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    used: Mapped[bool] = mapped_column(Boolean, default=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    # Telegram-specific: deep-link token + chat_id (filled by bot polling)
    session_token: Mapped[str | None] = mapped_column(String(64), unique=True, index=True)
    telegram_chat_id: Mapped[str | None] = mapped_column(String(30))


class DraftUser(Base):
    """User who left a contact (not email) without full registration."""
    __tablename__ = "draft_users"

    id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    contact_type: Mapped[str] = mapped_column(String(20))   # telegram|phone|viber|whatsapp|instagram
    contact_value: Mapped[str] = mapped_column(String(200), index=True)
    source: Mapped[str] = mapped_column(String(50))         # map_click|search_form|broj_check

    reminder_sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    converted_user_id: Mapped[str | None] = mapped_column(String(36))  # → users.id after conversion

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )