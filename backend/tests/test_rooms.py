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
