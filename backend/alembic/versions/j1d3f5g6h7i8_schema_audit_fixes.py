"""schema audit fixes: companies missing fields, fcs cleanup, FK migrations

Revision ID: j1d3f5g6h7i8
Revises: i9c2e5f6g7h8
Create Date: 2026-03-19

Fixes:
  1. Add slug, research_status, research_completed_at, key_risks, bull_case,
     red_flags to companies table.
  2. Drop ai_score and slug from firm_company_scores.
  3. Migrate company_signals.startup_id  (INT FK→startups)  → company_id (UUID FK→companies).
  4. Migrate activity_events.startup_id  (INT no-FK)        → company_id (UUID FK→companies).
  5. Migrate notifications.startup_id    (INT no-FK)        → company_id (UUID FK→companies).
  6. Migrate associate_memory.company_id (INT no-FK)        → UUID FK→companies.
"""
from alembic import op

revision = 'j1d3f5g6h7i8'
down_revision = 'i9c2e5f6g7h8'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── 1. Add missing columns to companies ─────────────────────────────────
    op.execute("ALTER TABLE companies ADD COLUMN IF NOT EXISTS slug VARCHAR(500)")
    op.execute("CREATE UNIQUE INDEX IF NOT EXISTS ix_companies_slug ON companies (slug)")
    op.execute("ALTER TABLE companies ADD COLUMN IF NOT EXISTS research_status VARCHAR(50) DEFAULT 'pending'")
    op.execute("ALTER TABLE companies ADD COLUMN IF NOT EXISTS research_completed_at TIMESTAMPTZ")
    op.execute("ALTER TABLE companies ADD COLUMN IF NOT EXISTS key_risks TEXT")
    op.execute("ALTER TABLE companies ADD COLUMN IF NOT EXISTS bull_case TEXT")
    op.execute("ALTER TABLE companies ADD COLUMN IF NOT EXISTS red_flags TEXT")

    # ── 2. Clean up firm_company_scores ─────────────────────────────────────
    op.execute("DROP INDEX IF EXISTS ix_fcs_slug")
    op.execute("ALTER TABLE firm_company_scores DROP COLUMN IF EXISTS slug")
    op.execute("ALTER TABLE firm_company_scores DROP COLUMN IF EXISTS ai_score")

    # ── 3. company_signals: startup_id (INT FK→startups) → company_id (UUID FK→companies)
    op.execute("""
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'company_signals' AND column_name = 'startup_id'
            ) THEN
                -- Drop FK to the now-dropped startups table (constraint name may vary)
                ALTER TABLE company_signals
                    DROP CONSTRAINT IF EXISTS company_signals_startup_id_fkey;
                -- Rename column
                ALTER TABLE company_signals RENAME COLUMN startup_id TO company_id;
                -- Remove NOT NULL so the type cast can set existing rows to NULL
                ALTER TABLE company_signals ALTER COLUMN company_id DROP NOT NULL;
                -- Cast INTEGER → UUID (no meaningful data to preserve, set to NULL)
                ALTER TABLE company_signals
                    ALTER COLUMN company_id TYPE UUID USING NULL;
            END IF;
            -- Add FK to companies if not already present
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.table_constraints tc
                JOIN information_schema.key_column_usage kcu
                    ON tc.constraint_name = kcu.constraint_name
                    AND tc.table_schema = kcu.table_schema
                WHERE tc.table_name = 'company_signals'
                  AND tc.constraint_type = 'FOREIGN KEY'
                  AND kcu.column_name = 'company_id'
            ) THEN
                ALTER TABLE company_signals
                    ADD CONSTRAINT fk_company_signals_company_id
                    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL;
            END IF;
        END $$;
    """)

    # ── 4. activity_events: startup_id (INT, no FK) → company_id (UUID FK→companies)
    op.execute("""
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'activity_events' AND column_name = 'startup_id'
            ) THEN
                ALTER TABLE activity_events RENAME COLUMN startup_id TO company_id;
                ALTER TABLE activity_events ALTER COLUMN company_id DROP NOT NULL;
                ALTER TABLE activity_events
                    ALTER COLUMN company_id TYPE UUID USING NULL;
            END IF;
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.table_constraints tc
                JOIN information_schema.key_column_usage kcu
                    ON tc.constraint_name = kcu.constraint_name
                    AND tc.table_schema = kcu.table_schema
                WHERE tc.table_name = 'activity_events'
                  AND tc.constraint_type = 'FOREIGN KEY'
                  AND kcu.column_name = 'company_id'
            ) THEN
                ALTER TABLE activity_events
                    ADD CONSTRAINT fk_activity_events_company_id
                    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL;
            END IF;
        END $$;
    """)

    # ── 5. notifications: startup_id (INT, no FK) → company_id (UUID FK→companies)
    op.execute("""
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'notifications' AND column_name = 'startup_id'
            ) THEN
                ALTER TABLE notifications RENAME COLUMN startup_id TO company_id;
                -- startup_id was already nullable, no need to DROP NOT NULL
                ALTER TABLE notifications
                    ALTER COLUMN company_id TYPE UUID USING NULL;
            END IF;
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.table_constraints tc
                JOIN information_schema.key_column_usage kcu
                    ON tc.constraint_name = kcu.constraint_name
                    AND tc.table_schema = kcu.table_schema
                WHERE tc.table_name = 'notifications'
                  AND tc.constraint_type = 'FOREIGN KEY'
                  AND kcu.column_name = 'company_id'
            ) THEN
                ALTER TABLE notifications
                    ADD CONSTRAINT fk_notifications_company_id
                    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL;
            END IF;
        END $$;
    """)

    # ── 6. associate_memory: company_id (INT, no FK) → UUID FK→companies
    op.execute("""
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'associate_memory'
                  AND column_name = 'company_id'
                  AND data_type = 'integer'
            ) THEN
                ALTER TABLE associate_memory
                    ALTER COLUMN company_id TYPE UUID USING NULL;
            END IF;
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.table_constraints tc
                JOIN information_schema.key_column_usage kcu
                    ON tc.constraint_name = kcu.constraint_name
                    AND tc.table_schema = kcu.table_schema
                WHERE tc.table_name = 'associate_memory'
                  AND tc.constraint_type = 'FOREIGN KEY'
                  AND kcu.column_name = 'company_id'
            ) THEN
                ALTER TABLE associate_memory
                    ADD CONSTRAINT fk_associate_memory_company_id
                    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL;
            END IF;
        END $$;
    """)


def downgrade() -> None:
    # Remove FKs added to the four tables
    op.execute("ALTER TABLE associate_memory DROP CONSTRAINT IF EXISTS fk_associate_memory_company_id")
    op.execute("ALTER TABLE notifications DROP CONSTRAINT IF EXISTS fk_notifications_company_id")
    op.execute("ALTER TABLE activity_events DROP CONSTRAINT IF EXISTS fk_activity_events_company_id")
    op.execute("ALTER TABLE company_signals DROP CONSTRAINT IF EXISTS fk_company_signals_company_id")

    # Restore companies columns added in this migration
    op.execute("DROP INDEX IF EXISTS ix_companies_slug")
    op.execute("ALTER TABLE companies DROP COLUMN IF EXISTS slug")
    op.execute("ALTER TABLE companies DROP COLUMN IF EXISTS research_status")
    op.execute("ALTER TABLE companies DROP COLUMN IF EXISTS research_completed_at")
    op.execute("ALTER TABLE companies DROP COLUMN IF EXISTS key_risks")
    op.execute("ALTER TABLE companies DROP COLUMN IF EXISTS bull_case")
    op.execute("ALTER TABLE companies DROP COLUMN IF EXISTS red_flags")

    # Restore firm_company_scores columns (best-effort; data is lost)
    op.execute("ALTER TABLE firm_company_scores ADD COLUMN IF NOT EXISTS ai_score INTEGER")
    op.execute("ALTER TABLE firm_company_scores ADD COLUMN IF NOT EXISTS slug VARCHAR(255)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_fcs_slug ON firm_company_scores (slug)")
