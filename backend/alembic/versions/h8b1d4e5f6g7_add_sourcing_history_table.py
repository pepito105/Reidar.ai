"""add sourcing_history table

Revision ID: h8b1d4e5f6g7
Revises: g7a0c3d4e5f6
Create Date: 2026-03-18

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = 'h8b1d4e5f6g7'
down_revision = 'g7a0c3d4e5f6'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'sourcing_history',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column('user_id', sa.String(255), nullable=True),
        sa.Column('query', sa.Text(), nullable=False),
        sa.Column('ran_at', sa.DateTime(), nullable=False),
        sa.Column('results_count', sa.Integer(), nullable=True),
        sa.Column('new_companies_added', sa.Integer(), nullable=True),
    )
    op.create_index('ix_sourcing_history_user_id', 'sourcing_history', ['user_id'])
    op.create_index('ix_sourcing_history_ran_at', 'sourcing_history', ['ran_at'])


def downgrade() -> None:
    op.drop_index('ix_sourcing_history_ran_at', table_name='sourcing_history')
    op.drop_index('ix_sourcing_history_user_id', table_name='sourcing_history')
    op.drop_table('sourcing_history')
