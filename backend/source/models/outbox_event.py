import uuid
from datetime import datetime
from sqlalchemy import (
    String,
    DateTime,
    JSON,
    Integer,
)
from sqlalchemy.orm import Mapped, mapped_column
from source.core.database import Base


class OutboxEvent(Base):
    __tablename__ = "outbox_events"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        default=uuid.uuid4
    )

    aggregate_type: Mapped[str] = mapped_column(String(50))
    aggregate_id: Mapped[str] = mapped_column(String(50))

    event_type: Mapped[str] = mapped_column(String(50))

    payload: Mapped[dict] = mapped_column(JSON)

    status: Mapped[str] = mapped_column(
        String(20),
        default="pending"
    )

    retry_count: Mapped[int] = mapped_column(
        Integer,
        default=0
    )

    processed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow
    )