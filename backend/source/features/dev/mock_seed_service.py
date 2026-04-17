import uuid
from datetime import UTC, datetime

from sqlalchemy import delete
from sqlalchemy.orm import Session

from source.core.security import hash_password
from source.features.dev.mock_seed_data import MOCK_BOOKINGS, MOCK_ROOMS, MOCK_USERS
from source.features.email_deliveries.service import register_email_delivery
from source.models.booking import Booking, BookingStatus
from source.models.booking_participant import BookingParticipant
from source.models.email_delivery import EmailDelivery, EmailDeliveryStatus
from source.models.room import Room
from source.models.user import User, UserRole

MOCK_NAMESPACE = uuid.UUID("661fd4cb-4770-4d83-bb7f-a8c50cff902e")
DEV_PASSWORD = "MockPassword123!"
DEMO_EMAIL_FRONTEND_ID = "email-delivery-foundation"


def _mock_uuid(kind: str, frontend_id: str) -> uuid.UUID:
    return uuid.uuid5(MOCK_NAMESPACE, f"{kind}:{frontend_id}")


def _parse_datetime(value: str) -> datetime:
    return datetime.fromisoformat(value).replace(tzinfo=UTC)


def _collect_participant_emails() -> set[str]:
    emails = {user["email"] for user in MOCK_USERS}

    for booking in MOCK_BOOKINGS:
        emails.update(booking["participants"])

    return emails


def _get_or_create_user(db: Session, email: str, password_hash: str) -> User:
    existing = db.query(User).filter(User.email == email).first()

    if existing:
        return existing

    mock_user = next((user for user in MOCK_USERS if user["email"] == email), None)

    user = User(
        id=_mock_uuid("user", mock_user["frontend_id"] if mock_user else email),
        email=email,
        password_hash=password_hash,
        role=UserRole(mock_user["role"]) if mock_user else UserRole.USER,
        is_active=mock_user["is_active"] if mock_user else True,
    )

    db.add(user)
    db.flush()

    return user


def _upsert_room(db: Session, room_data: dict) -> Room:
    room_id = _mock_uuid("room", room_data["frontend_id"])
    room = db.get(Room, room_id) or db.query(Room).filter(Room.name == room_data["name"]).first()

    if room:
        room.name = room_data["name"]
        room.capacity = room_data["capacity"]
        db.flush()
        return room

    room = Room(
        id=room_id,
        name=room_data["name"],
        capacity=room_data["capacity"],
    )

    db.add(room)
    db.flush()

    return room


def _booking_status(frontend_status: str) -> BookingStatus:
    if frontend_status == "cancelled":
        return BookingStatus.CANCELED

    return BookingStatus.ACTIVE


def _upsert_demo_email_delivery(db: Session, recipient: User) -> EmailDelivery:
    delivery_id = _mock_uuid("email_delivery", DEMO_EMAIL_FRONTEND_ID)
    existing = db.get(EmailDelivery, delivery_id)

    if existing:
        existing.recipient_user_id = recipient.id
        existing.recipient_email = recipient.email
        existing.subject = "Welcome to MailerWeb notifications"
        existing.body = (
            "Esta inbox demonstra a fundacao de email_deliveries. No proximo passo, "
            "o worker vai processar eventos pendentes da outbox e registrar aqui os "
            "emails preparados ou entregues pelo sistema."
        )
        existing.email_type = "system_welcome"
        existing.status = EmailDeliveryStatus.PROCESSED
        existing.source_event_id = None
        existing.delivery_metadata = {"seed": True, "purpose": "email_delivery_foundation"}
        existing.delivered_at = None
        db.flush()
        return existing

    delivery = register_email_delivery(
        db,
        delivery_id=delivery_id,
        recipient_user_id=recipient.id,
        recipient_email=recipient.email,
        subject="Welcome to MailerWeb notifications",
        body=(
            "Esta inbox demonstra a fundacao de email_deliveries. No proximo passo, "
            "o worker vai processar eventos pendentes da outbox e registrar aqui os "
            "emails preparados ou entregues pelo sistema."
        ),
        email_type="system_welcome",
        status=EmailDeliveryStatus.PROCESSED,
        delivery_metadata={"seed": True, "purpose": "email_delivery_foundation"},
    )
    db.flush()

    return delivery


def populate_mock_data(db: Session) -> dict:
    password_hash = hash_password(DEV_PASSWORD)

    users_by_email = {
        email: _get_or_create_user(db, email, password_hash)
        for email in sorted(_collect_participant_emails())
    }
    users_by_frontend_id = {
        user["frontend_id"]: users_by_email[user["email"]]
        for user in MOCK_USERS
    }

    rooms_by_frontend_id = {
        room["frontend_id"]: _upsert_room(db, room)
        for room in MOCK_ROOMS
    }

    booking_ids = [_mock_uuid("booking", booking["frontend_id"]) for booking in MOCK_BOOKINGS]
    db.execute(delete(BookingParticipant).where(BookingParticipant.booking_id.in_(booking_ids)))

    for booking_data in MOCK_BOOKINGS:
        booking_id = _mock_uuid("booking", booking_data["frontend_id"])
        status = _booking_status(booking_data["status"])
        booking = db.get(Booking, booking_id)

        if not booking:
            booking = Booking(id=booking_id)
            db.add(booking)

        booking.title = booking_data["title"]
        booking.room_id = rooms_by_frontend_id[booking_data["room_frontend_id"]].id
        booking.created_by_user_id = users_by_frontend_id[booking_data["created_by_frontend_id"]].id
        booking.start_at = _parse_datetime(booking_data["start_at"])
        booking.end_at = _parse_datetime(booking_data["end_at"])
        booking.status = status
        booking.canceled_at = datetime.now(UTC) if status == BookingStatus.CANCELED else None

        db.flush()

        seen_participant_emails = set()
        for participant_email in booking_data["participants"]:
            if participant_email in seen_participant_emails:
                continue

            seen_participant_emails.add(participant_email)
            db.add(
                BookingParticipant(
                    booking_id=booking.id,
                    user_id=users_by_email[participant_email].id,
                )
            )

    demo_delivery = _upsert_demo_email_delivery(db, users_by_frontend_id["usr-001"])

    db.commit()

    return {
        "users": len(users_by_email),
        "rooms": len(rooms_by_frontend_id),
        "bookings": len(MOCK_BOOKINGS),
        "booking_participants": sum(len(set(booking["participants"])) for booking in MOCK_BOOKINGS),
        "email_deliveries": 1 if demo_delivery else 0,
        "participant_only_users": sorted(_collect_participant_emails() - {user["email"] for user in MOCK_USERS}),
    }
