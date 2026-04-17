from datetime import UTC, datetime, timedelta

from source.features.email_deliveries.service import register_email_delivery
from source.models.email_delivery import EmailDeliveryStatus
from source.models.outbox_event import OutboxEvent, OutboxStatus


def booking_payload(room_id, *, title, start_at, end_at, participants=None):
    return {
        "title": title,
        "room_id": str(room_id),
        "start_at": start_at.isoformat(),
        "end_at": end_at.isoformat(),
        "participants": participants or [],
    }


def test_dashboard_metrics_requires_authentication(client):
    response = client.get("/dashboard/metrics")

    assert response.status_code == 401
    assert response.json() == {"detail": "Not authenticated"}


def test_dashboard_metrics_returns_system_summary(client, users, auth_headers, room_factory, db_session):
    headers = auth_headers(users["user"])
    baseline = client.get("/dashboard/metrics", headers=headers).json()
    next_booking_start = datetime.now(UTC) + timedelta(minutes=5)
    room = room_factory(name="Sala Dashboard Futuro", capacity=8)

    booking_response = client.post(
        "/bookings",
        headers=headers,
        json=booking_payload(
            room.id,
            title="Proxima reserva",
            start_at=next_booking_start,
            end_at=next_booking_start + timedelta(hours=1),
            participants=["participante@example.com"],
        ),
    )
    assert booking_response.status_code == 201

    register_email_delivery(
        db_session,
        recipient_email=users["user"].email,
        subject="Processado",
        body="Email processado.",
        email_type="booking_created",
        status=EmailDeliveryStatus.PROCESSED,
    )
    register_email_delivery(
        db_session,
        recipient_email="outro@example.com",
        subject="Entregue",
        body="Email entregue.",
        email_type="booking_updated",
        status=EmailDeliveryStatus.DELIVERED,
    )
    db_session.add(
        OutboxEvent(
            aggregate_type="booking",
            aggregate_id="dashboard-test",
            event_type="booking_failed",
            payload={},
            status=OutboxStatus.FAILED,
        )
    )
    db_session.commit()

    response = client.get("/dashboard/metrics", headers=headers)

    assert response.status_code == 200
    data = response.json()
    assert data == {
        "rooms_count": baseline["rooms_count"] + 1,
        "bookings_count": baseline["bookings_count"] + 1,
        "active_bookings_count": baseline["active_bookings_count"] + 1,
        "today_active_bookings_count": baseline["today_active_bookings_count"] + 1,
        "my_upcoming_bookings_count": baseline["my_upcoming_bookings_count"] + 1,
        "email_deliveries_count": baseline["email_deliveries_count"] + 2,
        "outbox_events_count": baseline["outbox_events_count"] + 2,
        "processed_email_deliveries_count": baseline["processed_email_deliveries_count"] + 1,
        "pending_outbox_events_count": baseline["pending_outbox_events_count"] + 1,
        "failed_outbox_events_count": baseline["failed_outbox_events_count"] + 1,
        "next_booking": {
            "id": booking_response.json()["id"],
            "title": "Proxima reserva",
            "room_id": str(room.id),
            "room_name": "Sala Dashboard Futuro",
            "start_at": data["next_booking"]["start_at"],
            "end_at": data["next_booking"]["end_at"],
            "participants_count": 1,
        },
    }
