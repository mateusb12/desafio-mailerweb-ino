import uuid
from datetime import UTC, datetime

from sqlalchemy import delete, func
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
TARGET_CREATED_BOOKING_IDS = {"booking-001", "booking-005", "booking-006"}
TARGET_INVITED_BOOKING_IDS = {"booking-002", "booking-004"}
NO_TARGET_BOOKING_IDS = {"booking-003", "booking-007"}
SUPPORTING_EMAILS = [
    "ana.silva@mailerweb.com",
    "bruno.lima@mailerweb.com",
    "carla.rocha@mailerweb.com",
    "diego.moura@mailerweb.com",
    "marina.costa@mailerweb.com",
    "people@mailerweb.com",
    "financeiro@mailerweb.com",
    "candidato@example.com",
]


def _mock_uuid(kind: str, frontend_id: str) -> uuid.UUID:
    return uuid.uuid5(MOCK_NAMESPACE, f"{kind}:{frontend_id}")


def _parse_datetime(value: str) -> datetime:
    return datetime.fromisoformat(value).replace(tzinfo=UTC)


def _collect_participant_emails() -> set[str]:
    emails = {user["email"] for user in MOCK_USERS}

    for booking in MOCK_BOOKINGS:
        emails.update(booking["participants"])

    return emails


def _seed_booking_ids() -> list[uuid.UUID]:
    return [_mock_uuid("booking", booking["frontend_id"]) for booking in MOCK_BOOKINGS]


def _seed_room_ids() -> list[uuid.UUID]:
    return [_mock_uuid("room", room["frontend_id"]) for room in MOCK_ROOMS]


def _seed_user_ids() -> set[uuid.UUID]:
    mock_user_ids = {_mock_uuid("user", user["frontend_id"]) for user in MOCK_USERS}
    participant_only_ids = {
        _mock_uuid("user", email)
        for email in _collect_participant_emails() - {user["email"] for user in MOCK_USERS}
    }

    return mock_user_ids | participant_only_ids


def _reset_seed_data(db: Session) -> dict:
    booking_ids = _seed_booking_ids()
    room_ids = _seed_room_ids()
    demo_delivery_id = _mock_uuid("email_delivery", DEMO_EMAIL_FRONTEND_ID)

    deleted_email_deliveries = (
        db.execute(delete(EmailDelivery).where(EmailDelivery.id == demo_delivery_id)).rowcount or 0
    )
    deleted_booking_participants = (
        db.execute(delete(BookingParticipant).where(BookingParticipant.booking_id.in_(booking_ids))).rowcount or 0
    )
    deleted_bookings = db.execute(delete(Booking).where(Booking.id.in_(booking_ids))).rowcount or 0

    remaining_room_references = db.query(func.count(Booking.id)).filter(Booking.room_id.in_(room_ids)).scalar() or 0
    deleted_rooms = 0
    if remaining_room_references == 0:
        deleted_rooms = db.execute(delete(Room).where(Room.id.in_(room_ids))).rowcount or 0

    db.flush()

    return {
        "email_deliveries": deleted_email_deliveries,
        "booking_participants": deleted_booking_participants,
        "bookings": deleted_bookings,
        "rooms": deleted_rooms,
        "users": 0,
    }


def _real_users(db: Session) -> list[User]:
    seed_user_ids = _seed_user_ids()
    return (
        db.query(User)
        .filter(User.id.notin_(seed_user_ids))
        .order_by(User.email)
        .all()
    )


def _select_target_user(real_users: list[User]) -> tuple[User | None, str]:
    if not real_users:
        return None, "default_mock_user"

    active_users = [user for user in real_users if user.is_active]
    candidates = active_users or real_users
    strategy = "single_existing_user" if len(real_users) == 1 else "first_existing_user_by_email"

    return candidates[0], strategy


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


def _build_booking_scenarios(target_user: User) -> list[dict]:
    fallback_created_by_email = {
        user["frontend_id"]: user["email"]
        for user in MOCK_USERS
    }
    target_supporting_emails = {
        "booking-001": ["bruno.lima@mailerweb.com"],
        "booking-002": ["carla.rocha@mailerweb.com", "diego.moura@mailerweb.com"],
        "booking-004": ["marina.costa@mailerweb.com", "bruno.lima@mailerweb.com"],
        "booking-005": ["diego.moura@mailerweb.com"],
        "booking-006": ["bruno.lima@mailerweb.com", "carla.rocha@mailerweb.com"],
    }

    def supporting_creator(preferred_email: str) -> str:
        if preferred_email != target_user.email:
            return preferred_email

        return next(email for email in SUPPORTING_EMAILS if email != target_user.email)

    def supporting_participants(preferred_emails: list[str]) -> list[str]:
        participants = []
        for email in [*preferred_emails, *SUPPORTING_EMAILS]:
            if email == target_user.email or email in participants:
                continue
            participants.append(email)
            if len(participants) == len(preferred_emails):
                break

        return participants

    scenarios = []
    for booking_data in MOCK_BOOKINGS:
        scenario = dict(booking_data)
        frontend_id = booking_data["frontend_id"]
        preferred_creator = fallback_created_by_email[booking_data["created_by_frontend_id"]]

        if frontend_id in TARGET_CREATED_BOOKING_IDS:
            scenario["created_by_email"] = target_user.email
            scenario["participants"] = [
                target_user.email,
                *supporting_participants(target_supporting_emails[frontend_id]),
            ]
        elif frontend_id in TARGET_INVITED_BOOKING_IDS:
            scenario["created_by_email"] = supporting_creator(preferred_creator)
            scenario["participants"] = [
                target_user.email,
                *supporting_participants(target_supporting_emails[frontend_id]),
            ]
        elif frontend_id in NO_TARGET_BOOKING_IDS:
            scenario["created_by_email"] = supporting_creator(preferred_creator)
            scenario["participants"] = supporting_participants(booking_data["participants"])
        else:
            scenario["created_by_email"] = supporting_creator(preferred_creator)

        scenarios.append(scenario)

    return scenarios


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
            f"emails preparados ou entregues pelo sistema para {recipient.email}."
        )
        existing.email_type = "system_welcome"
        existing.status = EmailDeliveryStatus.PROCESSED
        existing.source_event_id = None
        existing.delivery_metadata = {
            "seed": True,
            "purpose": "email_delivery_foundation",
            "target_user_id": str(recipient.id),
        }
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
            f"emails preparados ou entregues pelo sistema para {recipient.email}."
        ),
        email_type="system_welcome",
        status=EmailDeliveryStatus.PROCESSED,
        delivery_metadata={
            "seed": True,
            "purpose": "email_delivery_foundation",
            "target_user_id": str(recipient.id),
        },
    )
    db.flush()

    return delivery


def populate_mock_data(db: Session) -> dict:
    reset_summary = _reset_seed_data(db)
    real_users = _real_users(db)
    password_hash = hash_password(DEV_PASSWORD)

    target_user, target_strategy = _select_target_user(real_users)
    if target_user is None:
        target_user = _get_or_create_user(db, MOCK_USERS[0]["email"], password_hash)

    booking_scenarios = _build_booking_scenarios(target_user)
    scenario_emails = {target_user.email}
    for booking in booking_scenarios:
        scenario_emails.add(booking["created_by_email"])
        scenario_emails.update(booking["participants"])
    scenario_emails.update(user["email"] for user in MOCK_USERS)

    users_by_email = {
        email: _get_or_create_user(db, email, password_hash)
        for email in sorted(scenario_emails)
    }
    target_user = users_by_email[target_user.email]

    rooms_by_frontend_id = {
        room["frontend_id"]: _upsert_room(db, room)
        for room in MOCK_ROOMS
    }

    created_by_target_count = 0
    target_participant_count = 0
    without_target_count = 0
    booking_participant_count = 0
    for booking_data in booking_scenarios:
        booking_id = _mock_uuid("booking", booking_data["frontend_id"])
        status = _booking_status(booking_data["status"])
        booking = db.get(Booking, booking_id)

        if not booking:
            booking = Booking(id=booking_id)
            db.add(booking)

        booking.title = booking_data["title"]
        booking.room_id = rooms_by_frontend_id[booking_data["room_frontend_id"]].id
        booking.created_by_user_id = users_by_email[booking_data["created_by_email"]].id
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
            booking_participant_count += 1

        target_is_creator = booking.created_by_user_id == target_user.id
        target_is_participant = target_user.email in seen_participant_emails

        if target_is_creator:
            created_by_target_count += 1
        if target_is_participant and not target_is_creator:
            target_participant_count += 1
        if not target_is_participant:
            without_target_count += 1

    demo_delivery = _upsert_demo_email_delivery(db, target_user)

    db.commit()

    return {
        "target_user_email": target_user.email,
        "target_user_strategy": target_strategy,
        "reset": reset_summary,
        "users": len(users_by_email),
        "rooms": len(rooms_by_frontend_id),
        "bookings": len(booking_scenarios),
        "booking_participants": booking_participant_count,
        "bookings_created_by_target": created_by_target_count,
        "bookings_with_target_as_participant": target_participant_count,
        "bookings_without_target": without_target_count,
        "email_deliveries": 1 if demo_delivery else 0,
        "participant_only_users": sorted(_collect_participant_emails() - {user["email"] for user in MOCK_USERS}),
    }
