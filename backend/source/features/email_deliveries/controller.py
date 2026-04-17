from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from source.core.database import get_db
from source.features.auth.dependencies import get_current_user
from source.features.email_deliveries.schemas import EmailDeliveryResponse
from source.features.email_deliveries.service import list_email_deliveries
from source.models.user import User

email_deliveries_bp = APIRouter(prefix="/email-deliveries", tags=["email-deliveries"])


@email_deliveries_bp.get("", response_model=list[EmailDeliveryResponse])
def get_email_deliveries(
    _current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return list_email_deliveries(db)
