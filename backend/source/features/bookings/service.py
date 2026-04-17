from datetime import UTC, datetime
import uuid

from fastapi import HTTPException, status
from sqlalchemy.orm import Session, joinedload, selectinload

from source.core.security import hash_password
from source.features.bookings.schemas import BookingRequest, BookingResponse, BookingUserResponse
from source.models.booking import Booking, BookingStatus
from source.models.booking_participant import BookingParticipant
from source.models.room import Room
from source.models.user import User, UserRole

DEV_PARTICIPANT_PASSWORD = "ParticipantPassword123!"

MIN_DURATION_SECONDS = 15 * 60
MAX_DURATION_SECONDS = 8 * 60 * 60


def _as_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)

    return value.astimezone(UTC)


def _clean_title(title: str) -> str:
    cleaned = title.strip()

    if not cleaned:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Informe um título para a reserva.",
        )

    return cleaned


def _participant_emails(payload: BookingRequest) -> list[str]:
    seen: set[str] = set()
    emails: list[str] = []

    for email in payload.participants:
        normalized = str(email).strip().lower()
        if normalized and normalized not in seen:
            emails.append(normalized)
            seen.add(normalized)

    return emails


def _validate_booking_window(
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

    duration = (end_at - start_at).total_seconds()

    if duration < MIN_DURATION_SECONDS:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="A reserva deve ter duração mínima de 15 minutos.",
        )

    if duration > MAX_DURATION_SECONDS:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="A reserva deve ter duração máxima de 8 horas.",
        )

    query = db.query(Booking).filter(
        Booking.room_id == room_id,
        Booking.status == BookingStatus.ACTIVE,
        Booking.start_at < end_at,
        Booking.end_at > start_at,
    )

    if ignored_booking_id is not None:
        query = query.filter(Booking.id != ignored_booking_id)

    if query.first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Já existe uma reserva ativa para esta sala nesse intervalo. Ajuste o horário ou escolha outra sala.",
        )


def _get_room(db: Session, room_id: uuid.UUID) -> Room:
    room = db.query(Room).filter(Room.id == room_id).first()

    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sala não encontrada.",
        )

    return room


def _get_booking(db: Session, booking_id: uuid.UUID) -> Booking:
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


def _ensure_can_manage(booking: Booking, current_user: User) -> None:
    if booking.created_by_user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Apenas o criador pode alterar esta reserva.",
        )


def _get_or_create_user_by_email(db: Session, email: str) -> User:
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


def _replace_participants(db: Session, booking: Booking, emails: list[str]) -> None:
    db.query(BookingParticipant).filter(BookingParticipant.booking_id == booking.id).delete()

    for email in emails:
        user = _get_or_create_user_by_email(db, email)
        db.add(BookingParticipant(booking_id=booking.id, user_id=user.id))


def _booking_response(booking: Booking) -> BookingResponse:
    participants = sorted(participant.user.email for participant in booking.participants)

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
        participants=participants,
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

    return [_booking_response(booking) for booking in bookings]


def create_booking(db: Session, payload: BookingRequest, current_user: User) -> BookingResponse:
    title = _clean_title(payload.title)
    start_at = _as_utc(payload.start_at)
    end_at = _as_utc(payload.end_at)
    participants = _participant_emails(payload)

    _get_room(db, payload.room_id)
    _validate_booking_window(db, payload.room_id, start_at, end_at)

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

    _replace_participants(db, booking, participants)

    db.commit()

    return _booking_response(_get_booking(db, booking.id))


def update_booking(db: Session, booking_id: uuid.UUID, payload: BookingRequest, current_user: User) -> BookingResponse:
    booking = _get_booking(db, booking_id)
    _ensure_can_manage(booking, current_user)

    if booking.status == BookingStatus.CANCELED:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Reservas canceladas não podem ser editadas.",
        )

    title = _clean_title(payload.title)
    start_at = _as_utc(payload.start_at)
    end_at = _as_utc(payload.end_at)
    participants = _participant_emails(payload)

    _get_room(db, payload.room_id)
    _validate_booking_window(db, payload.room_id, start_at, end_at, ignored_booking_id=booking.id)

    booking.title = title
    booking.room_id = payload.room_id
    booking.start_at = start_at
    booking.end_at = end_at
    _replace_participants(db, booking, participants)

    db.commit()

    return _booking_response(_get_booking(db, booking.id))


def cancel_booking(db: Session, booking_id: uuid.UUID, current_user: User) -> BookingResponse:
    booking = _get_booking(db, booking_id)
    _ensure_can_manage(booking, current_user)

    if booking.status != BookingStatus.CANCELED:
        booking.status = BookingStatus.CANCELED
        booking.canceled_at = datetime.now(UTC)
        db.commit()

    return _booking_response(_get_booking(db, booking.id))
