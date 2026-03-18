"""add scheduler_runs table

Revision ID: f6a0b2c3d4e5
Revises: e5f9a1b2c3d6
Create Date: 2026-03-18 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = 'f6a0b2c3d4e5'
down_revision = 'e5f9a1b2c3d6'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'scheduler_runs',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('job_name', sa.String(100), nullable=False),
        sa.Column('started_at', sa.DateTime(), nullable=False),
        sa.Column('completed_at', sa.DateTime(), nullable=True),
        sa.Column('status', sa.String(20), nullable=False, server_default='running'),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('stats', sa.JSON(), nullable=True),
        sa.Column('firm_count', sa.Integer(), nullable=True),
    )
    op.create_index('ix_scheduler_runs_job_name', 'scheduler_runs', ['job_name'])
    op.create_index('ix_scheduler_runs_started_at', 'scheduler_runs', ['started_at'])


def downgrade():
    op.drop_index('ix_scheduler_runs_started_at', table_name='scheduler_runs')
    op.drop_index('ix_scheduler_runs_job_name', table_name='scheduler_runs')
    op.drop_table('scheduler_runs')
