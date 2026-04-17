"""create email deliveries

Revision ID: 8f3d2c1b4a90
Revises: 2f4a7b8c9d10
Create Date: 2026-04-16 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = "8f3d2c1b4a90"
down_revision: Union[str, Sequence[str], None] = "2f4a7b8c9d10"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    email_delivery_status = postgresql.ENUM("processed", "delivered", name="email_delivery_status", create_type=False)
    email_delivery_status.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "email_deliveries",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("recipient_user_id", sa.Uuid(), nullable=True),
        sa.Column("recipient_email", sa.String(length=255), nullable=False),
        sa.Column("subject", sa.String(length=200), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("email_type", sa.String(length=50), nullable=False),
        sa.Column("status", email_delivery_status, nullable=False),
        sa.Column("source_event_id", sa.Uuid(), nullable=True),
        sa.Column("delivery_metadata", sa.JSON(), nullable=True),
        sa.Column("delivered_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["recipient_user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["source_event_id"], ["outbox_events.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.alter_column("email_deliveries", "created_at", server_default=None)
    op.alter_column("email_deliveries", "updated_at", server_default=None)
    op.create_index(op.f("ix_email_deliveries_created_at"), "email_deliveries", ["created_at"], unique=False)
    op.create_index(op.f("ix_email_deliveries_email_type"), "email_deliveries", ["email_type"], unique=False)
    op.create_index(op.f("ix_email_deliveries_recipient_email"), "email_deliveries", ["recipient_email"], unique=False)
    op.create_index(op.f("ix_email_deliveries_recipient_user_id"), "email_deliveries", ["recipient_user_id"], unique=False)
    op.create_index(op.f("ix_email_deliveries_source_event_id"), "email_deliveries", ["source_event_id"], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    email_delivery_status = postgresql.ENUM("processed", "delivered", name="email_delivery_status", create_type=False)

    op.drop_index(op.f("ix_email_deliveries_source_event_id"), table_name="email_deliveries")
    op.drop_index(op.f("ix_email_deliveries_recipient_user_id"), table_name="email_deliveries")
    op.drop_index(op.f("ix_email_deliveries_recipient_email"), table_name="email_deliveries")
    op.drop_index(op.f("ix_email_deliveries_email_type"), table_name="email_deliveries")
    op.drop_index(op.f("ix_email_deliveries_created_at"), table_name="email_deliveries")
    op.drop_table("email_deliveries")
    email_delivery_status.drop(op.get_bind(), checkfirst=True)
