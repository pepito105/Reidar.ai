"""add waitlist table

Revision ID: b2c3d4e5f6a7
Revises: f6a0b2c3d4e5
Create Date: 2026-03-20

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = 'b2c3d4e5f6a7'
down_revision = 'a1b2c3d4e5f6'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'waitlist',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('email', sa.String(), nullable=False),
        sa.Column('firm_name', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
    )
    op.create_index('ix_waitlist_email', 'waitlist', ['email'])


def downgrade() -> None:
    op.drop_index('ix_waitlist_email', table_name='waitlist')
    op.drop_table('waitlist')
