from sqlalchemy.orm import Session

from source.core.security import create_access_token, verify_password, hash_password
from source.models.user import User, UserRole


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

def register_user(db: Session, email: str, password: str) -> User | None:

    existing = db.query(User).filter(User.email == email).first()

    if existing:
        return None

    user = User(
        email=email,
        password_hash=hash_password(password),
        role=UserRole.USER,
        is_active=True,
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return user
