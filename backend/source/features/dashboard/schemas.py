from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class DashboardBookingSummary(BaseModel):
    id: UUID
    title: str
    room_id: UUID
    room_name: str
    start_at: datetime
    end_at: datetime
    participants_count: int


class DashboardMetricsResponse(BaseModel):
    rooms_count: int
    bookings_count: int
    active_bookings_count: int
    today_active_bookings_count: int
    my_upcoming_bookings_count: int
    email_deliveries_count: int
    outbox_events_count: int
    processed_email_deliveries_count: int
    pending_outbox_events_count: int
    failed_outbox_events_count: int
    next_booking: DashboardBookingSummary | None
