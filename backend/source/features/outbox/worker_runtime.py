# source/features/outbox/worker_runtime.py

import asyncio
import logging
import uuid
from datetime import UTC, datetime

from source.core.database import SessionLocal
from source.models.outbox_event import OutboxEvent, OutboxStatus
from source.features.email_deliveries.service import register_email_delivery
from source.models.room import Room
from source.models.user import User


logger = logging.getLogger(__name__)

POLL_INTERVAL = 2


async def process_event(event_id: uuid.UUID):
    db = SessionLocal()

    try:
        event = db.get(OutboxEvent, event_id)

        if event is None or event.status != OutboxStatus.PENDING:
            return

        payload = event.payload or {}
        creator = db.get(User, uuid.UUID(payload["created_by_user_id"]))
        room = db.get(Room, uuid.UUID(payload["room_id"]))

        if creator is None:
            raise ValueError(f"booking creator not found for outbox event {event.id}")

        room_name = room.name if room else payload.get("room_id")
        subject = f"Booking {event.event_type.lower()}"
        participants = ", ".join(payload.get("participants") or []) or "Sem participantes"

        body = f"""
Evento: {event.event_type}

Titulo: {payload.get("title")}
Sala: {room_name}
Inicio: {payload.get("start_at")}
Fim: {payload.get("end_at")}
Status: {payload.get("status")}
Participantes: {participants}
"""

        register_email_delivery(
            db,
            recipient_user_id=creator.id,
            recipient_email=creator.email,
            subject=subject,
            body=body,
            email_type=event.event_type.lower(),
            source_event_id=event.id,
        )

        event.status = OutboxStatus.PROCESSED
        event.processed_at = datetime.now(UTC)

        db.commit()

    except Exception:
        db.rollback()
        failed_event = db.get(OutboxEvent, event_id)

        if failed_event is not None:
            failed_event.retry_count = (failed_event.retry_count or 0) + 1
            failed_event.status = OutboxStatus.FAILED

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
