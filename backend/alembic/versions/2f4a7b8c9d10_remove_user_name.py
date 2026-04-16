"""remove user name

Revision ID: 2f4a7b8c9d10
Revises: c1b7a9d42c55
Create Date: 2026-04-16 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "2f4a7b8c9d10"
down_revision: Union[str, Sequence[str], None] = "c1b7a9d42c55"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.drop_column("users", "name")


def downgrade() -> None:
    """Downgrade schema."""
    op.add_column("users", sa.Column("name", sa.String(length=120), nullable=True))
