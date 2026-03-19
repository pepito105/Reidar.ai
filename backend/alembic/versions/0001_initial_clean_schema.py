"""Initial clean schema — squashed migration

Revision ID: 0001_initial_clean_schema
Revises:
Create Date: 2026-03-19

Replaces the entire prior migration chain with a single idempotent script
that reflects the current state of all SQLAlchemy models:

  firm_profiles, companies, firm_company_scores, company_signals,
  activity_events, notifications, associate_memory,
  sourcing_history, scheduler_runs

Tables are created in FK-dependency order. All statements use
IF NOT EXISTS / IF EXISTS so the migration is safe to re-run.
"""
from alembic import op


# revision identifiers, used by Alembic.
revision = '0001_initial_clean_schema'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    # ------------------------------------------------------------------
    # 0. Extensions
    # ------------------------------------------------------------------
    op.execute("CREATE EXTENSION IF NOT EXISTS vector;")

    # ------------------------------------------------------------------
    # 1. firm_profiles  (no FK deps)
    # ------------------------------------------------------------------
    op.execute("""
        CREATE TABLE IF NOT EXISTS firm_profiles (
            id                      SERIAL PRIMARY KEY,
            firm_name               VARCHAR(255) NOT NULL,
            investment_stages       JSON,
            geography_focus         JSON,
            check_size_min          INTEGER,
            check_size_max          INTEGER,
            investment_thesis        TEXT,
            excluded_sectors        JSON,
            fit_threshold           INTEGER DEFAULT 3,
            user_id                 VARCHAR(255),
            is_active               BOOLEAN DEFAULT TRUE,
            notify_top_match        BOOLEAN DEFAULT TRUE,
            notify_diligence_signal BOOLEAN DEFAULT TRUE,
            notify_weekly_summary   BOOLEAN DEFAULT TRUE,
            notify_min_fit_score    INTEGER DEFAULT 4,
            notification_emails     TEXT DEFAULT 'remi@balassanian.com',
            mandate_buckets         JSON,
            firm_website            VARCHAR(500),
            firm_context            JSON
        );
    """)
    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_firm_profiles_id
            ON firm_profiles (id);
    """)
    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_firm_profiles_user_id
            ON firm_profiles (user_id);
    """)

    # ------------------------------------------------------------------
    # 2. companies  (no FK deps — has pgvector embedding)
    # ------------------------------------------------------------------
    op.execute("""
        CREATE TABLE IF NOT EXISTS companies (
            id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name                  VARCHAR(255) NOT NULL,
            website               VARCHAR(500) UNIQUE,
            one_liner             VARCHAR(500),
            ai_summary            TEXT,
            founding_year         INTEGER,
            funding_stage         VARCHAR(50),
            funding_amount_usd    DOUBLE PRECISION,
            top_investors         JSON,
            sector                VARCHAR(100),
            team_size             VARCHAR(50),
            notable_traction      TEXT,
            source                VARCHAR(100),
            source_url            VARCHAR(1000),
            business_model        TEXT,
            target_customer       TEXT,
            traction_signals      TEXT,
            enriched_one_liner    TEXT,
            sources_visited       JSON,
            website_content       TEXT,
            slug                  VARCHAR(500) UNIQUE,
            research_status       VARCHAR(50) DEFAULT 'pending',
            research_completed_at TIMESTAMPTZ,
            key_risks             TEXT,
            bull_case             TEXT,
            red_flags             TEXT,
            embedding             vector(1536),
            scraped_at            TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_at            TIMESTAMPTZ
        );
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_companies_id      ON companies (id);")
    op.execute("CREATE INDEX IF NOT EXISTS ix_companies_name    ON companies (name);")
    op.execute("CREATE INDEX IF NOT EXISTS ix_companies_website ON companies (website);")
    op.execute("CREATE INDEX IF NOT EXISTS ix_companies_slug    ON companies (slug);")

    # ------------------------------------------------------------------
    # 3. firm_company_scores  (FK → companies)
    # ------------------------------------------------------------------
    op.execute("""
        CREATE TABLE IF NOT EXISTS firm_company_scores (
            id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            company_id            UUID NOT NULL
                                      REFERENCES companies(id) ON DELETE CASCADE,
            user_id               VARCHAR(255) NOT NULL,

            -- Mandate scoring
            fit_score             INTEGER,
            fit_reasoning         TEXT,
            thesis_tags           JSON,
            mandate_category      VARCHAR(100),

            -- Pipeline
            pipeline_status       VARCHAR(50) NOT NULL DEFAULT 'new',
            notes                 TEXT,
            founder_contacts      JSON,

            -- Analysis
            comparable_companies  JSON,
            recommended_next_step TEXT,
            red_flags             TEXT,
            conviction_score      INTEGER,
            next_action           VARCHAR(500),
            next_action_due       TIMESTAMP,
            key_risks             TEXT,
            bull_case             TEXT,

            -- Diligence
            meeting_notes         JSON,
            activity_log          JSON,
            memo                  TEXT,
            memo_files            JSON,
            memo_generated_at     TIMESTAMP,

            -- Signal tracking
            last_refreshed_at     TIMESTAMP,
            has_unseen_signals    BOOLEAN DEFAULT FALSE,

            -- Sourcing provenance (per-tenant)
            source                VARCHAR(200),
            source_url            VARCHAR(500),

            -- Portfolio tracking
            is_portfolio          BOOLEAN DEFAULT FALSE,
            portfolio_status      VARCHAR(50),
            investment_date       TIMESTAMP,
            check_size_usd        DOUBLE PRECISION,
            co_investors          JSON,

            -- Research
            research_status       TEXT,
            research_completed_at TIMESTAMPTZ,

            -- Timestamps
            created_at            TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_at            TIMESTAMPTZ,

            CONSTRAINT uq_firm_company_score UNIQUE (company_id, user_id)
        );
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_fcs_user_id          ON firm_company_scores (user_id);")
    op.execute("CREATE INDEX IF NOT EXISTS ix_fcs_company_id       ON firm_company_scores (company_id);")
    op.execute("CREATE INDEX IF NOT EXISTS ix_fcs_pipeline_status  ON firm_company_scores (pipeline_status);")
    op.execute("CREATE INDEX IF NOT EXISTS ix_fcs_fit_score        ON firm_company_scores (fit_score);")

    # ------------------------------------------------------------------
    # 4. company_signals  (FK → companies ON DELETE SET NULL)
    # ------------------------------------------------------------------
    op.execute("""
        CREATE TABLE IF NOT EXISTS company_signals (
            id           SERIAL PRIMARY KEY,
            company_id   UUID
                             REFERENCES companies(id) ON DELETE SET NULL,
            signal_type  VARCHAR(50) NOT NULL,
            title        VARCHAR(500) NOT NULL,
            summary      TEXT NOT NULL,
            source_url   VARCHAR(1000),
            is_seen      BOOLEAN DEFAULT FALSE,
            detected_at  TIMESTAMP DEFAULT NOW(),
            created_at   TIMESTAMP DEFAULT NOW()
        );
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_company_signals_company_id ON company_signals (company_id);")

    # ------------------------------------------------------------------
    # 5. activity_events  (FK → companies ON DELETE SET NULL)
    # ------------------------------------------------------------------
    op.execute("""
        CREATE TABLE IF NOT EXISTS activity_events (
            id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id      VARCHAR(255),
            company_id   UUID
                             REFERENCES companies(id) ON DELETE SET NULL,
            startup_name VARCHAR(255),
            event_type   VARCHAR(50) NOT NULL,
            title        VARCHAR(500) NOT NULL,
            detail       TEXT,
            created_at   TIMESTAMP DEFAULT NOW() NOT NULL
        );
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_activity_events_user_id    ON activity_events (user_id);")
    op.execute("CREATE INDEX IF NOT EXISTS ix_activity_events_company_id ON activity_events (company_id);")
    op.execute("CREATE INDEX IF NOT EXISTS ix_activity_events_event_type ON activity_events (event_type);")

    # ------------------------------------------------------------------
    # 6. notifications  (FK → companies ON DELETE SET NULL)
    # ------------------------------------------------------------------
    op.execute("""
        CREATE TABLE IF NOT EXISTS notifications (
            id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id      VARCHAR,
            event_type   VARCHAR NOT NULL,
            title        VARCHAR NOT NULL,
            body         TEXT,
            company_id   UUID
                             REFERENCES companies(id) ON DELETE SET NULL,
            startup_name VARCHAR,
            fit_score    INTEGER,
            is_seen      BOOLEAN NOT NULL DEFAULT FALSE,
            created_at   TIMESTAMP NOT NULL DEFAULT NOW(),
            metadata     JSON
        );
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_notifications_user_id    ON notifications (user_id);")
    op.execute("CREATE INDEX IF NOT EXISTS ix_notifications_company_id ON notifications (company_id);")

    # ------------------------------------------------------------------
    # 7. associate_memory  (FK → companies ON DELETE SET NULL)
    # ------------------------------------------------------------------
    op.execute("""
        CREATE TABLE IF NOT EXISTS associate_memory (
            id           SERIAL PRIMARY KEY,
            user_id      VARCHAR(255) NOT NULL,
            memory_type  VARCHAR(50) NOT NULL,
            content      TEXT NOT NULL,
            company_id   UUID
                             REFERENCES companies(id) ON DELETE SET NULL,
            company_name VARCHAR(255),
            created_at   TIMESTAMPTZ DEFAULT NOW(),
            embedding    vector(1536)
        );
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_associate_memory_id      ON associate_memory (id);")
    op.execute("CREATE INDEX IF NOT EXISTS ix_associate_memory_user_id ON associate_memory (user_id);")

    # ------------------------------------------------------------------
    # 8. sourcing_history  (no FK deps)
    # ------------------------------------------------------------------
    op.execute("""
        CREATE TABLE IF NOT EXISTS sourcing_history (
            id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id              VARCHAR(255),
            query                TEXT NOT NULL,
            ran_at               TIMESTAMP NOT NULL DEFAULT NOW(),
            results_count        INTEGER DEFAULT 0,
            new_companies_added  INTEGER DEFAULT 0
        );
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_sourcing_history_user_id ON sourcing_history (user_id);")
    op.execute("CREATE INDEX IF NOT EXISTS ix_sourcing_history_ran_at  ON sourcing_history (ran_at);")

    # ------------------------------------------------------------------
    # 9. scheduler_runs  (no FK deps)
    # ------------------------------------------------------------------
    op.execute("""
        CREATE TABLE IF NOT EXISTS scheduler_runs (
            id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            job_name        VARCHAR(100) NOT NULL,
            started_at      TIMESTAMP NOT NULL DEFAULT NOW(),
            completed_at    TIMESTAMP,
            status          VARCHAR(20) NOT NULL DEFAULT 'running',
            error_message   TEXT,
            stats           JSON,
            firm_count      INTEGER
        );
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_scheduler_runs_job_name ON scheduler_runs (job_name);")


def downgrade():
    # Drop in reverse FK-dependency order
    op.execute("DROP TABLE IF EXISTS scheduler_runs CASCADE;")
    op.execute("DROP TABLE IF EXISTS sourcing_history CASCADE;")
    op.execute("DROP TABLE IF EXISTS associate_memory CASCADE;")
    op.execute("DROP TABLE IF EXISTS notifications CASCADE;")
    op.execute("DROP TABLE IF EXISTS activity_events CASCADE;")
    op.execute("DROP TABLE IF EXISTS company_signals CASCADE;")
    op.execute("DROP TABLE IF EXISTS firm_company_scores CASCADE;")
    op.execute("DROP TABLE IF EXISTS companies CASCADE;")
    op.execute("DROP TABLE IF EXISTS firm_profiles CASCADE;")
