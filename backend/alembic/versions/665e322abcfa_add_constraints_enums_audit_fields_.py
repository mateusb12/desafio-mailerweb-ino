"""add constraints enums audit fields relationships

Revision ID: 665e322abcfa
Revises: edd25d9ba2eb
Create Date: 2026-04-16 13:45:54.594927

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = '665e322abcfa'
down_revision: Union[str, Sequence[str], None] = 'edd25d9ba2eb'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    booking_status = postgresql.ENUM('active', 'canceled', name='booking_status')
    outbox_status = postgresql.ENUM('pending', 'processed', 'failed', name='outbox_status')
    booking_status.create(op.get_bind(), checkfirst=True)
    outbox_status.create(op.get_bind(), checkfirst=True)

    op.create_check_constraint(
        'ck_room_capacity_positive',
        'rooms',
        'capacity > 0',
    )

    op.alter_column('bookings', 'status',
               existing_type=sa.VARCHAR(length=20),
               type_=booking_status,
               existing_nullable=False,
               postgresql_using='status::booking_status')
    op.add_column('outbox_events', sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False))
    op.alter_column('outbox_events', 'updated_at', server_default=None)
    op.alter_column('outbox_events', 'status',
               existing_type=sa.VARCHAR(length=20),
               type_=outbox_status,
               existing_nullable=False,
               postgresql_using='status::outbox_status')
    op.add_column('users', sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False))
    op.alter_column('users', 'updated_at', server_default=None)


def downgrade() -> None:
    """Downgrade schema."""
    booking_status = postgresql.ENUM('active', 'canceled', name='booking_status')
    outbox_status = postgresql.ENUM('pending', 'processed', 'failed', name='outbox_status')

    op.drop_column('users', 'updated_at')
    op.alter_column('outbox_events', 'status',
               existing_type=outbox_status,
               type_=sa.VARCHAR(length=20),
               existing_nullable=False,
               postgresql_using='status::text')
    op.drop_column('outbox_events', 'updated_at')
    op.alter_column('bookings', 'status',
               existing_type=booking_status,
               type_=sa.VARCHAR(length=20),
               existing_nullable=False,
               postgresql_using='status::text')
    op.drop_constraint('ck_room_capacity_positive', 'rooms', type_='check')
    outbox_status.drop(op.get_bind(), checkfirst=True)
    booking_status.drop(op.get_bind(), checkfirst=True)
