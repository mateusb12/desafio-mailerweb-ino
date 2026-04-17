from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from source.core.database import get_db
from source.features.auth.dependencies import get_current_user
from source.features.dashboard.schemas import DashboardMetricsResponse
from source.features.dashboard.service import get_dashboard_metrics
from source.models.user import User

dashboard_bp = APIRouter(prefix="/dashboard", tags=["dashboard"])


@dashboard_bp.get("/metrics", response_model=DashboardMetricsResponse)
def metrics(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return get_dashboard_metrics(db, current_user)
