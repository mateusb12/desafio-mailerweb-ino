"""add unique email delivery source event

Revision ID: 3a6f1d9c2b80
Revises: 8f3d2c1b4a90
Create Date: 2026-04-17 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "3a6f1d9c2b80"
down_revision: Union[str, Sequence[str], None] = "8f3d2c1b4a90"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.drop_index(op.f("ix_email_deliveries_source_event_id"), table_name="email_deliveries")
    op.create_index(
        "uq_email_deliveries_source_event_id",
        "email_deliveries",
        ["source_event_id"],
        unique=True,
        postgresql_where=sa.text("source_event_id IS NOT NULL"),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index("uq_email_deliveries_source_event_id", table_name="email_deliveries")
    op.create_index(op.f("ix_email_deliveries_source_event_id"), "email_deliveries", ["source_event_id"], unique=False)
