# source/features/outbox/worker_runtime.py

import asyncio
import logging
import uuid
from datetime import UTC, datetime

from source.core.database import SessionLocal
from source.features.bookings.notifications import process_booking_notification_event
from source.features.outbox.constants import AGGREGATE_TYPE_BOOKING
from source.models.outbox_event import OutboxEvent, OutboxStatus


logger = logging.getLogger(__name__)

POLL_INTERVAL = 2
MAX_RETRIES = 3


def dispatch_event(db, event: OutboxEvent) -> None:
    if event.aggregate_type == AGGREGATE_TYPE_BOOKING:
        process_booking_notification_event(db, event)
        return

    raise ValueError(f"unsupported outbox aggregate type: {event.aggregate_type}")


async def process_event(event_id: uuid.UUID):
    db = SessionLocal()

    try:
        event = db.get(OutboxEvent, event_id)

        if event is None or event.status != OutboxStatus.PENDING:
            return

        dispatch_event(db, event)

        event.status = OutboxStatus.PROCESSED
        event.processed_at = datetime.now(UTC)

        db.commit()

    except Exception:
        db.rollback()
        failed_event = db.get(OutboxEvent, event_id)

        if failed_event is not None:
            next_retry_count = (failed_event.retry_count or 0) + 1
            failed_event.retry_count = next_retry_count
            failed_event.status = OutboxStatus.FAILED if next_retry_count >= MAX_RETRIES else OutboxStatus.PENDING

            db.commit()

        logger.exception("failed to process outbox event")

    finally:

        db.close()


async def worker_loop():
    logger.info("outbox worker started")

    while True:
        db = SessionLocal()

        try:
            event_ids = [
                event_id
                for (event_id,) in (
                    db.query(OutboxEvent.id)
                    .filter(OutboxEvent.status == OutboxStatus.PENDING)
                    .order_by(OutboxEvent.created_at)
                    .limit(10)
                    .all()
                )
            ]
        finally:
            db.close()

        for event_id in event_ids:
            await process_event(event_id)

        await asyncio.sleep(POLL_INTERVAL)
