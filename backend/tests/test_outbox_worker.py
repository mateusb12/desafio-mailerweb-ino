import asyncio
import uuid
from datetime import UTC, datetime, timedelta

from source.features.outbox import worker_runtime
from source.features.outbox.constants import AGGREGATE_TYPE_BOOKING, BOOKING_CREATED
from source.models.booking import Booking
from source.models.booking_participant import BookingParticipant
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


def _create_booking_event(
    db_session,
    creator,
    room,
    *,
    participants,
    payload_participants=None,
    retry_count=0,
    status=OutboxStatus.PENDING,
):
    start_at = datetime.now(UTC) + timedelta(days=1)
    end_at = start_at + timedelta(hours=1)
    booking = Booking(
        title="Worker test booking",
        room_id=room.id,
        created_by_user_id=creator.id,
        start_at=start_at,
        end_at=end_at,
    )
    db_session.add(booking)
    db_session.flush()

    for participant in participants:
        db_session.add(BookingParticipant(booking_id=booking.id, user_id=participant.id))
    db_session.flush()

    event = OutboxEvent(
        aggregate_type=AGGREGATE_TYPE_BOOKING,
        aggregate_id=str(booking.id),
        event_type=BOOKING_CREATED,
        payload={
            "booking_id": str(booking.id),
            "title": booking.title,
            "room_id": str(room.id),
            "created_by_user_id": str(creator.id),
            "start_at": start_at.isoformat(),
            "end_at": end_at.isoformat(),
            "status": "active",
            "participants": payload_participants if payload_participants is not None else [user.email for user in participants],
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
            "participants": ["ana@example.com"],
        },
        status=OutboxStatus.PENDING,
        retry_count=retry_count,
    )
    db_session.add(event)
    db_session.flush()
    return event


def _deliveries_for_event(db_session, event):
    return (
        db_session.query(EmailDelivery)
        .filter(EmailDelivery.source_event_id == event.id)
        .order_by(EmailDelivery.recipient_email)
        .all()
    )


def test_process_event_creates_one_email_delivery_per_booking_participant(
    db_session,
    user_factory,
    room_factory,
    monkeypatch,
):
    _patch_worker_session(monkeypatch, db_session)
    creator = user_factory()
    room = room_factory()
    participants = [
        user_factory(email=f"ana-{uuid.uuid4()}@example.com"),
        user_factory(email=f"bruno-{uuid.uuid4()}@example.com"),
        user_factory(email=f"carla-{uuid.uuid4()}@example.com"),
    ]
    event = _create_booking_event(db_session, creator, room, participants=participants)

    asyncio.run(worker_runtime.process_event(event.id))

    deliveries = _deliveries_for_event(db_session, event)
    expected_emails = sorted(participant.email.lower() for participant in participants)

    assert event.status == OutboxStatus.PROCESSED
    assert event.retry_count == 0
    assert event.processed_at is not None
    assert [delivery.recipient_email for delivery in deliveries] == expected_emails
    assert {delivery.source_event_id for delivery in deliveries} == {event.id}
    assert all(delivery.email_type == BOOKING_CREATED.lower() for delivery in deliveries)
    assert all(delivery.subject == "Booking booking_created" for delivery in deliveries)
    assert all("Worker test booking" in delivery.body for delivery in deliveries)
    assert all("Participantes:" in delivery.body for delivery in deliveries)
    assert creator.email.lower() not in expected_emails


def test_process_event_deduplicates_and_normalizes_duplicate_payload_participants(
    db_session,
    user_factory,
    room_factory,
    monkeypatch,
):
    _patch_worker_session(monkeypatch, db_session)
    creator = user_factory()
    room = room_factory()
    participant = user_factory(email=f"ana-{uuid.uuid4()}@example.com")
    event = _create_booking_event(
        db_session,
        creator,
        room,
        participants=[participant],
        payload_participants=[participant.email, participant.email, participant.email.upper()],
    )

    asyncio.run(worker_runtime.process_event(event.id))

    deliveries = _deliveries_for_event(db_session, event)
    assert len(deliveries) == 1
    assert deliveries[0].recipient_email == participant.email.lower()
    assert deliveries[0].body.count(participant.email.lower()) == 1
    assert participant.email.upper() not in deliveries[0].body


def test_process_event_is_idempotent_per_source_event_and_recipient(
    db_session,
    user_factory,
    room_factory,
    monkeypatch,
):
    _patch_worker_session(monkeypatch, db_session)
    creator = user_factory()
    room = room_factory()
    participants = [
        user_factory(email=f"ana-{uuid.uuid4()}@example.com"),
        user_factory(email=f"bruno-{uuid.uuid4()}@example.com"),
    ]
    event = _create_booking_event(db_session, creator, room, participants=participants)

    asyncio.run(worker_runtime.process_event(event.id))
    first_delivery_ids = {delivery.id for delivery in _deliveries_for_event(db_session, event)}

    event.status = OutboxStatus.PENDING
    event.processed_at = None
    db_session.flush()

    asyncio.run(worker_runtime.process_event(event.id))

    deliveries = _deliveries_for_event(db_session, event)
    assert len(deliveries) == len(participants)
    assert {delivery.id for delivery in deliveries} == first_delivery_ids
    assert {delivery.recipient_email for delivery in deliveries} == {participant.email.lower() for participant in participants}
    assert event.status == OutboxStatus.PROCESSED


def test_process_event_increments_retry_count_then_marks_failed_after_limit(db_session, room_factory, monkeypatch):
    _patch_worker_session(monkeypatch, db_session)
    room = room_factory()
    event = _create_broken_event(db_session, room)

    for expected_retry_count in range(1, worker_runtime.MAX_RETRIES):
        asyncio.run(worker_runtime.process_event(event.id))

        assert event.retry_count == expected_retry_count
        assert event.status == OutboxStatus.PENDING
        assert event.processed_at is None

    asyncio.run(worker_runtime.process_event(event.id))

    assert event.retry_count == worker_runtime.MAX_RETRIES
    assert event.status == OutboxStatus.FAILED
    assert event.processed_at is None
    assert _deliveries_for_event(db_session, event) == []
