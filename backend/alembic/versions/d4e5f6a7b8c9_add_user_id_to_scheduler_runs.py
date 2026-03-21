"""add user_id to scheduler_runs

Revision ID: d4e5f6a7b8c9
Revises: c3d4e5f6a7b8
Create Date: 2026-03-21 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = 'd4e5f6a7b8c9'
down_revision = 'c3d4e5f6a7b8'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        'scheduler_runs',
        sa.Column('user_id', sa.String(255), nullable=True),
    )
    op.create_index(
        'ix_scheduler_runs_user_id',
        'scheduler_runs',
        ['user_id'],
        if_not_exists=True,
    )


def downgrade() -> None:
    op.drop_index('ix_scheduler_runs_user_id', table_name='scheduler_runs')
    op.drop_column('scheduler_runs', 'user_id')
