# Reidar — AI Agent Entry Point

Reidar is the AI agent stack for venture capital. It sources, researches, and surfaces intelligence across a firm's entire workflow — without being asked. It is not a database or a dashboard. It is a continuously running intelligence layer built around how a firm actually thinks, compounding from the first day it connects.

## What Reidar Does

- Sources companies nightly from YC, HN, ProductHunt, and the open web — scored against the firm's mandate before surfacing
- Evaluates every inbound pitch before the analyst opens it: scores against thesis, checks pass history, flags conflicts, generates a structured brief
- Captures institutional memory passively from Gmail, Google Calendar, and meeting transcripts — no logging, no forms
- Generates pre-meeting briefs automatically 30 minutes before every founder calendar event
- Monitors pipeline companies for signals (press, traction, hiring, funding) and surfaces them without being asked
- Delivers intelligence via Slack, calendar, Gmail, and browser extension — without requiring the analyst to open a tab

## Architecture

Reidar uses a three-layer architecture:

1. **Global Knowledge Base** — shared company, founder, and signal data (no firm_id)
2. **Per-Firm Intelligence** — proprietary reasoning signals scoped by firm_id (the moat)
3. **Ambient Surfaces** — event-triggered delivery (Slack, calendar, Gmail, browser extension)

The core insight: VC firms know more than they can write down. Reidar captures *how* a firm reasons — not just what they decided — by passively extracting structured signals from normal workflow artifacts (emails, transcripts, pass notes).

## Two-Pool RAG

- **Pool 1** — global company embeddings (market context, shared across firms)
- **Pool 2** — per-firm reasoning signal embeddings (how *this* firm thinks, firm_id-scoped)

At generation time, both pools are retrieved. Pool 2 is weighted heavily. A memo generated with both pools reflects the firm's actual investment lens.

## API

Base URL: `https://radar-production-8cea.up.railway.app`

Authentication: Bearer token (Clerk JWT) required on all endpoints.

Key endpoints:
- `GET /health` — health check
- `POST /api/classify` — score a company against the firm's mandate
- `GET /api/pipeline` — list pipeline companies
- `GET /api/signals` — signal feed for pipeline companies
- `GET /api/notifications/feed` — unified notification feed
- `GET /api/sourcing/matches` — sourced companies scored against mandate

## Stack

- Python 3.11 + FastAPI (async)
- PostgreSQL (Supabase) + pgvector
- SQLAlchemy async ORM + Alembic migrations
- Claude Sonnet for memos, Claude Haiku for batch extraction
- OpenAI text-embedding-3-small for embeddings
- Clerk for auth
- Railway for deployment

## Multi-Tenancy

Every query against a per-firm table must be scoped by `firm_id`. Never query per-firm data without a firm_id filter. Global tables (Layer 1) never have firm_id.

## Contact

- Website: https://reidar.ai
- GitHub: https://github.com/reidarai
