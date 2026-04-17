from datetime import UTC, datetime, timedelta

from source.models.booking import Booking


BASE_START = datetime(2026, 5, 4, 10, 0, tzinfo=UTC)


def api_datetime(value):
    return value.isoformat().replace("+00:00", "Z")


def booking_payload(room_id, *, title="Planejamento", start_at=None, end_at=None, participants=None):
    start_at = start_at or BASE_START
    end_at = end_at or start_at + timedelta(hours=1)

    return {
        "title": title,
        "room_id": str(room_id),
        "start_at": start_at.isoformat(),
        "end_at": end_at.isoformat(),
        "participants": participants or ["ana@example.com", "bruno@example.com"],
    }


def auth_header(client, user, password="UserPass123!"):
    response = client.post(
        "/auth/login",
        json={
            "email": user.email,
            "password": password,
        },
    )
    assert response.status_code == 200
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def create_booking(client, headers, room_id, **overrides):
    response = client.post("/bookings", json=booking_payload(room_id, **overrides), headers=headers)
    assert response.status_code == 201
    return response


def test_booking_routes_require_authentication(client, room_factory):
    room = room_factory()
    booking_id = "00000000-0000-0000-0000-000000000001"

    responses = [
        client.get("/bookings"),
        client.post("/bookings", json=booking_payload(room.id)),
        client.put(f"/bookings/{booking_id}", json=booking_payload(room.id)),
        client.post(f"/bookings/{booking_id}/cancel"),
    ]

    assert [response.status_code for response in responses] == [401, 401, 401, 401]
    assert all(response.json() == {"detail": "Not authenticated"} for response in responses)


def test_create_booking_returns_active_booking_with_participants(client, users, room_factory):
    room = room_factory()
    headers = auth_header(client, users["user"])

    response = client.post(
        "/bookings",
        json=booking_payload(
            room.id,
            title="  Reunião semanal  ",
            participants=["ANA@example.com", "bruno@example.com", "ana@example.com"],
        ),
        headers=headers,
    )

    assert response.status_code == 201
    assert response.json() == {
        "id": response.json()["id"],
        "title": "Reunião semanal",
        "room_id": str(room.id),
        "created_by": {
            "id": str(users["user"].id),
            "email": users["user"].email,
            "role": "user",
            "is_active": True,
        },
        "start_at": response.json()["start_at"],
        "end_at": response.json()["end_at"],
        "status": "active",
        "participants": ["ana@example.com", "bruno@example.com"],
    }


def test_create_booking_rejects_start_at_after_end_at(client, users, room_factory):
    room = room_factory()
    headers = auth_header(client, users["user"])

    response = client.post(
        "/bookings",
        json=booking_payload(room.id, start_at=BASE_START + timedelta(hours=1), end_at=BASE_START),
        headers=headers,
    )

    assert response.status_code == 422
    assert response.json() == {"detail": "O horário de início deve ser anterior ao horário de fim."}


def test_create_booking_rejects_duration_shorter_than_minimum(client, users, room_factory):
    room = room_factory()
    headers = auth_header(client, users["user"])

    response = client.post(
        "/bookings",
        json=booking_payload(room.id, end_at=BASE_START + timedelta(minutes=14)),
        headers=headers,
    )

    assert response.status_code == 422
    assert response.json() == {"detail": "A reserva deve ter duração mínima de 15 minutos."}


def test_create_booking_rejects_duration_longer_than_maximum(client, users, room_factory):
    room = room_factory()
    headers = auth_header(client, users["user"])

    response = client.post(
        "/bookings",
        json=booking_payload(room.id, end_at=BASE_START + timedelta(hours=8, minutes=1)),
        headers=headers,
    )

    assert response.status_code == 422
    assert response.json() == {"detail": "A reserva deve ter duração máxima de 8 horas."}


def test_create_booking_rejects_dates_on_different_days(client, users, room_factory):
    room = room_factory()
    headers = auth_header(client, users["user"])

    response = client.post(
        "/bookings",
        json=booking_payload(
            room.id,
            start_at=datetime(2026, 5, 4, 23, 30, tzinfo=UTC),
            end_at=datetime(2026, 5, 5, 0, 30, tzinfo=UTC),
        ),
        headers=headers,
    )

    assert response.status_code == 422
    assert response.json() == {"detail": "A reserva deve começar e terminar no mesmo dia."}


def test_create_booking_rejects_overlapping_active_booking(client, users, room_factory):
    room = room_factory()
    headers = auth_header(client, users["user"])
    create_booking(client, headers, room.id, start_at=BASE_START, end_at=BASE_START + timedelta(hours=1))

    response = client.post(
        "/bookings",
        json=booking_payload(
            room.id,
            start_at=BASE_START + timedelta(minutes=30),
            end_at=BASE_START + timedelta(hours=1, minutes=30),
        ),
        headers=headers,
    )

    assert response.status_code == 409
    assert response.json() == {
        "detail": "Já existe uma reserva ativa para esta sala nesse intervalo. Ajuste o horário ou escolha outra sala."
    }


def test_create_booking_allows_adjacent_bookings(client, users, room_factory):
    room = room_factory()
    headers = auth_header(client, users["user"])
    create_booking(client, headers, room.id, start_at=BASE_START, end_at=BASE_START + timedelta(hours=1))

    response = client.post(
        "/bookings",
        json=booking_payload(
            room.id,
            start_at=BASE_START + timedelta(hours=1),
            end_at=BASE_START + timedelta(hours=2),
        ),
        headers=headers,
    )

    assert response.status_code == 201
    assert response.json()["start_at"] == api_datetime(BASE_START + timedelta(hours=1))
    assert response.json()["end_at"] == api_datetime(BASE_START + timedelta(hours=2))


def test_update_booking_changes_window_title_room_and_participants(client, users, room_factory):
    original_room = room_factory()
    new_room = room_factory()
    headers = auth_header(client, users["user"])
    booking = create_booking(client, headers, original_room.id).json()

    response = client.put(
        f"/bookings/{booking['id']}",
        json=booking_payload(
            new_room.id,
            title="Revisão técnica",
            start_at=BASE_START + timedelta(hours=2),
            end_at=BASE_START + timedelta(hours=3),
            participants=["carla@example.com"],
        ),
        headers=headers,
    )

    assert response.status_code == 200
    assert response.json()["title"] == "Revisão técnica"
    assert response.json()["room_id"] == str(new_room.id)
    assert response.json()["start_at"] == api_datetime(BASE_START + timedelta(hours=2))
    assert response.json()["end_at"] == api_datetime(BASE_START + timedelta(hours=3))
    assert response.json()["participants"] == ["carla@example.com"]


def test_update_booking_rejects_overlap_with_another_active_booking(client, users, room_factory):
    room = room_factory()
    headers = auth_header(client, users["user"])
    first = create_booking(client, headers, room.id, start_at=BASE_START, end_at=BASE_START + timedelta(hours=1)).json()
    create_booking(client, headers, room.id, start_at=BASE_START + timedelta(hours=2), end_at=BASE_START + timedelta(hours=3))

    response = client.put(
        f"/bookings/{first['id']}",
        json=booking_payload(
            room.id,
            start_at=BASE_START + timedelta(hours=2, minutes=30),
            end_at=BASE_START + timedelta(hours=3, minutes=30),
        ),
        headers=headers,
    )

    assert response.status_code == 409
    assert response.json() == {
        "detail": "Já existe uma reserva ativa para esta sala nesse intervalo. Ajuste o horário ou escolha outra sala."
    }


def test_only_booking_creator_can_update_or_cancel(client, users, user_factory, room_factory):
    room = room_factory()
    owner_headers = auth_header(client, users["user"])
    other_user = user_factory(password="OtherPass123!")
    other_headers = auth_header(client, other_user, "OtherPass123!")
    booking = create_booking(client, owner_headers, room.id).json()

    update_response = client.put(
        f"/bookings/{booking['id']}",
        json=booking_payload(room.id, title="Alteração indevida"),
        headers=other_headers,
    )
    cancel_response = client.post(f"/bookings/{booking['id']}/cancel", headers=other_headers)

    assert update_response.status_code == 403
    assert update_response.json() == {"detail": "Apenas o criador pode alterar esta reserva."}
    assert cancel_response.status_code == 403
    assert cancel_response.json() == {"detail": "Apenas o criador pode alterar esta reserva."}


def test_cancel_booking_marks_as_canceled_and_keeps_record(client, users, room_factory, db_session):
    room = room_factory()
    headers = auth_header(client, users["user"])
    booking = create_booking(client, headers, room.id).json()

    response = client.post(f"/bookings/{booking['id']}/cancel", headers=headers)

    assert response.status_code == 200
    assert response.json()["status"] == "canceled"

    persisted_booking = db_session.get(Booking, booking["id"])
    assert persisted_booking is not None
    assert persisted_booking.canceled_at is not None


def test_canceled_booking_does_not_block_same_room_same_time(client, users, room_factory):
    room = room_factory()
    headers = auth_header(client, users["user"])
    booking = create_booking(client, headers, room.id).json()
    cancel_response = client.post(f"/bookings/{booking['id']}/cancel", headers=headers)
    assert cancel_response.status_code == 200

    response = client.post("/bookings", json=booking_payload(room.id), headers=headers)

    assert response.status_code == 201
    assert response.json()["status"] == "active"


def test_canceled_booking_cannot_be_updated(client, users, room_factory):
    room = room_factory()
    headers = auth_header(client, users["user"])
    booking = create_booking(client, headers, room.id).json()
    cancel_response = client.post(f"/bookings/{booking['id']}/cancel", headers=headers)
    assert cancel_response.status_code == 200

    response = client.put(
        f"/bookings/{booking['id']}",
        json=booking_payload(room.id, title="Não deve alterar"),
        headers=headers,
    )

    assert response.status_code == 422
    assert response.json() == {"detail": "Reservas canceladas não podem ser editadas."}
