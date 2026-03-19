"""Drop is_ai_focused column from firm_profiles

Revision ID: 0002_drop_is_ai_focused
Revises: 0001_initial_clean_schema
Create Date: 2026-03-19

is_ai_focused was a derived boolean computed from the investment thesis text.
It was never used in any API response or business logic and has been removed
from the FirmProfile model. This migration drops the column from existing DBs.
"""
from alembic import op

revision = '0002_drop_is_ai_focused'
down_revision = '0001_initial_clean_schema'
branch_labels = None
depends_on = None


def upgrade():
    op.execute("ALTER TABLE firm_profiles DROP COLUMN IF EXISTS is_ai_focused;")


def downgrade():
    op.execute("ALTER TABLE firm_profiles ADD COLUMN IF NOT EXISTS is_ai_focused BOOLEAN DEFAULT FALSE;")
