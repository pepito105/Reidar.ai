"""unique constraint on firm_company_scores (company_id, user_id)

Revision ID: e6f0a1b2c3d4
Revises: d4e5f6a7b8c9
Create Date: 2026-03-23 00:00:00.000000

"""
from alembic import op

# revision identifiers, used by Alembic.
revision = 'e6f0a1b2c3d4'
down_revision = 'd4e5f6a7b8c9'
branch_labels = None
depends_on = None


def upgrade():
    op.execute(
        """
        CREATE UNIQUE INDEX IF NOT EXISTS
            uq_firm_company_scores_company_user
        ON firm_company_scores (company_id, user_id)
        """
    )


def downgrade():
    op.execute(
        "DROP INDEX IF EXISTS uq_firm_company_scores_company_user"
    )
