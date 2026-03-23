"""add email_subject, email_body_raw, introducer_name, introducer_email to firm_company_scores

Revision ID: f7a1b2c3d4e5
Revises: e6f0a1b2c3d4
Create Date: 2026-03-23 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = 'f7a1b2c3d4e5'
down_revision = 'e6f0a1b2c3d4'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('firm_company_scores', sa.Column('email_subject', sa.String(500), nullable=True))
    op.add_column('firm_company_scores', sa.Column('email_body_raw', sa.Text(), nullable=True))
    op.add_column('firm_company_scores', sa.Column('introducer_name', sa.String(255), nullable=True))
    op.add_column('firm_company_scores', sa.Column('introducer_email', sa.String(255), nullable=True))


def downgrade() -> None:
    op.drop_column('firm_company_scores', 'introducer_email')
    op.drop_column('firm_company_scores', 'introducer_name')
    op.drop_column('firm_company_scores', 'email_body_raw')
    op.drop_column('firm_company_scores', 'email_subject')
