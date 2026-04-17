import os
import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import event
from sqlalchemy.orm import Session

os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key")

from source.core.database import engine, get_db  # noqa: E402
from source.core.security import hash_password  # noqa: E402
from source.main import app  # noqa: E402
from source.models.room import Room  # noqa: E402
from source.models.user import User, UserRole  # noqa: E402


@pytest.fixture
def db_session():
    connection = engine.connect()
    transaction = connection.begin()
    session = Session(bind=connection)
    session.begin_nested()

    @event.listens_for(session, "after_transaction_end")
    def restart_savepoint(session_, transaction_):
        if transaction_.nested and not transaction_.parent.nested:
            session_.begin_nested()

    try:
        yield session
    finally:
        session.close()
        if transaction.is_active:
            transaction.rollback()
        connection.close()


@pytest.fixture
def client(db_session):
    def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    try:
        yield TestClient(app)
    finally:
        app.dependency_overrides.clear()


@pytest.fixture
def user_factory(db_session):
    def make_user(
        *,
        email: str | None = None,
        password: str = "UserPass123!",
        role: UserRole = UserRole.USER,
        is_active: bool = True,
    ) -> User:
        user = User(
            email=email or f"user-{uuid.uuid4()}@example.com",
            password_hash=hash_password(password),
            role=role,
            is_active=is_active,
        )
        db_session.add(user)
        db_session.flush()
        return user

    return make_user


@pytest.fixture
def users(user_factory):
    return {
        "user": user_factory(email=f"auth-user-{uuid.uuid4()}@example.com", password="UserPass123!"),
        "admin": user_factory(email=f"auth-admin-{uuid.uuid4()}@example.com", password="AdminPass123!", role=UserRole.ADMIN),
        "inactive": user_factory(email=f"auth-inactive-{uuid.uuid4()}@example.com", password="InactivePass123!", is_active=False),
    }


@pytest.fixture
def auth_headers(client):
    def make_headers(user: User, password: str = "UserPass123!") -> dict[str, str]:
        response = client.post(
            "/auth/login",
            json={
                "email": user.email,
                "password": password,
            },
        )
        assert response.status_code == 200
        return {"Authorization": f"Bearer {response.json()['access_token']}"}

    return make_headers


@pytest.fixture
def room_factory(db_session):
    def make_room(*, name: str | None = None, capacity: int = 4) -> Room:
        room = Room(
            name=name or f"sala-{uuid.uuid4()}",
            capacity=capacity,
        )
        db_session.add(room)
        db_session.flush()
        return room

    return make_room
