from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from source.core.config import settings
from source.core.database import get_db
from source.features.dev.mock_seed_service import clear_mock_data, populate_mock_data

dev_bp = APIRouter(prefix="/dev", tags=["dev"])


def ensure_dev_environment():
    if settings.environment.lower() not in {"development", "dev", "local", "test", "testing"}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Mock data population is only available in development or test environments.",
        )


@dev_bp.post("/populate-mock-data")
def populate_frontend_mock_data(db: Session = Depends(get_db)):
    ensure_dev_environment()

    summary = populate_mock_data(db)

    return {
        "message": "Frontend mock data populated.",
        "summary": summary,
    }


@dev_bp.post("/clear-mock-data")
def clear_frontend_mock_data(db: Session = Depends(get_db)):
    ensure_dev_environment()

    summary = clear_mock_data(db)

    return {
        "message": "Frontend mock data cleared.",
        "summary": summary,
    }
