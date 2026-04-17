from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from source.core.database import get_db
from source.features.auth.dependencies import get_current_user
from source.features.rooms.schemas import RoomResponse
from source.models.room import Room
from source.models.user import User

rooms_bp = APIRouter(prefix="/rooms", tags=["rooms"])


@rooms_bp.get("", response_model=list[RoomResponse])
def list_rooms(
    _current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return db.query(Room).order_by(Room.name).all()
