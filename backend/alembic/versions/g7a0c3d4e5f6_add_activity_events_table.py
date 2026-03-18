"""add activity_events table

Revision ID: g7a0c3d4e5f6
Revises: f6a0b2c3d4e5
Create Date: 2026-03-18
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = 'g7a0c3d4e5f6'
down_revision = 'f6a0b2c3d4e5'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'activity_events',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column('user_id', sa.String(255), nullable=True),
        sa.Column('startup_id', sa.Integer(), nullable=False),
        sa.Column('startup_name', sa.String(255), nullable=True),
        sa.Column('event_type', sa.String(50), nullable=False),
        sa.Column('title', sa.String(500), nullable=False),
        sa.Column('detail', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
    )
    op.create_index('ix_activity_events_startup_id', 'activity_events', ['startup_id'])
    op.create_index('ix_activity_events_user_id', 'activity_events', ['user_id'])
    op.create_index('ix_activity_events_event_type', 'activity_events', ['event_type'])
    op.create_index('ix_activity_events_created_at', 'activity_events', ['created_at'])


def downgrade():
    op.drop_index('ix_activity_events_created_at', table_name='activity_events')
    op.drop_index('ix_activity_events_event_type', table_name='activity_events')
    op.drop_index('ix_activity_events_user_id', table_name='activity_events')
    op.drop_index('ix_activity_events_startup_id', table_name='activity_events')
    op.drop_table('activity_events')
