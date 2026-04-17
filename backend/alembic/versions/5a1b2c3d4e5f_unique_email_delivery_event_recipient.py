"""unique email delivery per source event and recipient

Revision ID: 5a1b2c3d4e5f
Revises: 3a6f1d9c2b80
Create Date: 2026-04-17 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "5a1b2c3d4e5f"
down_revision: Union[str, Sequence[str], None] = "3a6f1d9c2b80"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.drop_index("uq_email_deliveries_source_event_id", table_name="email_deliveries")
    op.create_index(
        "uq_email_deliveries_source_event_recipient_email",
        "email_deliveries",
        ["source_event_id", "recipient_email"],
        unique=True,
        postgresql_where=sa.text("source_event_id IS NOT NULL"),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index("uq_email_deliveries_source_event_recipient_email", table_name="email_deliveries")
    op.create_index(
        "uq_email_deliveries_source_event_id",
        "email_deliveries",
        ["source_event_id"],
        unique=True,
        postgresql_where=sa.text("source_event_id IS NOT NULL"),
    )
