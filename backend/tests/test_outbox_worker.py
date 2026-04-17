import asyncio
import uuid
from datetime import UTC, datetime, timedelta

from source.features.email_deliveries.service import register_email_delivery
from source.features.outbox import worker_runtime
from source.features.outbox.constants import AGGREGATE_TYPE_BOOKING, BOOKING_CREATED
from source.models.booking import Booking
from source.models.email_delivery import EmailDelivery
from source.models.outbox_event import OutboxEvent, OutboxStatus


class SessionProxy:
    def __init__(self, session):
        self.session = session

    def close(self):
        pass

    def rollback(self):
        self.session.expire_all()

    def __getattr__(self, name):
        return getattr(self.session, name)


def _patch_worker_session(monkeypatch, db_session):
    monkeypatch.setattr(worker_runtime, "SessionLocal", lambda: SessionProxy(db_session))


def _create_booking_event(db_session, user, room, *, retry_count=0, status=OutboxStatus.PENDING):
    start_at = datetime.now(UTC) + timedelta(days=1)
    end_at = start_at + timedelta(hours=1)
    booking = Booking(
        title="Worker test booking",
        room_id=room.id,
        created_by_user_id=user.id,
        start_at=start_at,
        end_at=end_at,
    )
    db_session.add(booking)
    db_session.flush()

    event = OutboxEvent(
        aggregate_type=AGGREGATE_TYPE_BOOKING,
        aggregate_id=str(booking.id),
        event_type=BOOKING_CREATED,
        payload={
            "booking_id": str(booking.id),
            "title": booking.title,
            "room_id": str(room.id),
            "created_by_user_id": str(user.id),
            "start_at": start_at.isoformat(),
            "end_at": end_at.isoformat(),
            "status": "active",
            "participants": [],
        },
        status=status,
        retry_count=retry_count,
    )
    db_session.add(event)
    db_session.flush()
    return event


def _create_broken_event(db_session, room, *, retry_count=0):
    event = OutboxEvent(
        aggregate_type=AGGREGATE_TYPE_BOOKING,
        aggregate_id=str(uuid.uuid4()),
        event_type=BOOKING_CREATED,
        payload={
            "booking_id": str(uuid.uuid4()),
            "title": "Broken worker test booking",
            "room_id": str(room.id),
            "created_by_user_id": str(uuid.uuid4()),
            "start_at": datetime.now(UTC).isoformat(),
            "end_at": (datetime.now(UTC) + timedelta(hours=1)).isoformat(),
            "status": "active",
            "participants": [],
        },
        status=OutboxStatus.PENDING,
        retry_count=retry_count,
    )
    db_session.add(event)
    db_session.flush()
    return event


def test_process_event_processes_pending_event_and_creates_email_delivery(db_session, user_factory, room_factory, monkeypatch):
    _patch_worker_session(monkeypatch, db_session)
    user = user_factory()
    room = room_factory()
    event = _create_booking_event(db_session, user, room)

    asyncio.run(worker_runtime.process_event(event.id))

    delivery = db_session.query(EmailDelivery).filter(EmailDelivery.source_event_id == event.id).one()
    assert delivery.recipient_user_id == user.id
    assert delivery.recipient_email == user.email.lower()
    assert delivery.email_type == BOOKING_CREATED.lower()
    assert "Worker test booking" in delivery.body
    assert event.status == OutboxStatus.PROCESSED
    assert event.retry_count == 0
    assert event.processed_at is not None


def test_process_event_increments_retry_count_after_processing_error(db_session, room_factory, monkeypatch):
    _patch_worker_session(monkeypatch, db_session)
    room = room_factory()
    event = _create_broken_event(db_session, room)

    asyncio.run(worker_runtime.process_event(event.id))

    assert event.retry_count == 1
    assert event.status == OutboxStatus.PENDING
    assert event.processed_at is None
    assert db_session.query(EmailDelivery).filter(EmailDelivery.source_event_id == event.id).count() == 0


def test_process_event_marks_event_failed_when_max_retries_is_reached(db_session, room_factory, monkeypatch):
    _patch_worker_session(monkeypatch, db_session)
    room = room_factory()
    event = _create_broken_event(db_session, room, retry_count=worker_runtime.MAX_RETRIES - 1)

    asyncio.run(worker_runtime.process_event(event.id))

    assert event.retry_count == worker_runtime.MAX_RETRIES
    assert event.status == OutboxStatus.FAILED
    assert event.processed_at is None


def test_process_event_is_idempotent_for_existing_source_event_delivery(db_session, user_factory, room_factory, monkeypatch):
    _patch_worker_session(monkeypatch, db_session)
    user = user_factory()
    room = room_factory()
    event = _create_booking_event(db_session, user, room)
    existing_delivery = register_email_delivery(
        db_session,
        recipient_user_id=user.id,
        recipient_email=user.email,
        subject="Existing delivery",
        body="Already registered",
        email_type=BOOKING_CREATED.lower(),
        source_event_id=event.id,
    )
    db_session.flush()

    asyncio.run(worker_runtime.process_event(event.id))

    deliveries = db_session.query(EmailDelivery).filter(EmailDelivery.source_event_id == event.id).all()
    assert deliveries == [existing_delivery]
    assert event.status == OutboxStatus.PROCESSED
