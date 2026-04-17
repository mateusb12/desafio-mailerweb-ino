import uuid
from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy.exc import DataError, IntegrityError, StatementError

from source.models.booking import Booking
from source.models.booking_participant import BookingParticipant  # noqa: F401
from source.models.outbox_event import OutboxEvent
from source.models.room import Room
from source.models.user import User


def test_room_capacity_deve_ser_positiva(db_session):
    sala = Room(
        name=f"sala-capacidade-invalida-{uuid.uuid4()}",
        capacity=0,
    )
    db_session.add(sala)

    with pytest.raises(IntegrityError):
        db_session.flush()


def test_booking_status_deve_ser_valido(db_session):
    sala = Room(
        name=f"sala-status-reserva-{uuid.uuid4()}",
        capacity=4,
    )

    usuario = User(
        email=f"usuario-status-{uuid.uuid4()}@teste.com",
        password_hash="nao-usado",
    )

    db_session.add_all([sala, usuario])
    db_session.flush()

    agora = datetime.now(UTC)

    reserva = Booking(
        title="Reserva com status invalido",
        room_id=sala.id,
        created_by_user_id=usuario.id,
        start_at=agora + timedelta(hours=1),
        end_at=agora + timedelta(hours=2),
        status="invalido",
    )

    db_session.add(reserva)

    with pytest.raises((DataError, StatementError)):
        db_session.flush()


def test_outbox_status_deve_ser_valido(db_session):
    evento = OutboxEvent(
        aggregate_type="booking",
        aggregate_id=str(uuid.uuid4()),
        event_type="BOOKING_CREATED",
        payload={"booking_id": str(uuid.uuid4())},
        status="invalido",
    )

    db_session.add(evento)

    with pytest.raises((DataError, StatementError)):
        db_session.flush()
