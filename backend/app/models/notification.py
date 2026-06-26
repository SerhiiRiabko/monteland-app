import uuid
import enum
from datetime import datetime, timezone
from sqlalchemy import String, DateTime, Enum as SAEnum, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID
from ..core.database import Base


class NotificationChannel(str, enum.Enum):
    EMAIL = "email"
    TELEGRAM = "telegram"
    PUSH = "push"


class NotificationType(str, enum.Enum):
    MATCH_FOUND = "match_found"       # new plot matches buyer's request
    NEW_BUYER = "new_buyer"           # new buyer matches seller's plot
    REMINDER = "reminder"             # 7-day reminder for draft user
    MERGE_SUGGESTION = "merge_suggestion"
    EMAIL_VERIFICATION = "email_verification"
    PASSWORD_RESET = "password_reset"


class NotificationLog(Base):
    __tablename__ = "notifications_log"

    id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    recipient_id: Mapped[str | None] = mapped_column(
        UUID(as_uuid=False), ForeignKey("users.id", ondelete="SET NULL"), index=True
    )
    type: Mapped[NotificationType] = mapped_column(SAEnum(NotificationType), nullable=False)
    channel: Mapped[NotificationChannel] = mapped_column(SAEnum(NotificationChannel), nullable=False)
    subject: Mapped[str | None] = mapped_column(String(300))
    body: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(20), default="sent")  # sent|failed
    sent_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )