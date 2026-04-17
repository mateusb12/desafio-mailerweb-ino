from datetime import UTC, datetime, time, timedelta

from sqlalchemy import func, or_
from sqlalchemy.orm import Session, joinedload, selectinload

from source.features.dashboard.schemas import (
    DashboardBookingSummary,
    DashboardMetricsResponse,
)
from source.models.booking import Booking, BookingStatus
from source.models.booking_participant import BookingParticipant
from source.models.email_delivery import EmailDelivery, EmailDeliveryStatus
from source.models.outbox_event import OutboxEvent, OutboxStatus
from source.models.room import Room
from source.models.user import User


def count_query(query) -> int:
    return int(query.scalar() or 0)


def user_booking_filter(current_user: User):
    return or_(
        Booking.created_by_user_id == current_user.id,
        Booking.participants.any(BookingParticipant.user_id == current_user.id),
    )


def build_booking_summary(booking: Booking | None) -> DashboardBookingSummary | None:
    if booking is None:
        return None

    return DashboardBookingSummary(
        id=booking.id,
        title=booking.title,
        room_id=booking.room_id,
        room_name=booking.room.name,
        start_at=booking.start_at,
        end_at=booking.end_at,
        participants_count=len(booking.participants),
    )


def get_dashboard_metrics(db: Session, current_user: User) -> DashboardMetricsResponse:
    now = datetime.now(UTC)
    today_start = datetime.combine(now.date(), time.min, tzinfo=UTC)
    tomorrow_start = today_start + timedelta(days=1)

    rooms_count = count_query(db.query(func.count(Room.id)))
    active_bookings_count = count_query(
        db.query(func.count(Booking.id)).filter(Booking.status == BookingStatus.ACTIVE),
    )
    today_active_bookings_count = count_query(
        db.query(func.count(Booking.id)).filter(
            Booking.status == BookingStatus.ACTIVE,
            Booking.start_at >= today_start,
            Booking.start_at < tomorrow_start,
        ),
    )
    my_upcoming_bookings_count = count_query(
        db.query(func.count(Booking.id)).filter(
            Booking.status == BookingStatus.ACTIVE,
            Booking.start_at >= now,
            user_booking_filter(current_user),
        ),
    )
    email_deliveries_count = count_query(db.query(func.count(EmailDelivery.id)))
    processed_email_deliveries_count = count_query(
        db.query(func.count(EmailDelivery.id)).filter(
            EmailDelivery.status == EmailDeliveryStatus.PROCESSED,
        ),
    )
    pending_outbox_events_count = count_query(
        db.query(func.count(OutboxEvent.id)).filter(OutboxEvent.status == OutboxStatus.PENDING),
    )
    failed_outbox_events_count = count_query(
        db.query(func.count(OutboxEvent.id)).filter(OutboxEvent.status == OutboxStatus.FAILED),
    )

    next_booking = (
        db.query(Booking)
        .options(
            joinedload(Booking.room),
            selectinload(Booking.participants),
        )
        .filter(
            Booking.status == BookingStatus.ACTIVE,
            Booking.start_at >= now,
            user_booking_filter(current_user),
        )
        .order_by(Booking.start_at)
        .first()
    )

    return DashboardMetricsResponse(
        rooms_count=rooms_count,
        active_bookings_count=active_bookings_count,
        today_active_bookings_count=today_active_bookings_count,
        my_upcoming_bookings_count=my_upcoming_bookings_count,
        email_deliveries_count=email_deliveries_count,
        processed_email_deliveries_count=processed_email_deliveries_count,
        pending_outbox_events_count=pending_outbox_events_count,
        failed_outbox_events_count=failed_outbox_events_count,
        next_booking=build_booking_summary(next_booking),
    )
