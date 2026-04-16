from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from source.core.database import get_db
from source.features.auth.dependencies import get_current_user
from source.features.auth.schemas import LoginRequest, TokenResponse, RegisterRequest
from source.features.auth.service import login_user, register_user
from source.models.user import User

auth_bp = APIRouter(prefix="/auth", tags=["auth"])


@auth_bp.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    access_token = login_user(db, payload.email, payload.password)

    if not access_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciais inválidas",
        )

    return TokenResponse(access_token=access_token)


@auth_bp.get("/me")
def me(current_user: User = Depends(get_current_user)):
    return {
        "id": str(current_user.id),
        "email": current_user.email,
        "role": current_user.role.value,
        "is_active": current_user.is_active,
    }

@auth_bp.post("/register", response_model=TokenResponse)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):

    user = register_user(
        db,
        payload.name,
        payload.email,
        payload.password,
    )

    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email já cadastrado",
        )

    access_token = login_user(db, payload.email, payload.password)

    return TokenResponse(access_token=access_token)