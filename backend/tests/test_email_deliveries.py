from source.features.email_deliveries.service import register_email_delivery
from source.models.email_delivery import EmailDeliveryStatus


def test_email_delivery_routes_require_authentication(client):
    response = client.get("/email-deliveries")

    assert response.status_code == 401
    assert response.json() == {"detail": "Not authenticated"}


def test_email_deliveries_can_be_listed_by_authenticated_user(client, users, auth_headers, db_session):
    delivery = register_email_delivery(
        db_session,
        recipient_user_id=users["user"].id,
        recipient_email=users["user"].email,
        subject="Welcome",
        body="Emails processados pelo worker aparecerao aqui.",
        email_type="system_welcome",
        status=EmailDeliveryStatus.PROCESSED,
    )
    db_session.commit()

    response = client.get("/email-deliveries", headers=auth_headers(users["user"]))

    assert response.status_code == 200
    assert response.json()[0] == {
        "id": str(delivery.id),
        "recipient_user_id": str(users["user"].id),
        "recipient_email": users["user"].email,
        "subject": "Welcome",
        "body": "Emails processados pelo worker aparecerao aqui.",
        "email_type": "system_welcome",
        "status": "processed",
        "source_event_id": None,
        "delivered_at": None,
        "created_at": response.json()[0]["created_at"],
    }


def test_email_deliveries_do_not_expose_manual_create_route(client, users, auth_headers):
    response = client.post(
        "/email-deliveries",
        headers=auth_headers(users["user"]),
        json={
            "recipient_email": "ana@example.com",
            "subject": "Manual",
            "body": "Nao deve existir rota de criacao manual.",
        },
    )

    assert response.status_code == 405
