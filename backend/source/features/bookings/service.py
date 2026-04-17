from datetime import UTC, datetime
import uuid

from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload, selectinload

from source.features.outbox.constants import (
    AGGREGATE_TYPE_BOOKING,
    BOOKING_CANCELED,
    BOOKING_CREATED,
    BOOKING_UPDATED,
)
from source.features.outbox.service import create_outbox_event
from source.core.security import hash_password
from source.features.bookings.schemas import (
    BookingRequest,
    BookingResponse,
    BookingUserResponse,
)
from source.models.booking import (
    BOOKING_ACTIVE_ROOM_TIME_EXCLUSION_CONSTRAINT,
    Booking,
    BookingStatus,
)
from source.models.booking_participant import BookingParticipant
from source.models.room import Room
from source.models.user import User, UserRole

DEV_PARTICIPANT_PASSWORD = "ParticipantPassword123!"

MIN_DURATION_SECONDS = 15 * 60
MAX_DURATION_SECONDS = 8 * 60 * 60
BOOKING_TIME_CONFLICT_DETAIL = "Conflito de horário: Já existe uma reserva ativa para esta sala nesse intervalo. Ajuste o horário ou escolha outra sala."
POSTGRES_EXCLUSION_VIOLATION = "23P01"


def normalize_datetime_to_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)

    return value.astimezone(UTC)


def validate_and_normalize_booking_title(title: str) -> str:
    cleaned_title = title.strip()

    if not cleaned_title:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Informe um título para a reserva.",
        )

    return cleaned_title


def raise_booking_time_conflict() -> None:
    raise HTTPException(
        status_code=status.HTTP_409_CONFLICT,
        detail=BOOKING_TIME_CONFLICT_DETAIL,
    )


def is_booking_time_conflict_integrity_error(error: IntegrityError) -> bool:
    original_error = getattr(error, "orig", None)
    diagnostics = getattr(original_error, "diag", None)
    constraint_name = getattr(diagnostics, "constraint_name", None)
    postgres_error_code = getattr(original_error, "pgcode", None)

    return (
        constraint_name == BOOKING_ACTIVE_ROOM_TIME_EXCLUSION_CONSTRAINT
        or postgres_error_code == POSTGRES_EXCLUSION_VIOLATION
    )


def handle_booking_integrity_error(db: Session, error: IntegrityError) -> None:
    db.rollback()

    if is_booking_time_conflict_integrity_error(error):
        raise_booking_time_conflict()

    raise error


def extract_unique_participant_emails(payload: BookingRequest) -> list[str]:
    seen_emails: set[str] = set()
    normalized_emails: list[str] = []

    for email in payload.participants:
        normalized_email = str(email).strip().lower()
        if normalized_email and normalized_email not in seen_emails:
            normalized_emails.append(normalized_email)
            seen_emails.add(normalized_email)

    return normalized_emails


def validate_booking_time_window_and_conflicts(
    db: Session,
    room_id: uuid.UUID,
    start_at: datetime,
    end_at: datetime,
    ignored_booking_id: uuid.UUID | None = None,
) -> None:
    if start_at >= end_at:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="O horário de início deve ser anterior ao horário de fim.",
        )

    if start_at.date() != end_at.date():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="A reserva deve começar e terminar no mesmo dia.",
        )

    duration_in_seconds = (end_at - start_at).total_seconds()

    if duration_in_seconds < MIN_DURATION_SECONDS:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="A reserva deve ter duração mínima de 15 minutos.",
        )

    if duration_in_seconds > MAX_DURATION_SECONDS:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="A reserva deve ter duração máxima de 8 horas.",
        )

    overlapping_booking_query = db.query(Booking).filter(
        Booking.room_id == room_id,
        Booking.status == BookingStatus.ACTIVE,
        Booking.start_at < end_at,
        Booking.end_at > start_at,
    )

    if ignored_booking_id is not None:
        overlapping_booking_query = overlapping_booking_query.filter(
            Booking.id != ignored_booking_id
        )

    if overlapping_booking_query.first():
        raise_booking_time_conflict()


def get_room_or_404(db: Session, room_id: uuid.UUID) -> Room:
    room = db.query(Room).filter(Room.id == room_id).first()

    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sala não encontrada.",
        )

    return room


def get_booking_with_relations_or_404(db: Session, booking_id: uuid.UUID) -> Booking:
    booking = (
        db.query(Booking)
        .options(
            joinedload(Booking.created_by),
            selectinload(Booking.participants).joinedload(BookingParticipant.user),
        )
        .filter(Booking.id == booking_id)
        .first()
    )

    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Reserva não encontrada.",
        )

    return booking


def ensure_user_can_manage_booking(booking: Booking, current_user: User) -> None:
    if booking.created_by_user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Apenas o criador pode alterar esta reserva.",
        )


def get_or_create_participant_user_by_email(db: Session, email: str) -> User:
    user = db.query(User).filter(User.email == email).first()

    if user:
        return user

    user = User(
        email=email,
        password_hash=hash_password(DEV_PARTICIPANT_PASSWORD),
        role=UserRole.USER,
        is_active=True,
    )
    db.add(user)
    db.flush()

    return user


def replace_booking_participants_by_email(
    db: Session,
    booking: Booking,
    participant_emails: list[str],
) -> None:
    db.query(BookingParticipant).filter(
        BookingParticipant.booking_id == booking.id
    ).delete()

    for email in participant_emails:
        user = get_or_create_participant_user_by_email(db, email)
        db.add(BookingParticipant(booking_id=booking.id, user_id=user.id))


def build_booking_outbox_payload(
    booking: Booking,
    participant_emails: list[str],
) -> dict:
    return {
        "booking_id": str(booking.id),
        "title": booking.title,
        "room_id": str(booking.room_id),
        "created_by_user_id": str(booking.created_by_user_id),
        "start_at": booking.start_at.isoformat(),
        "end_at": booking.end_at.isoformat(),
        "status": booking.status.value,
        "participants": participant_emails,
    }


def build_booking_response(booking: Booking) -> BookingResponse:
    participant_emails = sorted(
        participant.user.email for participant in booking.participants
    )

    return BookingResponse(
        id=booking.id,
        title=booking.title,
        room_id=booking.room_id,
        created_by=BookingUserResponse(
            id=booking.created_by.id,
            email=booking.created_by.email,
            role=booking.created_by.role.value,
            is_active=booking.created_by.is_active,
        ),
        start_at=booking.start_at,
        end_at=booking.end_at,
        status=booking.status,
        participants=participant_emails,
    )


def list_bookings(db: Session) -> list[BookingResponse]:
    bookings = (
        db.query(Booking)
        .options(
            joinedload(Booking.created_by),
            selectinload(Booking.participants).joinedload(BookingParticipant.user),
        )
        .order_by(Booking.start_at)
        .all()
    )

    return [build_booking_response(booking) for booking in bookings]


def create_booking(
    db: Session,
    payload: BookingRequest,
    current_user: User,
) -> BookingResponse:
    title = validate_and_normalize_booking_title(payload.title)
    start_at = normalize_datetime_to_utc(payload.start_at)
    end_at = normalize_datetime_to_utc(payload.end_at)
    participant_emails = extract_unique_participant_emails(payload)

    get_room_or_404(db, payload.room_id)
    validate_booking_time_window_and_conflicts(
        db,
        payload.room_id,
        start_at,
        end_at,
    )

    try:
        booking = Booking(
            title=title,
            room_id=payload.room_id,
            created_by_user_id=current_user.id,
            start_at=start_at,
            end_at=end_at,
            status=BookingStatus.ACTIVE,
        )
        db.add(booking)
        db.flush()

        replace_booking_participants_by_email(db, booking, participant_emails)
        db.flush()

        create_outbox_event(
            db,
            aggregate_type=AGGREGATE_TYPE_BOOKING,
            aggregate_id=booking.id,
            event_type=BOOKING_CREATED,
            payload=build_booking_outbox_payload(booking, participant_emails),
        )

        db.commit()
    except IntegrityError as error:
        handle_booking_integrity_error(db, error)

    return build_booking_response(get_booking_with_relations_or_404(db, booking.id))


def update_booking(
    db: Session,
    booking_id: uuid.UUID,
    payload: BookingRequest,
    current_user: User,
) -> BookingResponse:
    booking = get_booking_with_relations_or_404(db, booking_id)
    ensure_user_can_manage_booking(booking, current_user)

    if booking.status == BookingStatus.CANCELED:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Reservas canceladas não podem ser editadas.",
        )

    title = validate_and_normalize_booking_title(payload.title)
    start_at = normalize_datetime_to_utc(payload.start_at)
    end_at = normalize_datetime_to_utc(payload.end_at)
    participant_emails = extract_unique_participant_emails(payload)

    get_room_or_404(db, payload.room_id)
    validate_booking_time_window_and_conflicts(
        db,
        payload.room_id,
        start_at,
        end_at,
        ignored_booking_id=booking.id,
    )

    try:
        booking.title = title
        booking.room_id = payload.room_id
        booking.start_at = start_at
        booking.end_at = end_at

        replace_booking_participants_by_email(db, booking, participant_emails)
        db.flush()

        create_outbox_event(
            db,
            aggregate_type=AGGREGATE_TYPE_BOOKING,
            aggregate_id=booking.id,
            event_type=BOOKING_UPDATED,
            payload=build_booking_outbox_payload(booking, participant_emails),
        )

        db.commit()
    except IntegrityError as error:
        handle_booking_integrity_error(db, error)

    return build_booking_response(get_booking_with_relations_or_404(db, booking.id))


def cancel_booking(
    db: Session,
    booking_id: uuid.UUID,
    current_user: User,
) -> BookingResponse:
    booking = get_booking_with_relations_or_404(db, booking_id)
    ensure_user_can_manage_booking(booking, current_user)

    if booking.status != BookingStatus.CANCELED:
        booking.status = BookingStatus.CANCELED
        booking.canceled_at = datetime.now(UTC)
        db.flush()

        participant_emails = sorted(
            participant.user.email for participant in booking.participants
        )

        create_outbox_event(
            db,
            aggregate_type=AGGREGATE_TYPE_BOOKING,
            aggregate_id=booking.id,
            event_type=BOOKING_CANCELED,
            payload=build_booking_outbox_payload(booking, participant_emails),
        )

        db.commit()

    return build_booking_response(get_booking_with_relations_or_404(db, booking.id))
