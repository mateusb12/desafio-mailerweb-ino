"""add booking overlap exclusion constraint

Revision ID: 7b9c1d2e3f40
Revises: 5a1b2c3d4e5f
Create Date: 2026-04-17 11:20:00.000000

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "7b9c1d2e3f40"
down_revision: Union[str, Sequence[str], None] = "5a1b2c3d4e5f"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.execute("CREATE EXTENSION IF NOT EXISTS btree_gist")
    op.execute(
        """
        ALTER TABLE bookings
        ADD CONSTRAINT excl_bookings_active_room_time_overlap
        EXCLUDE USING gist (
            room_id WITH =,
            tstzrange(start_at, end_at, '[)') WITH &&
        )
        WHERE (status = 'active')
        """
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.execute(
        """
        ALTER TABLE bookings
        DROP CONSTRAINT IF EXISTS excl_bookings_active_room_time_overlap
        """
    )
