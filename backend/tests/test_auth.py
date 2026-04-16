import uuid

import pytest
from fastapi import Depends
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from source.core.database import engine, get_db
from source.core.security import hash_password
from source.features.auth.dependencies import require_roles
from source.main import app
from source.models.user import User, UserRole


@app.get("/_test/auth/admin-only")
def admin_only_route(_current_user: User = Depends(require_roles(UserRole.ADMIN))):
    return {"ok": True}


@pytest.fixture
def db_session():
    connection = engine.connect()
    transaction = connection.begin()
    session = Session(bind=connection)

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
def users(db_session):
    suffix = uuid.uuid4()

    active_user = User(
        name="Auth User",
        email=f"auth-user-{suffix}@example.com",
        password_hash=hash_password("UserPass123!"),
        role=UserRole.USER,
        is_active=True,
    )
    admin_user = User(
        name="Auth Admin",
        email=f"auth-admin-{suffix}@example.com",
        password_hash=hash_password("AdminPass123!"),
        role=UserRole.ADMIN,
        is_active=True,
    )
    inactive_user = User(
        name="Inactive User",
        email=f"auth-inactive-{suffix}@example.com",
        password_hash=hash_password("InactivePass123!"),
        role=UserRole.USER,
        is_active=False,
    )

    db_session.add_all([active_user, admin_user, inactive_user])
    db_session.flush()

    return {
        "user": active_user,
        "admin": admin_user,
        "inactive": inactive_user,
    }


def login(client, email: str, password: str):
    return client.post(
        "/auth/login",
        json={
            "email": email,
            "password": password,
        },
    )


def access_token(client, email: str, password: str) -> str:
    response = login(client, email, password)
    assert response.status_code == 200
    return response.json()["access_token"]


def test_valid_login_returns_token(client, users):
    response = login(client, users["user"].email, "UserPass123!")

    assert response.status_code == 200
    assert response.json()["token_type"] == "bearer"
    assert response.json()["access_token"]


def test_invalid_password_is_rejected(client, users):
    response = login(client, users["user"].email, "WrongPass123!")

    assert response.status_code == 401
    assert response.json() == {"detail": "Credenciais inválidas"}


def test_nonexistent_email_is_rejected(client):
    response = login(client, "missing-user@example.com", "UserPass123!")

    assert response.status_code == 401
    assert response.json() == {"detail": "Credenciais inválidas"}


def test_inactive_user_login_is_rejected(client, users):
    response = login(client, users["inactive"].email, "InactivePass123!")

    assert response.status_code == 401
    assert response.json() == {"detail": "Credenciais inválidas"}


def test_protected_route_without_token_is_rejected(client):
    response = client.get("/auth/me")

    assert response.status_code == 401
    assert response.json() == {"detail": "Not authenticated"}


def test_protected_route_with_malformed_token_is_rejected(client):
    response = client.get("/auth/me", headers={"Authorization": "Bearer not-a-jwt"})

    assert response.status_code == 401
    assert response.json() == {"detail": "Token inválido"}


def test_protected_route_with_valid_token_returns_current_user(client, users):
    token = access_token(client, users["user"].email, "UserPass123!")

    response = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})

    assert response.status_code == 200
    assert response.json() == {
        "id": str(users["user"].id),
        "email": users["user"].email,
        "role": "user",
        "is_active": True,
    }


def test_admin_role_required_denies_normal_user(client, users):
    token = access_token(client, users["user"].email, "UserPass123!")

    response = client.get("/_test/auth/admin-only", headers={"Authorization": f"Bearer {token}"})

    assert response.status_code == 403
    assert response.json() == {"detail": "Sem permissão para esta ação"}
