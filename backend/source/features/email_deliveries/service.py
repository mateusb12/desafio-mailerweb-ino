from datetime import datetime
from typing import Any
from uuid import UUID

from sqlalchemy.orm import Session

from source.features.email_deliveries.schemas import EmailDeliveryResponse
from source.models.email_delivery import EmailDelivery, EmailDeliveryStatus


def register_email_delivery(
    db: Session,
    *,
    recipient_email: str,
    subject: str,
    body: str,
    email_type: str,
    recipient_user_id: UUID | None = None,
    status: EmailDeliveryStatus = EmailDeliveryStatus.PROCESSED,
    source_event_id: UUID | None = None,
    delivery_metadata: dict[str, Any] | None = None,
    delivered_at: datetime | None = None,
    delivery_id: UUID | None = None,
) -> EmailDelivery:
    delivery = EmailDelivery(
        id=delivery_id,
        recipient_user_id=recipient_user_id,
        recipient_email=recipient_email.strip().lower(),
        subject=subject.strip(),
        body=body,
        email_type=email_type.strip().lower(),
        status=status,
        source_event_id=source_event_id,
        delivery_metadata=delivery_metadata,
        delivered_at=delivered_at,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )

    db.add(delivery)
    return delivery


def _email_delivery_response(delivery: EmailDelivery) -> EmailDeliveryResponse:
    return EmailDeliveryResponse(
        id=delivery.id,
        recipient_user_id=delivery.recipient_user_id,
        recipient_email=delivery.recipient_email,
        subject=delivery.subject,
        body=delivery.body,
        email_type=delivery.email_type,
        status=delivery.status,
        source_event_id=delivery.source_event_id,
        delivered_at=delivery.delivered_at,
        created_at=delivery.created_at,
    )


def list_email_deliveries(db: Session) -> list[EmailDeliveryResponse]:
    deliveries = db.query(EmailDelivery).order_by(EmailDelivery.created_at.desc()).all()

    return [_email_delivery_response(delivery) for delivery in deliveries]
