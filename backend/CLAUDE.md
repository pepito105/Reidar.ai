# Radar Backend — Claude Code Context

## Stack
- Python 3.11 (path: /opt/homebrew/bin/python3.11)
- FastAPI with async/await throughout
- SQLAlchemy async ORM (AsyncSession, select, not Session.query())
- PostgreSQL via Supabase (pgvector extension enabled)
- Alembic for migrations
- APScheduler for background jobs
- Anthropic SDK (async) for all Claude calls
- OpenAI SDK (async) for embeddings only

## Absolute Rules
- NEVER use synchronous SQLAlchemy patterns — always async
- NEVER run alembic upgrade head — Remi runs migrations manually
- NEVER call run_full_scrape, run_autonomous_sourcing, or classify_batch
  outside of their intended callers
- NEVER add migration commands to Procfile
- Always use scalars().first() on FirmProfile queries, never
  scalar_one_or_none()

## Database Session Pattern
Always use AsyncSession from get_db dependency in routes:

  async def my_endpoint(db: AsyncSession = Depends(get_db)):
      result = await db.execute(select(Model).where(...))
      items = result.scalars().all()

For background jobs use AsyncSessionLocal context manager:
  async with AsyncSessionLocal() as db:
      ...

## Multi-Tenancy Pattern
Every query touching user data MUST be scoped to user_id.

WRONG — never do this:
  select(FirmProfile).where(FirmProfile.is_active == True)
  select(Startup).where(Startup.fit_score >= 4)

RIGHT — always scope:
  select(FirmProfile)
    .where(FirmProfile.user_id == user_id)
    .where(FirmProfile.is_active == True)
    .limit(1)

  select(Startup)
    .where(Startup.user_id == user_id)
    .where(Startup.fit_score >= 4)

Exceptions (intentionally unscoped):
- scheduler.py background jobs — loop over all active profiles instead
- seed_data.py — standalone script

## Auth Pattern
user_id extracted from Clerk Bearer JWT in every route file:

  def _user_id_from_request(request: Request) -> Optional[str]:
      auth_header = request.headers.get("Authorization", "")
      if auth_header.startswith("Bearer "):
          token = auth_header[7:]
          try:
              import jwt
              decoded = jwt.decode(
                  token,
                  options={"verify_signature": False},
                  algorithms=["RS256", "HS256"]
              )
              return decoded.get("sub")
          except Exception:
              return None
      return None

## Classifier Service (classifier.py)
Four main functions:
- classify_startup() — single company, full classification with fit_reasoning
- classify_batch() — batch scoring with Haiku, returns fit_score only
- research_startup() — deep research via Brave+Firecrawl+Claude Sonnet
- detect_signals() — real signal detection via Brave+Firecrawl (NOT fabricated)

Model usage:
- claude-haiku-4-5-20251001 — batch classification, signal detection
- claude-sonnet-4-6 — deep research, structure step
- text-embedding-3-small (OpenAI) — embeddings only

## Research Pipeline
research_service.py provides:
- brave_search(query, count) — Brave Search API, returns [{title, url, description}]
- firecrawl_scrape(url, max_length) — Firecrawl API, returns markdown content
- research_with_brave_and_firecrawl() — combined pipeline used by research_startup

Always check settings.BRAVE_API_KEY and settings.FIRECRAWL_API_KEY before
calling these — both can be None.

## Notification System
Two layers work together:

Layer 1 — company_signals table (CompanySignal model):
- Real signal events for pipeline companies only
- Populated by refresh_service.py → detect_signals()
- Has source_url field — must be populated with real URLs

Layer 2 — notifications table (Notification model):
- Unified feed for in-app bell drawer
- Five event types: new_top_match, new_strong_fit, research_complete,
  company_signal, stale_deal
- Written by notification_writer.py
- Read by /api/notifications/feed

Email delivery via notification_service.py:
- send_weekly_summary() — Monday digest with Claude narrative
- send_top_match_alert() — per 5/5 company
- send_diligence_batch_alert() — nightly for diligence pipeline

## Scheduler Jobs
All jobs in scheduler.py use job_health.py wrapper:
  run = await start_job_run(db, "job_name")
  try:
      # job logic
      await complete_job_run(db, run.id, stats={...})
  except Exception as e:
      logger.error(f'Job failed: {e}', exc_info=True)
      try:
          await fail_job_run(db, run.id, error=str(e))
      except Exception:
          pass

Job schedules (all ET):
- nightly_scrape: 4:30AM
- signal_refresh: 3:00AM — pipeline companies only
- research_batch: 3:30AM
- autonomous_sourcing: 4:00AM
- weekly_summary: Monday 8:00AM

## Signal Refresh Scope
job_refresh_signals runs only for companies in:
  pipeline_status IN ('watching', 'outreach', 'diligence')
NOT for all companies with fit_score >= 3.

## Alembic
Current head: f6a0b2c3d4e5
Migration chain:
bced87540914 → d4e8f1a2b3c5 → e5f9a1b2c3d6 → f6a0b2c3d4e5

To create a new migration:
  alembic revision -m "description"
Set down_revision to current head.
Never run migrations — Remi runs them manually.

## Config / Settings
All env vars accessed via settings object from app.core.config:
- settings.ANTHROPIC_API_KEY
- settings.OPENAI_API_KEY
- settings.BRAVE_API_KEY
- settings.FIRECRAWL_API_KEY
- settings.SENDGRID_API_KEY
- settings.FROM_EMAIL
- settings.NOTIFICATION_EMAIL
- settings.APP_URL (Railway frontend URL, never localhost)
- settings.DATABASE_URL

## Common Mistakes to Avoid
- Using scalar_one_or_none() on FirmProfile — crashes with multiple firms
- Forgetting user_id scope on Startup queries
- Importing deleted functions: send_new_top_match_alert,
  send_diligence_signal_alert (both removed)
- Hardcoding localhost URLs — always use settings.APP_URL
- Using synchronous anthropic.Anthropic() — always AsyncAnthropic()
- Running jobs or migrations automatically
