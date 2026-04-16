"""add user role for auth

Revision ID: c1b7a9d42c55
Revises: 97bb3372bd01
Create Date: 2026-04-16 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = "c1b7a9d42c55"
down_revision: Union[str, Sequence[str], None] = "97bb3372bd01"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    user_role = postgresql.ENUM("admin", "user", name="user_role")
    user_role.create(op.get_bind(), checkfirst=True)

    op.add_column(
        "users",
        sa.Column(
            "role",
            user_role,
            server_default="user",
            nullable=False,
        ),
    )
    op.alter_column("users", "role", server_default=None)


def downgrade() -> None:
    """Downgrade schema."""
    user_role = postgresql.ENUM("admin", "user", name="user_role")

    op.drop_column("users", "role")
    user_role.drop(op.get_bind(), checkfirst=True)
