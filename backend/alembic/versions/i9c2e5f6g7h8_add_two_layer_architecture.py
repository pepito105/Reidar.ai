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
    # ── 1. Create companies table (idempotent) ───────────────────────────────
    op.execute("""
        CREATE TABLE IF NOT EXISTS companies (
            id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name        VARCHAR(255) NOT NULL,
            website     VARCHAR(500) UNIQUE,
            one_liner   VARCHAR(500),
            ai_summary  TEXT,
            founding_year       INTEGER,
            funding_stage       VARCHAR(50),
            funding_amount_usd  FLOAT,
            top_investors       JSON,
            sector              VARCHAR(100),
            team_size           VARCHAR(50),
            notable_traction    TEXT,
            source              VARCHAR(100),
            source_url          VARCHAR(1000),
            business_model      TEXT,
            target_customer     TEXT,
            traction_signals    TEXT,
            enriched_one_liner  TEXT,
            sources_visited     JSON,
            website_content     TEXT,
            scraped_at          TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_at          TIMESTAMPTZ
        )
    """)

    # pgvector embedding column (safe to re-run)
    op.execute("ALTER TABLE companies ADD COLUMN IF NOT EXISTS embedding vector(1536)")

    # Indexes (CREATE INDEX IF NOT EXISTS is safe to re-run)
    op.execute("CREATE INDEX IF NOT EXISTS ix_companies_name    ON companies (name)")
    op.execute("CREATE UNIQUE INDEX IF NOT EXISTS ix_companies_website ON companies (website)")

    # ── 2. Create firm_company_scores table (idempotent) ─────────────────────
    op.execute("""
        CREATE TABLE IF NOT EXISTS firm_company_scores (
            id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            company_id  UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
            user_id     VARCHAR(255) NOT NULL,
            slug        VARCHAR(255),
            -- Mandate scoring
            fit_score           INTEGER,
            ai_score            INTEGER,
            fit_reasoning       TEXT,
            thesis_tags         JSON,
            mandate_category    VARCHAR(100),
            -- Pipeline
            pipeline_status     VARCHAR(50) NOT NULL DEFAULT 'new',
            notes               TEXT,
            founder_contacts    JSON,
            -- Analysis
            comparable_companies    JSON,
            recommended_next_step   TEXT,
            red_flags               TEXT,
            conviction_score        INTEGER,
            next_action             VARCHAR(500),
            next_action_due         TIMESTAMP,
            key_risks               TEXT,
            bull_case               TEXT,
            -- Diligence
            meeting_notes       JSON,
            activity_log        JSON,
            memo                TEXT,
            memo_files          JSON,
            memo_generated_at   TIMESTAMP,
            -- Signal tracking
            last_refreshed_at   TIMESTAMP,
            has_unseen_signals  BOOLEAN NOT NULL DEFAULT FALSE,
            -- Portfolio
            is_portfolio        BOOLEAN DEFAULT FALSE,
            portfolio_status    VARCHAR(50),
            investment_date     TIMESTAMP,
            check_size_usd      FLOAT,
            co_investors        JSON,
            -- Research
            research_status         TEXT,
            research_completed_at   TIMESTAMPTZ,
            -- Timestamps
            created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_at  TIMESTAMPTZ,
            -- Constraints
            CONSTRAINT uq_firm_company_score UNIQUE (company_id, user_id)
        )
    """)

    op.execute("CREATE INDEX IF NOT EXISTS ix_fcs_user_id          ON firm_company_scores (user_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_fcs_company_id       ON firm_company_scores (company_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_fcs_pipeline_status  ON firm_company_scores (pipeline_status)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_fcs_fit_score        ON firm_company_scores (fit_score)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_fcs_slug             ON firm_company_scores (slug)")

    # ── 3. Drop startups table if it still exists ────────────────────────────
    op.execute("DROP TABLE IF EXISTS startups CASCADE")


def downgrade() -> None:
    # Restore startups table (minimal — full schema not preserved)
    op.execute("""
        CREATE TABLE IF NOT EXISTS startups (
            id      SERIAL PRIMARY KEY,
            name    VARCHAR(255) NOT NULL,
            user_id VARCHAR(255)
        )
    """)
    op.execute("DROP TABLE IF EXISTS firm_company_scores CASCADE")
    op.execute("DROP TABLE IF EXISTS companies CASCADE")
