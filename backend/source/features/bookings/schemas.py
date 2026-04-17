from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field

from source.models.booking import BookingStatus


class BookingUserResponse(BaseModel):
    id: UUID
    email: EmailStr
    role: str
    is_active: bool


class BookingResponse(BaseModel):
    id: UUID
    title: str
    room_id: UUID
    created_by: BookingUserResponse
    start_at: datetime
    end_at: datetime
    status: BookingStatus
    participants: list[EmailStr]


class BookingRequest(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    room_id: UUID
    start_at: datetime
    end_at: datetime
    participants: list[EmailStr] = Field(default_factory=list)
