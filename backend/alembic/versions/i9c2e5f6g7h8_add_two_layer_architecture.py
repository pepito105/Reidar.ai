"""add two-layer company architecture (companies + firm_company_scores, drop startups)

Revision ID: i9c2e5f6g7h8
Revises: h8b1d4e5f6g7
Create Date: 2026-03-19

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = 'i9c2e5f6g7h8'
down_revision = 'h8b1d4e5f6g7'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── 1. Create companies table ────────────────────────────────────────────
    op.create_table(
        'companies',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('website', sa.String(500), nullable=True, unique=True),
        sa.Column('one_liner', sa.String(500), nullable=True),
        sa.Column('ai_summary', sa.Text(), nullable=True),
        sa.Column('founding_year', sa.Integer(), nullable=True),
        sa.Column('funding_stage', sa.String(50), nullable=True),
        sa.Column('funding_amount_usd', sa.Float(), nullable=True),
        sa.Column('top_investors', sa.JSON(), nullable=True),
        sa.Column('sector', sa.String(100), nullable=True),
        sa.Column('team_size', sa.String(50), nullable=True),
        sa.Column('notable_traction', sa.Text(), nullable=True),
        sa.Column('source', sa.String(100), nullable=True),
        sa.Column('source_url', sa.String(1000), nullable=True),
        sa.Column('business_model', sa.Text(), nullable=True),
        sa.Column('target_customer', sa.Text(), nullable=True),
        sa.Column('traction_signals', sa.Text(), nullable=True),
        sa.Column('enriched_one_liner', sa.Text(), nullable=True),
        sa.Column('sources_visited', sa.JSON(), nullable=True),
        sa.Column('website_content', sa.Text(), nullable=True),
        sa.Column('scraped_at', sa.DateTime(timezone=False), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
    )
    # pgvector embedding column added separately (requires extension)
    op.execute("ALTER TABLE companies ADD COLUMN IF NOT EXISTS embedding vector(1536)")

    op.create_index('ix_companies_name', 'companies', ['name'])
    op.create_index('ix_companies_website', 'companies', ['website'], unique=True)

    # ── 2. Create firm_company_scores table ──────────────────────────────────
    op.create_table(
        'firm_company_scores',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column('company_id', UUID(as_uuid=True), sa.ForeignKey('companies.id', ondelete='CASCADE'), nullable=False),
        sa.Column('user_id', sa.String(255), nullable=False),
        sa.Column('slug', sa.String(255), nullable=True),
        # Mandate scoring
        sa.Column('fit_score', sa.Integer(), nullable=True),
        sa.Column('ai_score', sa.Integer(), nullable=True),
        sa.Column('fit_reasoning', sa.Text(), nullable=True),
        sa.Column('thesis_tags', sa.JSON(), nullable=True),
        sa.Column('mandate_category', sa.String(100), nullable=True),
        # Pipeline
        sa.Column('pipeline_status', sa.String(50), nullable=False, server_default='new'),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('founder_contacts', sa.JSON(), nullable=True),
        # Analysis
        sa.Column('comparable_companies', sa.JSON(), nullable=True),
        sa.Column('recommended_next_step', sa.Text(), nullable=True),
        sa.Column('red_flags', sa.Text(), nullable=True),
        sa.Column('conviction_score', sa.Integer(), nullable=True),
        sa.Column('next_action', sa.String(500), nullable=True),
        sa.Column('next_action_due', sa.DateTime(), nullable=True),
        sa.Column('key_risks', sa.Text(), nullable=True),
        sa.Column('bull_case', sa.Text(), nullable=True),
        # Diligence
        sa.Column('meeting_notes', sa.JSON(), nullable=True),
        sa.Column('activity_log', sa.JSON(), nullable=True),
        sa.Column('memo', sa.Text(), nullable=True),
        sa.Column('memo_files', sa.JSON(), nullable=True),
        sa.Column('memo_generated_at', sa.DateTime(), nullable=True),
        # Signal tracking
        sa.Column('last_refreshed_at', sa.DateTime(), nullable=True),
        sa.Column('has_unseen_signals', sa.Boolean(), nullable=False, server_default='false'),
        # Portfolio
        sa.Column('is_portfolio', sa.Boolean(), nullable=True, server_default='false'),
        sa.Column('portfolio_status', sa.String(50), nullable=True),
        sa.Column('investment_date', sa.DateTime(), nullable=True),
        sa.Column('check_size_usd', sa.Float(), nullable=True),
        sa.Column('co_investors', sa.JSON(), nullable=True),
        # Research
        sa.Column('research_status', sa.Text(), nullable=True),
        sa.Column('research_completed_at', sa.DateTime(timezone=True), nullable=True),
        # Timestamps
        sa.Column('created_at', sa.DateTime(timezone=False), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        # Constraints
        sa.UniqueConstraint('company_id', 'user_id', name='uq_firm_company_score'),
    )

    op.create_index('ix_fcs_user_id', 'firm_company_scores', ['user_id'])
    op.create_index('ix_fcs_company_id', 'firm_company_scores', ['company_id'])
    op.create_index('ix_fcs_pipeline_status', 'firm_company_scores', ['pipeline_status'])
    op.create_index('ix_fcs_fit_score', 'firm_company_scores', ['fit_score'])
    op.create_index('ix_fcs_slug', 'firm_company_scores', ['slug'])

    # ── 3. Drop startups table ───────────────────────────────────────────────
    op.drop_table('startups')


def downgrade() -> None:
    # Restore startups table (minimal — full schema not preserved)
    op.create_table(
        'startups',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('user_id', sa.String(255), nullable=True),
    )
    op.drop_table('firm_company_scores')
    op.drop_table('companies')
