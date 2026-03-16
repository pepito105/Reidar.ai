# Radar — Project Brief for Claude Code

## What is Radar?
Radar is an AI investment associate for VC firms. It sources, classifies, and surfaces startups filtered through a firm's investment mandate. Think of it as the analyst that never sleeps — it knows your mandate, sources proactively every night, scores every company against your thesis, and helps analysts track deals and read investment memos.

**Live URLs**
- Frontend: https://zestful-creativity-production.up.railway.app
- Backend: https://radar-production-8cea.up.railway.app
- Deployed on Railway (Hobby plan), PostgreSQL provisioned in `cozy-youthfulness` project

---

## Tech Stack
- **Backend**: Python 3.11 + FastAPI, PostgreSQL + pgvector, SQLAlchemy async ORM, APScheduler, asyncpg
- **Frontend**: React + Vite, inline styles (no Tailwind, no CSS files), Inter font
- **AI**: Anthropic Claude (Haiku for batch scoring, Sonnet for deep analysis and research)
- **Scraping**: Firecrawl (`.scrape()` method — synchronous, must use `loop.run_in_executor` in async contexts)
- **Sourcing**: Brave Search API, HN Algolia, GitHub trending
- **Auth**: Clerk (currently in dev mode — needs custom domain for production)
- **Email**: SendGrid
- **IDE**: Cursor for frontend, Claude Code for backend

---

## Project Structure
```
~/radar/
  backend/
    app/
      api/routes/          # FastAPI endpoints
        startups.py        # Main startup CRUD, analyze endpoint
        signals.py         # Sourcing stream, research, signals
        firm_profile.py    # Firm profile CRUD
        chat.py            # AI Analyst chat
        pipeline.py        # Pipeline/kanban
        market_map.py      # Market map data
        memo.py            # Investment memo generation
      services/
        classifier.py      # Core AI classification (Haiku + Sonnet)
        scraping_service.py  # Nightly RSS/YC/ProductHunt scraper
        sourcing_service.py  # Autonomous sourcing (Brave, HN, GitHub)
        research_service.py  # Deep analysis via Firecrawl + Claude
        scheduler.py       # APScheduler nightly jobs
        notification_service.py  # SendGrid email alerts
      models/
        startup.py         # Main startup model
        firm_profile.py    # Firm profile model
      core/
        config.py          # Settings (env vars)
        database.py        # Async DB session
  frontend/
    src/
      App.jsx              # Main app shell, routing between screens
      main.jsx             # React entry point, routes
      pages/
        LandingPage.jsx    # Public landing page
        HowItWorks.jsx     # How it works page
      components/
        Coverage.jsx       # Main feed of companies
        CompanyDetail.jsx  # Side panel + full memo view
        Pipeline.jsx       # Kanban board
        MarketMap.jsx      # Market intelligence view
        Home.jsx           # Home/dashboard
        Sidebar.jsx        # Navigation
        OnboardingModal.jsx  # New user onboarding flow
        FirmSettings.jsx   # Firm profile settings
```

---

## Architecture — Critical Decisions

### Two-tier classification (DO NOT change this)
- **`classify_batch()`** — fast Haiku batch scoring. Used for ALL incoming companies (scraper, nightly sourcing, onboarding sourcing). Returns: `fit_score`, `one_liner`, `sector`, `thesis_tags`, `business_model`, `target_customer`. No reasoning, no deep analysis.
- **`classify_startup()`** — deep Sonnet analysis. Only runs when user clicks ⚡ Deploy Research Agents. Returns everything above plus: `fit_reasoning`, `comparable_companies`, `key_risks`, `bull_case`, `recommended_next_step`.

### Lazy analysis flow
1. Company arrives → `classify_batch` → fit_score assigned → shown in Coverage if above threshold
2. User clicks company → sees basic info + locked preview sections
3. User clicks ⚡ Deploy Research Agents → `POST /startups/{id}/analyze` → `classify_startup` runs → full analysis unlocked
4. The `/analyze` endpoint checks `fit_reasoning is not None` (NOT `fit_score`) to determine if already analyzed

### Coverage filter logic
- Shows companies where `fit_score >= firm.fit_threshold` (default 3)
- Manual companies (`source = 'manual'`) always show regardless of fit_score
- `min_fit_score=0` in the query includes unscored companies + manual + above threshold

### Multi-tenancy
- Every startup row has `user_id` from Clerk
- Every firm_profile row has `user_id`
- ALL queries must filter by `user_id` — missing this causes data leaks between firms
- Always use `.limit(1).scalars().first()` NOT `.scalar_one_or_none()` on FirmProfile queries — multiple profiles can exist and `scalar_one_or_none()` crashes

### Auth pattern
- Clerk JWT tokens in `Authorization: Bearer <token>` header
- SSE/EventSource endpoints receive token as `?token=` query param (EventSource can't send headers)
- `_user_id_from_request(request)` helper extracts user_id from request

---

## Nightly Scheduler (APScheduler, America/New_York)
- **2:00 AM** — `job_run_scrapers()` → RSS feeds, YC, ProductHunt → `classify_batch` per firm
- **3:00 AM** — `job_refresh_signals()` → refresh diligence signals for pipeline companies
- **3:30 AM** — `job_run_research()` → autonomous research via Firecrawl + Claude
- **4:00 AM** — `job_run_sourcing()` → autonomous sourcing via Brave/HN/GitHub → `classify_batch`
- **Monday 8:00 AM** — `job_weekly_summary()` → SendGrid weekly email

---

## Email Alerts (SendGrid)
- Sender: remi@balassanian.com (verified)
- Three alert types: Top Match, Diligence Signal batch, Monday weekly summary
- Per-firm notification preferences stored in `firm_profiles`
- Multi-recipient support via `notification_emails` field

---

## Database — Key Fields on `startups`
```
id, name, slug, user_id
one_liner, ai_summary          # Basic description
fit_score (1-5)               # From classify_batch — always present
ai_score (1-5)                # AI-nativeness score
sector, mandate_category       # Classification
thesis_tags []                 # Array of tags
business_model, target_customer  # From batch scoring
fit_reasoning                  # From deep analysis ONLY (null until ⚡ clicked)
comparable_companies []        # From deep analysis ONLY
key_risks                      # From deep analysis ONLY (stored as JSON string)
bull_case                      # From deep analysis ONLY (stored as JSON string)
recommended_next_step          # From deep analysis ONLY
source                         # 'autonomous_sourcing', 'manual', 'rss', 'yc', etc.
pipeline_status                # 'new', 'watching', 'outreach', 'diligence', 'passed', 'invested'
is_portfolio                   # Boolean — portfolio companies
research_status                # null, 'completed', 'failed'
```

---

## Known Issues / Things Not to Break
1. **`key_risks` and `bull_case`** — Claude returns these as lists, but DB columns are TEXT. Must `json.dumps()` before saving if value is a list.
2. **Firecrawl is synchronous** — must use `loop.run_in_executor(None, ...)` in async FastAPI contexts.
3. **VARCHAR → TEXT** — some older columns are VARCHAR and truncate Claude outputs. TEXT is correct type for all LLM-generated content.
4. **Sourcing stream auth** — uses `?token=` query param not Authorization header.
5. **`rescore-unscored` endpoint** — must be scoped by `user_id` or it rescores all firms.
6. **No background auto-classification** — companies should NEVER be deep-analyzed automatically. Only `classify_batch` runs automatically. `classify_startup` is on-demand only.

---

## Pending Work
- Custom domain (needed for Clerk production mode)
- Clerk → production mode
- Failup Ventures demo account setup
- Company cards redesign
- Rotate credentials (Supabase password + Clerk secret exposed in chat transcripts)
- Remove `uploads/` from GitHub tracking
- Performance: Coverage rerenders on every tab switch (should cache data)
- Sweep all endpoints for missing `user_id` filter on FirmProfile queries

---

## Environment Variables (backend)
```
DATABASE_URL
ANTHROPIC_API_KEY
CLERK_SECRET_KEY
FIRECRAWL_API_KEY
BRAVE_API_KEY
SENDGRID_API_KEY
FROM_EMAIL=remi@balassanian.com
```

---

## Key Commands
```bash
# Push to Railway
cd ~/radar && git add -A && git commit -m "message" && git push origin main

# View Railway logs
# Go to railway.app → project → backend service → Logs

# Local backend (if needed)
cd ~/radar/backend && source venv/bin/activate && uvicorn app.main:app --reload

# Local frontend (if needed)  
cd ~/radar/frontend && npm run dev
```
