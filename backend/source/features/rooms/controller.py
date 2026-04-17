from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from source.core.database import get_db
from source.features.auth.dependencies import get_current_user
from source.features.rooms.schemas import RoomRequest, RoomResponse
from source.models.room import Room
from source.models.user import User

rooms_bp = APIRouter(prefix="/rooms", tags=["rooms"])


def get_room_or_404(db: Session, room_id: UUID) -> Room:
    room = db.query(Room).filter(Room.id == room_id).first()

    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sala não encontrada.",
        )

    return room


def ensure_room_name_is_available(db: Session, name: str) -> None:
    existing_room = db.query(Room).filter(Room.name == name).first()

    if existing_room:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Já existe uma sala com este nome.",
        )


@rooms_bp.get("", response_model=list[RoomResponse])
def list_rooms(
    _current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return db.query(Room).order_by(Room.name).all()


@rooms_bp.post("", response_model=RoomResponse, status_code=status.HTTP_201_CREATED)
def create_room(
    payload: RoomRequest,
    _current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ensure_room_name_is_available(db, payload.name)

    room = Room(name=payload.name, capacity=payload.capacity)
    db.add(room)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Já existe uma sala com este nome.",
        )

    db.refresh(room)
    return room


@rooms_bp.get("/{room_id}", response_model=RoomResponse)
def get_room(
    room_id: UUID,
    _current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return get_room_or_404(db, room_id)
