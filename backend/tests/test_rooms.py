import uuid


def test_list_rooms_requires_authentication(client):
    response = client.get("/rooms")

    assert response.status_code == 401
    assert response.json() == {"detail": "Not authenticated"}


def test_list_rooms_returns_rooms_ordered_by_name(client, auth_headers, users, room_factory):
    suffix = uuid.uuid4()
    sala_b = room_factory(name=f"sala-z-listagem-{suffix}", capacity=8)
    sala_a = room_factory(name=f"sala-a-listagem-{suffix}", capacity=4)

    response = client.get("/rooms", headers=auth_headers(users["user"]))

    assert response.status_code == 200

    rooms = response.json()
    returned_rooms = {room["name"]: room for room in rooms}
    relevant_room_names = [room["name"] for room in rooms if room["name"] in {sala_a.name, sala_b.name}]

    assert relevant_room_names == [sala_a.name, sala_b.name]
    assert returned_rooms[sala_a.name] == {
        "id": str(sala_a.id),
        "name": sala_a.name,
        "capacity": sala_a.capacity,
    }
    assert returned_rooms[sala_b.name] == {
        "id": str(sala_b.id),
        "name": sala_b.name,
        "capacity": sala_b.capacity,
    }


def test_create_room_requires_authentication(client):
    response = client.post(
        "/rooms",
        json={"name": f"sala-auth-{uuid.uuid4()}", "capacity": 6},
    )

    assert response.status_code == 401
    assert response.json() == {"detail": "Not authenticated"}


def test_create_room_returns_created_room(client, auth_headers, users):
    payload = {
        "name": f"sala-criacao-{uuid.uuid4()}",
        "capacity": 10,
    }

    response = client.post("/rooms", json=payload, headers=auth_headers(users["user"]))

    assert response.status_code == 201
    assert response.json()["name"] == payload["name"]
    assert response.json()["capacity"] == payload["capacity"]
    assert response.json()["id"]


def test_create_room_rejects_duplicate_name(client, auth_headers, users, room_factory):
    room = room_factory(name=f"sala-duplicada-{uuid.uuid4()}", capacity=4)

    response = client.post(
        "/rooms",
        json={"name": room.name, "capacity": 8},
        headers=auth_headers(users["user"]),
    )

    assert response.status_code == 409
    assert response.json() == {"detail": "Já existe uma sala com este nome."}


def test_create_room_rejects_invalid_capacity(client, auth_headers, users):
    response = client.post(
        "/rooms",
        json={"name": f"sala-capacidade-{uuid.uuid4()}", "capacity": 0},
        headers=auth_headers(users["user"]),
    )

    assert response.status_code == 422


def test_get_room_returns_room(client, auth_headers, users, room_factory):
    room = room_factory(name=f"sala-detalhe-{uuid.uuid4()}", capacity=12)

    response = client.get(f"/rooms/{room.id}", headers=auth_headers(users["user"]))

    assert response.status_code == 200
    assert response.json() == {
        "id": str(room.id),
        "name": room.name,
        "capacity": room.capacity,
    }


def test_get_room_returns_404_when_room_does_not_exist(client, auth_headers, users):
    response = client.get(f"/rooms/{uuid.uuid4()}", headers=auth_headers(users["user"]))

    assert response.status_code == 404
    assert response.json() == {"detail": "Sala não encontrada."}
