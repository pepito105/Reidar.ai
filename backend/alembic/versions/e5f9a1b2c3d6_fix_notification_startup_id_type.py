"""fix notification startup_id type

Revision ID: e5f9a1b2c3d6
Revises: d4e8f1a2b3c5
Create Date: 2026-03-18

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = 'e5f9a1b2c3d6'
down_revision: Union[str, None] = 'd4e8f1a2b3c5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_column('notifications', 'startup_id')
    op.add_column('notifications', sa.Column('startup_id', sa.Integer(), nullable=True))
    op.create_index(op.f('ix_notifications_startup_id'), 'notifications', ['startup_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_notifications_startup_id'), table_name='notifications')
    op.drop_column('notifications', 'startup_id')
    op.add_column('notifications', sa.Column('startup_id', postgresql.UUID(as_uuid=True), nullable=True))
