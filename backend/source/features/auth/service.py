from sqlalchemy.orm import Session

from source.core.security import create_access_token, verify_password
from source.models.user import User


def authenticate_user(db: Session, email: str, password: str) -> User | None:
    user = db.query(User).filter(User.email == email).first()

    if not user:
        return None

    if not user.is_active:
        return None

    if not verify_password(password, user.password_hash):
        return None

    return user


def login_user(db: Session, email: str, password: str) -> str | None:
    user = authenticate_user(db, email, password)

    if not user:
        return None

    return create_access_token(
        {
            "sub": str(user.id),
            "role": user.role.value,
            "email": user.email,
        }
    )