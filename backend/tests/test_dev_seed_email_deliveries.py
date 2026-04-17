from source.features.dev.mock_seed_service import clear_mock_data, populate_mock_data
from source.models.booking import Booking
from source.models.booking_participant import BookingParticipant
from source.models.email_delivery import EmailDelivery
from source.models.outbox_event import OutboxEvent
from source.models.room import Room
from source.models.user import User


def _clear_seed_test_state(db_session):
    db_session.query(BookingParticipant).delete()
    db_session.query(Booking).delete()
    db_session.query(EmailDelivery).delete()
    db_session.query(Room).delete()
    db_session.query(User).delete()
    db_session.flush()


def test_populate_mock_data_creates_demo_email_delivery(db_session):
    _clear_seed_test_state(db_session)

    summary = populate_mock_data(db_session)

    deliveries = db_session.query(EmailDelivery).all()

    assert summary["email_deliveries"] == 1
    assert len(deliveries) == 1
    assert deliveries[0].recipient_email == "ana.silva@mailerweb.com"
    assert deliveries[0].subject == "Welcome to MailerWeb notifications"
    assert deliveries[0].email_type == "system_welcome"
    assert "worker" in deliveries[0].body


def test_populate_mock_data_is_idempotent(db_session):
    _clear_seed_test_state(db_session)

    first_summary = populate_mock_data(db_session)
    second_summary = populate_mock_data(db_session)

    assert second_summary["reset"]["email_deliveries"] == 1
    assert second_summary["reset"]["bookings"] == first_summary["bookings"]
    assert second_summary["reset"]["booking_participants"] == first_summary["booking_participants"]
    assert db_session.query(Booking).count() == second_summary["bookings"]
    assert db_session.query(BookingParticipant).count() == second_summary["booking_participants"]
    assert db_session.query(EmailDelivery).count() == second_summary["email_deliveries"]


def test_populate_mock_data_uses_single_existing_user_as_target(db_session, user_factory):
    _clear_seed_test_state(db_session)
    target = user_factory(email="pessoa.real@example.com")

    summary = populate_mock_data(db_session)
    deliveries = db_session.query(EmailDelivery).all()

    assert summary["target_user_email"] == target.email
    assert summary["target_user_strategy"] == "single_existing_user"
    assert summary["bookings_created_by_target"] > 0
    assert summary["bookings_with_target_as_participant"] > 0
    assert summary["bookings_without_target"] > 0
    assert len(deliveries) == 1
    assert deliveries[0].recipient_user_id == target.id
    assert deliveries[0].recipient_email == target.email
    assert target.email in deliveries[0].body

    bookings = db_session.query(Booking).all()
    created_by_target = [booking for booking in bookings if booking.created_by_user_id == target.id]
    invited_target = [
        booking
        for booking in bookings
        if booking.created_by_user_id != target.id
        and any(participant.user_id == target.id for participant in booking.participants)
    ]
    without_target = [
        booking
        for booking in bookings
        if booking.created_by_user_id != target.id
        and all(participant.user_id != target.id for participant in booking.participants)
    ]

    assert created_by_target
    assert invited_target
    assert without_target


def test_populate_mock_data_chooses_first_existing_user_by_email_when_multiple_exist(db_session, user_factory):
    _clear_seed_test_state(db_session)
    user_factory(email="zeta.real@example.com")
    expected_target = user_factory(email="alpha.real@example.com")

    summary = populate_mock_data(db_session)
    delivery = db_session.query(EmailDelivery).one()

    assert summary["target_user_email"] == expected_target.email
    assert summary["target_user_strategy"] == "first_existing_user_by_email"
    assert delivery.recipient_user_id == expected_target.id
    assert delivery.recipient_email == expected_target.email


def test_clear_mock_data_removes_operational_demo_data_but_keeps_users(db_session, user_factory):
    _clear_seed_test_state(db_session)
    user = user_factory(email="demo-reset@example.com")
    populate_mock_data(db_session)

    assert db_session.query(Room).count() > 0
    assert db_session.query(Booking).count() > 0
    assert db_session.query(EmailDelivery).count() > 0

    summary = clear_mock_data(db_session)

    assert summary["rooms"] > 0
    assert summary["bookings"] > 0
    assert summary["email_deliveries"] > 0
    assert db_session.query(Room).count() == 0
    assert db_session.query(Booking).count() == 0
    assert db_session.query(BookingParticipant).count() == 0
    assert db_session.query(EmailDelivery).count() == 0
    assert db_session.query(OutboxEvent).count() == 0
    assert db_session.get(User, user.id) is not None
