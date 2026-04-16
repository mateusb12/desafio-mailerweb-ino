from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from source.core.config import settings
from source.core.database import get_db
from source.features.dev.mock_seed_service import populate_mock_data

dev_bp = APIRouter(prefix="/dev", tags=["dev"])


@dev_bp.post("/populate-mock-data")
def populate_frontend_mock_data(db: Session = Depends(get_db)):
    if settings.environment.lower() not in {"development", "dev", "local", "test", "testing"}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Mock data population is only available in development or test environments.",
        )

    summary = populate_mock_data(db)

    return {
        "message": "Frontend mock data populated.",
        "summary": summary,
    }
