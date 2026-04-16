"""add booking audit fields

Revision ID: 97bb3372bd01
Revises: 665e322abcfa
Create Date: 2026-04-16 13:52:24.559154

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '97bb3372bd01'
down_revision: Union[str, Sequence[str], None] = '665e322abcfa'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('bookings', sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False))
    op.alter_column('bookings', 'updated_at', server_default=None)
    op.add_column('bookings', sa.Column('canceled_at', sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('bookings', 'canceled_at')
    op.drop_column('bookings', 'updated_at')
