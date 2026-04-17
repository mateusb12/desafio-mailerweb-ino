import uuid

from sqlalchemy.orm import Session

from source.features.email_deliveries.service import register_email_delivery
from source.features.outbox.constants import BOOKING_CANCELED, BOOKING_CREATED, BOOKING_UPDATED
from source.models.booking import Booking
from source.models.booking_participant import BookingParticipant
from source.models.outbox_event import OutboxEvent
from source.models.room import Room
from source.models.user import User


BOOKING_NOTIFICATION_EVENTS = {
    BOOKING_CREATED,
    BOOKING_UPDATED,
    BOOKING_CANCELED,
}


def normalize_recipient_emails(emails: list[str]) -> list[str]:
    normalized_emails: list[str] = []
    seen: set[str] = set()

    for email in emails:
        normalized_email = email.strip().lower()
        if not normalized_email or normalized_email in seen:
            continue

        normalized_emails.append(normalized_email)
        seen.add(normalized_email)

    return normalized_emails


def resolve_booking_recipient_emails(db: Session, booking: Booking, payload: dict) -> list[str]:
    payload_participants = payload.get("participants")
    if payload_participants is not None:
        return normalize_recipient_emails(payload_participants)

    participant_emails = (
        db.query(User.email)
        .join(BookingParticipant, BookingParticipant.user_id == User.id)
        .filter(BookingParticipant.booking_id == booking.id)
        .all()
    )
    return normalize_recipient_emails([email for (email,) in participant_emails])


def build_booking_notification_content(
    event: OutboxEvent,
    room: Room | None,
    recipient_emails: list[str],
) -> tuple[str, str]:
    payload = event.payload or {}
    room_name = room.name if room else payload.get("room_id")
    participants = ", ".join(recipient_emails) or "Sem participantes"

    subject = f"Booking {event.event_type.lower()}"
    body = f"""
Evento: {event.event_type}

Titulo: {payload.get("title")}
Sala: {room_name}
Inicio: {payload.get("start_at")}
Fim: {payload.get("end_at")}
Status: {payload.get("status")}
Participantes: {participants}
"""
    return subject, body


def process_booking_notification_event(db: Session, event: OutboxEvent) -> None:
    if event.event_type not in BOOKING_NOTIFICATION_EVENTS:
        raise ValueError(f"unsupported booking event type: {event.event_type}")

    payload = event.payload or {}
    booking_id = uuid.UUID(payload["booking_id"])
    room_id = uuid.UUID(payload["room_id"])

    booking = db.get(Booking, booking_id)
    if booking is None:
        raise ValueError(f"booking not found for outbox event {event.id}")

    room = db.get(Room, room_id)
    recipient_emails = resolve_booking_recipient_emails(db, booking, payload)
    subject, body = build_booking_notification_content(event, room, recipient_emails)

    users_by_email = {
        user.email.strip().lower(): user
        for user in db.query(User).filter(User.email.in_(recipient_emails)).all()
    }

    for recipient_email in recipient_emails:
        recipient_user = users_by_email.get(recipient_email)
        register_email_delivery(
            db,
            recipient_user_id=recipient_user.id if recipient_user else None,
            recipient_email=recipient_email,
            subject=subject,
            body=body,
            email_type=event.event_type.lower(),
            source_event_id=event.id,
        )
