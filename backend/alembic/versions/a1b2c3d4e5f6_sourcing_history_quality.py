"""Add quality tracking fields to sourcing_history

Revision ID: a1b2c3d4e5f6
Revises: 0002_drop_is_ai_focused
Create Date: 2026-03-19

Adds four columns to sourcing_history to track per-query quality metrics:
  - urls_found: URLs that passed the is_company_url filter
  - companies_extracted: companies Claude marked as relevant
  - high_fit_count: saved companies with fit_score >= 4
  - quality_score: high_fit_count / max(results_count, 1)
"""
from alembic import op

revision = 'a1b2c3d4e5f6'
down_revision = '0002_drop_is_ai_focused'
branch_labels = None
depends_on = None


def upgrade():
    op.execute("""
        ALTER TABLE sourcing_history
            ADD COLUMN IF NOT EXISTS urls_found INTEGER DEFAULT 0,
            ADD COLUMN IF NOT EXISTS companies_extracted INTEGER DEFAULT 0,
            ADD COLUMN IF NOT EXISTS high_fit_count INTEGER DEFAULT 0,
            ADD COLUMN IF NOT EXISTS quality_score DOUBLE PRECISION DEFAULT 0.0;
    """)


def downgrade():
    op.execute("""
        ALTER TABLE sourcing_history
            DROP COLUMN IF EXISTS urls_found,
            DROP COLUMN IF EXISTS companies_extracted,
            DROP COLUMN IF EXISTS high_fit_count,
            DROP COLUMN IF EXISTS quality_score;
    """)
