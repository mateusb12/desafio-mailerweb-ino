from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from source.core.database import get_db
from source.features.auth.dependencies import get_current_user
from source.features.bookings.schemas import BookingRequest, BookingResponse
from source.features.bookings.service import (
    cancel_booking,
    create_booking,
    list_bookings,
    update_booking,
)
from source.models.user import User

bookings_bp = APIRouter(prefix="/bookings", tags=["bookings"])


@bookings_bp.get("", response_model=list[BookingResponse])
def get_bookings(
    _current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return list_bookings(db)


@bookings_bp.post("", response_model=BookingResponse, status_code=status.HTTP_201_CREATED)
def post_booking(
    payload: BookingRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return create_booking(db, payload, current_user)


@bookings_bp.put("/{booking_id}", response_model=BookingResponse)
def put_booking(
    booking_id: UUID,
    payload: BookingRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return update_booking(db, booking_id, payload, current_user)


@bookings_bp.post("/{booking_id}/cancel", response_model=BookingResponse)
def post_cancel_booking(
    booking_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return cancel_booking(db, booking_id, current_user)
