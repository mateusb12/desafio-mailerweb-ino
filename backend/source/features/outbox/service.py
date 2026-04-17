from datetime import datetime
from typing import Any
from uuid import UUID

from sqlalchemy.orm import Session

from source.models.outbox_event import OutboxEvent, OutboxStatus


def create_outbox_event(
    db: Session,
    *,
    aggregate_type: str,
    aggregate_id: UUID | str,
    event_type: str,
    payload: dict[str, Any],
) -> OutboxEvent:
    event = OutboxEvent(
        aggregate_type=aggregate_type,
        aggregate_id=str(aggregate_id),
        event_type=event_type,
        payload=payload,
        status=OutboxStatus.PENDING,
        retry_count=0,
        processed_at=None,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )

    db.add(event)
    return event