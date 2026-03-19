"""drop startups table and add source fields to firm_company_scores

Revision ID: k2e4f6g7h8i9
Revises: j1d3f5g6h7i8
Create Date: 2026-03-19
"""
from alembic import op

# revision identifiers, used by Alembic.
revision = 'k2e4f6g7h8i9'
down_revision = 'j1d3f5g6h7i8'
branch_labels = None
depends_on = None


def upgrade():
    # FIX 1 — Drop the old startups table (was missed in i9c2e5f6g7h8)
    op.execute("DROP TABLE IF EXISTS startups CASCADE;")

    # FIX 2 — Add source tracking fields to firm_company_scores
    op.execute("""
        ALTER TABLE firm_company_scores
            ADD COLUMN IF NOT EXISTS source VARCHAR(200),
            ADD COLUMN IF NOT EXISTS source_url VARCHAR(500);
    """)


def downgrade():
    op.execute("""
        ALTER TABLE firm_company_scores
            DROP COLUMN IF EXISTS source,
            DROP COLUMN IF EXISTS source_url;
    """)
