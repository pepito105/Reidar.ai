# Radar — Project Context for Claude Code

## What This Is
Radar is a multi-tenant AI-powered VC deal sourcing platform. It acts as
an AI investment associate for VC firms — sourcing, classifying, and
surfacing startups filtered through each firm's investment mandate.

## Stack
- Backend: Python 3.11, FastAPI, SQLAlchemy async, PostgreSQL (Supabase)
- Frontend: React + Vite, inline styles only (no Tailwind, no CSS files)
- Auth: Clerk JWT tokens
- AI: Anthropic API (Claude Sonnet for deep research, Haiku for batch scoring)
- Search: Brave Search API + Firecrawl for real web research
- Email: SendGrid
- Deployment: Railway (backend + frontend as separate services)
- Local Python: /opt/homebrew/bin/python3.11

## Project Structure
radar/
  backend/
    app/
      api/routes/        # FastAPI route files
      core/              # database, config, auth
      models/            # SQLAlchemy models
      services/          # business logic
    alembic/             # migrations
  frontend/
    src/
      components/        # React components
      App.jsx
      main.jsx

## Critical Rules — Never Violate These
1. NEVER run alembic migrations — Remi runs these manually with: alembic upgrade head
2. NEVER run scraping, sourcing, or classification jobs
3. NEVER modify .env files
4. NEVER install packages without asking first
5. NEVER run the dev server or any long-running process
6. NEVER touch scheduler.py background jobs without explicit instruction
7. Always make surgical changes — one file at a time
8. Always show diffs before applying, wait for confirmation
9. Always lint-check after changes

## Multi-Tenancy — Most Important Pattern
Every query must be scoped to user_id. This is the most common bug source.

WRONG:
  select(FirmProfile).where(FirmProfile.is_active == True)

RIGHT:
  select(FirmProfile)
    .where(FirmProfile.user_id == user_id)
    .where(FirmProfile.is_active == True)
    .limit(1)
  result.scalars().first()  # never scalar_one_or_none() on FirmProfile

user_id is extracted from Clerk Bearer token using this helper
(already defined in most route files):

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

## Database Models
Key models and their purposes:
- Startup — core company record, user_id scoped
- FirmProfile — VC firm config, thesis, notification prefs, user_id scoped
- CompanySignal — real signal events for pipeline companies (funding, news, etc)
- Notification — unified notification table (new_top_match, new_strong_fit,
  research_complete, company_signal, stale_deal)
- AssociateMemory — AI associate memory layer with pgvector embeddings
- SchedulerRun — job health tracking (running/success/failure per job)

## Key Services
- classifier.py — classify_startup, classify_batch, research_startup, detect_signals
- sourcing_service.py — autonomous company discovery via Brave Search
- research_service.py — brave_search(), firecrawl_scrape(),
  research_with_brave_and_firecrawl()
- refresh_service.py — nightly signal refresh for pipeline companies
- notification_service.py — email delivery (weekly digest, top match alert,
  diligence batch)
- notification_writer.py — writes to notifications table
- job_health.py — start_job_run, complete_job_run, fail_job_run
- scheduler.py — APScheduler jobs (nightly scrape 4:30AM, signal refresh 3AM,
  research batch 3:30AM, sourcing 4AM, weekly summary Monday 8AM ET)

## Signal System
detect_signals in classifier.py uses real Brave Search + Firecrawl to find
signals. It searches with freshness="pw" (past week), deduplicates against
existing signals in the DB, and asks Claude to extract only grounded events
with source_url. Signals only run for pipeline companies
(watching/outreach/diligence), not all companies.

## Notification System
Two tables work together:
- company_signals — stores actual signal events with source_url
- notifications — unified feed for the in-app bell drawer

NotificationDrawer.jsx reads from /api/notifications/feed (NOT /signals/feed).
The signals/feed endpoint still exists for Home.jsx and other components.

## Emails
Three email types via SendGrid:
1. Weekly digest (Monday 8AM) — Claude-generated narrative, top new companies,
   pipeline snapshot, stale deals
2. Top match alert — fires per 5/5 company, Claude writes investment take
3. Diligence batch — nightly, Claude interprets each signal in deal context
All emails use APP_URL env var (not localhost). Sent to profile.notification_emails.

## Frontend Patterns
- No Tailwind — inline styles only
- API base URL comes from environment variable
- Auth via useAuth() from @clerk/clerk-react
- All API calls include Bearer token in Authorization header
- Polling interval for notifications: 60 seconds

## Environment Variables (backend)
Key vars (never modify .env directly):
- DATABASE_URL — Supabase pooler connection string
- ANTHROPIC_API_KEY
- OPENAI_API_KEY — for embeddings only (text-embedding-3-small)
- BRAVE_API_KEY — for real web search
- FIRECRAWL_API_KEY — for page scraping
- SENDGRID_API_KEY
- FROM_EMAIL, NOTIFICATION_EMAIL
- APP_URL — Railway frontend URL (not localhost)
- CLERK_SECRET_KEY

## Deployment
- Backend: https://radar-production-8cea.up.railway.app
- Frontend: https://zestful-creativity-production.up.railway.app
- Database: Supabase (shared between local and Railway)
- Push to deploy: git push triggers Railway auto-deploy
- Never add migrations to Procfile

## Known Issues / In Progress
- Layer 2 (admin failure alerts) and Layer 3 (in-app health indicator)
  for scheduler observability not yet built
