# Cost Structure

**Phase:** 7 — Financial
**Project:** reidar
**Date:** 2026-03-29
**Confidence:** Medium (infrastructure estimates from existing Radar stack; salary assumptions modeled conservatively)

---

## Overview

Reidar's cost structure is unusually lean for pre-seed software: both founders are currently at $0 salary, the tech stack is already built (existing Radar prototype), and the MVP requires no enterprise infrastructure. The dominant cost in Year 1 is **operational runway for the founders**, not product build.

This matters for the raise conversation: the minimum viable raise is low enough to be credible, and the money buys real time rather than just runway on paper.

---

## Fixed Monthly Costs (Operational — MVP Stage)

| Category | Item | Monthly Cost | Notes |
|---|---|---|---|
| Infrastructure | Railway (backend + frontend) | $30–50 | 2 services; scales with usage |
| Database | Supabase (starter) | $25 | PostgreSQL + pgvector; free tier exits at scale |
| Auth | Clerk (Pro) | $25 | Free to ~10K MAU; upgrade if needed |
| AI | Anthropic API | $150–400 | Usage-based; ~$0.003/meeting brief at Sonnet pricing; scales with active users |
| Email | SendGrid (Essentials) | $20 | Free to 100/day; ~500 emails/month at 10 customers |
| Search | Brave Search API | $40–80 | For signal detection on pipeline companies |
| Scraping | Firecrawl | $20–40 | For signal sourcing; minimal at MVP scale |
| Domain + DNS | Cloudflare/Namecheap | $5 | Annual cost amortized |
| **Total — Infrastructure** | | **$315–645/month** | Low end at launch; scales with usage |

**Notes on AI cost sensitivity:**
- 10 customers, each running 8 meetings/month = 80 pre-meeting briefs/month
- Estimated 1,500 tokens per brief at Sonnet pricing ≈ $0.36/customer/month in API cost — negligible
- Signal detection (2–3 searches/company/week for portfolio of 20 companies) ≈ $12–20/month per customer
- At 10 customers: AI costs ≈ $150–250/month total
- At 50 customers: AI costs ≈ $750–1,250/month — still low-margin-friendly

---

## Founder Compensation

Both founders go full-time from day one — the raise is what enables this. The co-founder quits their current job when the round closes and both founders draw a below-market stipend from Month 1.

| Phase | Remi | Co-Founder | Monthly Salary Burn |
|---|---|---|---|
| Month 1–12 (post-raise) | $3,500/month | $3,500/month | $7,000/month |
| Year 2 (growth phase) | $6,000/month | $6,000/month | $12,000/month |

**Investor framing:** Both founders full-time from Day 1 is a stronger story than a staggered start. It means the technical co-founder is building while Remi is selling, from the first week. The $3,500/month stipend is below-market but sustainable on a $400K raise and signals commitment over lifestyle.

---

## One-Time Costs (Pre-Launch)

| Item | Estimated Cost | Timing | Notes |
|---|---|---|---|
| Legal — incorporation (Delaware C-Corp) | $1,500–3,000 | Pre-raise | DIY via Stripe Atlas ($500) or boutique firm |
| Legal — founder agreements, IP assignment | $1,000–2,000 | Pre-raise | Critical before taking any investor money |
| Legal — SAFE + investor docs | $1,500–3,000 | At raise | Clerky or standard YC docs reduce cost |
| Landing page + demo video | $500–2,000 | Month 1 | Framer template + self-recorded Loom demo |
| NYC VC events (2–3) | $2,000–5,000 | Months 2–6 | RAISE NY, EVCA events, VC Platform Summit |
| Design (deck, brand assets) | $1,000–3,000 | Month 1 | Canva/Figma self-built or 1 freelance session |
| **Total One-Time** | **$7,500–18,000** | First 6 months | Upper end if full legal suite; lower end with YC docs |

**SOC 2 Note:** SOC 2 Type 1 was flagged in research ($25K–$65K). **Deferred from Year 1.** Emerging GPs in the beachhead do not require SOC 2 certification to start — they are not enterprise procurement buyers. SOC 2 becomes necessary when targeting fund admins, family offices, or any customer with formal vendor approval requirements. Budget for Year 2 if warranted by customer requests. If an enterprise prospect (e.g., Insight Partners) requires it, it can be funded from a future raise.

---

## Variable Costs (Per-Customer)

| Item | Cost Per Customer/Month | Notes |
|---|---|---|
| Incremental AI (Anthropic) | $15–25 | Includes meeting briefs + signal detection |
| Incremental search (Brave) | $4–8 | Signal detection queries |
| Incremental email (SendGrid) | $0.50–1 | Digest + alerts |
| **Total COGS per customer** | **$20–34/month** | At $500/month Seed plan: ~4–7% COGS |

**Gross Margin:** At $500/month revenue, COGS of $20–34 = **93–96% gross margin.** This is top-tier SaaS gross margin, even before any scale efficiencies. Note to investors: VC tooling sits in the same gross margin tier as vertical SaaS (90%+), not AI-heavy products with 60–70% margins.

---

## Monthly Burn Summary

| Phase | Period | Monthly Burn | Notes |
|---|---|---|---|
| Pre-raise | Now → Month 0 | $315–645 | Infrastructure only; $0 salaries (pre-raise) |
| Post-raise, full team | Month 1–12 | $7,315–8,645 | Infrastructure + $7,000/month salaries (both founders) |
| Growth phase | Year 2 | $12,315–14,645 | Infrastructure + $12,000/month salaries |

**Both founders are full-time from Month 1.** Burn is consistent from the first week post-raise — no ramp, no staggered start, no ambiguity.

---

## Break-Even Analysis

At Seed tier pricing ($500/month):

| Customers | Monthly Revenue | Monthly Burn | Net |
|---|---|---|---|
| 5 | $2,500 | $8,000 | -$5,500 |
| 10 | $5,000 | $8,000 | -$3,000 |
| 16 | $8,000 | $8,000 | **Breakeven** |
| 20 | $10,000 | $8,000 | +$2,000 |

**Break-even: 16 paying customers at $500/month.** This is a real milestone, not a vanity metric — 16 emerging fund GPs is achievable in 12–18 months given the beachhead strategy.

At blended pricing ($500 Seed / $1,000 Growth, 80/20 mix):
- Blended ARPU ≈ $600/month
- Break-even: ~14 customers

---

## Sources

- Existing Radar prototype tech stack (Railway, Supabase, Anthropic, Clerk, SendGrid pricing — current as of 2026-03)
- Anthropic API pricing: claude.ai/api (Sonnet 3.5 at $3/MTok input, $15/MTok output)
- Brave Search API: brave.com/search/api
- Legal cost benchmarks: YC, Clerky, Stripe Atlas published pricing
- SOC 2 cost range: research-wave-3 demand-signals.md findings

---

*Cross-references: competitor-landscape.md (gross margin benchmarks), market-analysis.md (unit economics benchmarks), go-to-market.md (first 100 customers plan)*
