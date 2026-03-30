# MVP Definition: Reidar
**Phase:** 6 — Product
**Project:** reidar
**Date:** 2026-03-29

---

## Core Hypothesis

GPs will get measurable value from an AI that learns their investment judgment passively — without requiring manual logging — within 30 days of connecting their workflow tools.

**Success looks like:** After 30 days, at least 60% of active users (defined as GPs who connected Gmail and reviewed at least 5 inbound companies) report that Reidar surfaced context they would otherwise have forgotten or never captured, and at least 3 users describe a specific moment where Reidar saved them time or informed a decision they were actually making.

**Failure looks like:** GPs connect Gmail but stop logging in after week 2. Pass reasons remain unreviewed. No one mentions the AI's judgment-capture capability unprompted. The product is used only as an inbound triage tool and not differentiated from a spreadsheet. If retention drops below 40% at day 30, the core hypothesis is false.

---

## Must-Have Features (MVP)

**1. Gmail OAuth connection with passive email ingestion**
- Pain addressed: Judgment never captured (rank 1), manual logging collapse (rank 2)
- Why must-have: The entire product premise rests on passive capture. Without this, Reidar is just another form GPs don't fill out.
- Simplest implementation: Gmail OAuth (read-only scope), pull emails with VC-relevant signals (pitch decks, intro emails, meeting confirmations, follow-ups). Parse sender, subject, company mentions. No full-body analysis yet — just metadata and entity extraction to identify which companies the GP is corresponding with.

**2. Inbound email classification**
- Pain addressed: 5–15 hours manual research per opportunity (rank 4), no analyst to delegate to (rank 7)
- Why must-have: This is the immediate, day-1 value that justifies the Gmail connection. A GP sends a pitch to Reidar (or it auto-detects it from inbox) and gets a scored brief within minutes — fit vs. mandate, quick web research summary, suggested next step.
- Simplest implementation: Leverage existing prototype's company scoring engine. Add a "submitted via email" ingestion path. Classify against the GP's mandate. Return a one-page brief with fit score, why it fits or doesn't, and 3 recommended questions if they take the meeting.

**3. Pass reason capture (prompted, not manual)**
- Pain addressed: Judgment never captured (rank 1) — the single highest-severity pain
- Why must-have: This is the seed data that makes resurfacing possible. Without it, there's nothing to resurface. Without resurfacing, the compounding value never materializes.
- Simplest implementation: After a GP moves a company to "Passed" in the pipeline, Reidar sends a single Slack or email prompt: "Why did you pass on [Company]? Pick one or write your own." Pre-populated options drawn from common VC pass language (no GTM, too early, wrong sector, team risk, valuation, market size). Store as structured + free-text. No manual CRM entry — one interaction, one tap.

**4. Pre-meeting brief generation**
- Pain addressed: 5–15 hours manual research (rank 4), memo writing (rank 5)
- Why must-have: This delivers weekly value regardless of how much judgment data has accumulated. A GP with 3 meetings this week gets 3 AI-generated briefs. This is the month 1 retention anchor while the judgment profile is still thin.
- Simplest implementation: Detect meeting with a company from calendar (Google Calendar OAuth, read-only). Pull existing Reidar data + fresh web research (Brave Search + Firecrawl, already built in prototype). Generate a 1-page brief: company overview, recent news, known investors, suggested questions tailored to the GP's mandate. Deliver via email 2 hours before meeting.

**5. Judgment profile (passive, visible to GP)**
- Pain addressed: Judgment never captured (rank 1), no personal edge (rank 3)
- Why must-have: This is the product's differentiator made visible. Without showing the GP their own judgment profile building up, the compounding value is invisible and unbelievable. GPs need to see "here's what Reidar thinks you care about" — and correct it. That correction loop is the trust mechanism.
- Simplest implementation: A simple read-only dashboard view: "What Reidar has learned about your thesis so far." Displayed as a structured summary — sectors you've passed on most, common pass reasons, typical check size inferred from companies you've advanced. Updated weekly. No editing in MVP — just viewing and a "this is wrong, here's what's actually true" freeform correction field.

---

## Should-Have Features (v1.1)

**Company resurfacing with context**
Deferred because: The core hypothesis is about passive capture working within 30 days. Resurfacing requires 60–90 days of accumulated pass decisions to have enough signal to resurface meaningfully. Shipping it in MVP means surfacing low-quality matches with thin context, which will undermine trust in the feature. Build it at month 3 when the judgment profile has real depth.

**Warm intro path identification**
Deferred because: This requires contact graph analysis on top of email ingestion — a non-trivial additional scope. It's valuable but doesn't test the core hypothesis. GPs can still get value from inbound classification and pre-meeting briefs without it.

**Slack integration for pass reason capture**
Deferred because: Email prompt for pass reason capture is sufficient for MVP validation. Slack adds implementation complexity (OAuth, bot setup, workspace permissions). Add in v1.1 if email response rate is below 50%.

**Competitive intelligence alerts**
Deferred because: This requires ongoing monitoring of portfolio + pipeline companies — a background job with meaningful latency implications. Not needed to test whether passive judgment capture works.

---

## Out of Scope (explicitly named)

**Multi-user / team features**
MVP must work for a solo GP without any configuration of teammates, permissions, or shared pipelines. Team features add auth complexity, data model changes, and UX scope that doesn't test the core hypothesis. A 1-GP fund is the beachhead customer.

**CRM integrations (Salesforce, Affinity, HubSpot sync)**
The entire point of Reidar is to replace the manual logging that makes CRMs fail. Building a sync implies the CRM is the system of record — it isn't. If a GP insists on syncing, that's a sales conversation for v2, not an MVP requirement.

**Deal sourcing / nightly AI web scraping**
The prototype has this. It is not core to the MVP hypothesis. The hypothesis is about learning judgment from existing workflow, not about sourcing net-new companies. Surfacing this feature in MVP dilutes the product story and adds infrastructure cost for zero hypothesis-testing value. Explicitly cut.

**Investment memo generation (full-length)**
Pre-meeting briefs (must-have) are the lean version of this. Full-length memo generation is a heavier AI task that's better suited to a "request memo" interaction, not passive capture. Defer to v1.1 when the judgment profile is rich enough to personalize the memo sections meaningfully.

**Mobile app**
GPs live in email, Slack, and desktop browser. The MVP does not require a native mobile experience. Web-responsive is sufficient.

**Public API / integrations marketplace**
Not an MVP concern. Any GP asking for an API before they've used the product for 30 days is a red flag, not a feature request.

---

## Success Criteria

**Activation**
- 80% of signups connect Gmail within 24 hours of account creation
- 70% of activated users receive at least one pre-meeting brief in week 1
- Defined as activated: Gmail connected + at least 1 company classified

**Retention**
- 60% of activated users return to the app at least once in week 3 (day 15–21)
- 40% still active at day 45 (the hardest point — before resurfacing kicks in)
- Qualitative signal: at least 3 GPs describe the pass reason capture or judgment profile unprompted in their own words during a feedback call

**Revenue**
- 5 paying customers at end of 60-day MVP window (any price tier)
- At least 2 customers renew past the first billing cycle
- No customer who made it to a pre-meeting brief churns in month 1

**Secondary qualitative signals**
- A GP forwards a pre-meeting brief to a colleague (organic word-of-mouth signal)
- A GP corrects their judgment profile ("this is wrong, here's what's actually true") — this means they care enough to engage with it
- A GP mentions a specific company or decision when asked "has Reidar been useful?" — named examples over vague praise

---

## The Month 1–5 Retention Bridge

The compounding value (resurfacing, judgment profile deep enough to be generative) requires 3–6 months of data. The honest answer to "what keeps someone subscribed in month 2?" is: the pre-meeting brief.

Concretely: A GP with 8 meetings per month gets 8 AI-prepared briefs they would otherwise spend 30–60 minutes each preparing manually. At conservative 20 minutes saved per brief, that's 2.5 hours/month of immediate, recurring, tangible time saved. This is the month 1–5 bridge. It is not the differentiator — competitors will copy it — but it is the honest, no-magic value that makes the subscription defensible while the judgment layer deepens.

The bridge has three components:

**Weeks 1–4: Instant research assistant.** Every company Reidar classifies gets a brief. Every meeting gets a pre-meeting package. Value is immediate and doesn't require accumulated judgment.

**Month 2–3: Pass reason patterns visible.** The judgment profile view starts showing real patterns: "You've passed on 7 B2B SaaS companies for 'no GTM motion' in the last 60 days. Here's the distribution of your pass reasons." This turns passive capture into self-awareness, which is intrinsically interesting to investors. It starts creating a mirror GPs want to look at.

**Month 4–6: First resurfacing moment.** This is the designed peak retention event. Reidar sends a digest: "Companies you passed on that have had material updates since your decision." For each: the original pass reason, what changed, a brief update. The first time this works well — "I passed because they had no enterprise traction; they just closed 5 enterprise deals" — it creates the conviction that drives long-term retention. This needs to be engineered, not accidental. Build the resurfacing engine at month 3, test internally, release when there are at least 10 companies with pass reasons per user.

---

## The Trust Architecture

The trust problem is real. "Connect your Gmail" from an unknown company is a significant ask. The sequence matters.

**Step 1: Value before access (Day 0)**
Before any OAuth request, Reidar demonstrates value with zero data from the user. The onboarding flow includes: upload a pitch deck (or paste a URL) and Reidar returns a classification brief in 2 minutes. No login required. This is the "show don't tell" hook. The GP sees the output before they're asked for anything.

**Step 2: Low-stakes access (Day 0–1)**
The first OAuth request is Google Calendar, not Gmail. Calendar read-only is a lower-trust ask — it reveals meeting titles and invitees, not message bodies. Reidar uses this to identify upcoming meetings and immediately delivers a pre-meeting brief for the first startup they're meeting. This creates a first-week win before email access is requested.

**Step 3: The Gmail ask (Day 2–7)**
Only after the GP has received at least one pre-meeting brief (proven value) does Reidar request Gmail. The request is specific: "To auto-classify inbound pitches and capture your pass decisions without manual logging, Reidar needs Gmail read-only access. We never read personal emails — only emails where a company or pitch is mentioned. You can revoke this at any time." The specificity of use matters. Vague permission requests signal data harvesting. Specific requests signal a narrow, honest use case.

**Step 4: Privacy commitment, visible and permanent**
The privacy model is written into the product, not just the privacy policy: "Your judgment profile is yours alone. It is never shared with other investors, never used to train shared models, never accessible to Reidar employees without your explicit permission." This appears in onboarding, in the judgment profile view, and in the settings page. The differentiation from shared-intelligence competitors (Harmonic, Crunchbase) must be made explicit — not assumed.

**Step 5: Data control at every step**
The settings page shows exactly what data Reidar has ingested: N emails processed, N companies identified, N pass reasons stored. A "delete all my data" button is present from day 1. Showing the data inventory reduces anxiety — GPs can see it's company-related email, not their personal correspondence.

---

## MVP Scope vs. Existing Prototype

The existing prototype has: deal sourcing, company scoring, pipeline Kanban, investment memos, AI associate chat, notifications, signal detection.

**Survive into MVP:**
- Company scoring engine — core to inbound classification
- Pipeline Kanban — needed for pass reason capture trigger (move to "Passed" → prompt)
- AI associate chat — keep but de-emphasize; it's a power feature, not the entry point

**Deprioritized (present but not promoted):**
- Signal detection — valuable but creates noise for a GP who hasn't established the base habit yet. Keep running in background, surface in v1.1 as part of the retention bridge.
- Investment memo generation — replaced by pre-meeting briefs for MVP. Full memos are a v1.1 feature.
- Notifications system — simplify to email delivery only for MVP. In-app notification bell is polish, not hypothesis-testing.

**Actively cut:**
- Deal sourcing (nightly AI web scraping) — explicitly out of scope. It contradicts the product story. The MVP is about learning judgment from the GP's existing workflow, not generating net-new deal flow. Shipping sourcing alongside passive capture muddies the value proposition. GPs will ask "is this a sourcing tool or a judgment tool?" Cut it from the MVP surface entirely. Re-evaluate at v1.1 if retention data suggests deal sourcing complements the judgment layer.

---

## Build Assumptions

1. **Gmail OAuth (read-only) is achievable in under 3 weeks for a 1–2 engineer team.** Relies on Google OAuth 2.0, which is well-documented. Rate limits are manageable at MVP scale (under 100 users). The risk is email parsing accuracy — entity extraction to identify company names in email threads is non-trivial. Budget 1 extra week for this.

2. **Google Calendar OAuth and meeting detection works reliably enough for pre-meeting briefs.** Meeting titles frequently do not contain company names — they say "Call with John" not "Call with Acme Inc." The pre-meeting brief delivery depends on being able to match calendar events to companies. Plan for a fallback: GP manually tags an event, or the brief is triggered by email thread detection rather than calendar alone.

3. **The existing company scoring engine (classifier.py + Brave Search + Firecrawl) is reusable for inbound classification with minimal modification.** This is the highest-confidence assumption — the prototype already does this. Estimated integration effort: 1 week.

4. **Pass reason capture via email prompt achieves 50%+ response rate.** This is untested. If response rate is below 30%, the judgment profile never gets dense enough to be useful and the whole model breaks. Mitigation: A/B test SMS vs. email prompt in week 4. Have a Slack integration ready to ship fast if email underperforms.

5. **A 2-person team (1 engineer, 1 PM/designer) can ship the MVP in 8 weeks.** This requires no scope additions after week 2. The timeline is achievable only if deal sourcing, team features, and CRM integrations are held firm as out of scope. The most likely failure mode is a GP in early access asking for a feature that sounds easy but isn't.
