from source.core.database import Base, engine

# importa todos os models para registrar no metadata
from source.models.user import User
from source.models.room import Room
from source.models.booking import Booking
from source.models.booking_participant import BookingParticipant
from source.models.outbox_event import OutboxEvent


def create_db():
    Base.metadata.create_all(bind=engine)
    print("Database tables created successfully.", flush=True)
