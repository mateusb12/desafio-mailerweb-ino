from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr

from source.models.email_delivery import EmailDeliveryStatus


class EmailDeliveryResponse(BaseModel):
    id: UUID
    recipient_user_id: UUID | None
    recipient_email: EmailStr
    subject: str
    body: str
    email_type: str
    status: EmailDeliveryStatus
    source_event_id: UUID | None
    delivered_at: datetime | None
    created_at: datetime
