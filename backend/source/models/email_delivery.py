import uuid
from datetime import datetime
from enum import Enum

from sqlalchemy import JSON, DateTime, Enum as SQLEnum, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from source.core.database import Base


class EmailDeliveryStatus(str, Enum):
    PROCESSED = "processed"
    DELIVERED = "delivered"


class EmailDelivery(Base):
    __tablename__ = "email_deliveries"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)

    recipient_user_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"), nullable=True, index=True)
    recipient_email: Mapped[str] = mapped_column(String(255), index=True)

    subject: Mapped[str] = mapped_column(String(200))
    body: Mapped[str] = mapped_column(Text)

    email_type: Mapped[str] = mapped_column(String(50), index=True)
    status: Mapped[EmailDeliveryStatus] = mapped_column(
        SQLEnum(
            EmailDeliveryStatus,
            name="email_delivery_status",
            values_callable=lambda enum_cls: [member.value for member in enum_cls],
        ),
        default=EmailDeliveryStatus.PROCESSED,
    )

    source_event_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("outbox_events.id"), nullable=True, index=True)
    delivery_metadata: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    delivered_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, index=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    recipient_user = relationship("User", back_populates="email_deliveries")
