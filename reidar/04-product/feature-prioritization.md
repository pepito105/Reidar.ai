# Reidar — Feature Prioritization
## MoSCoW Framework for MVP

**Date:** March 2026
**Scope:** Fund I–III solo or 2-GP founding partners. No analyst. Passive capture is the core promise.

---

## Must Have — Ship Before Anything Matters

### 1. Mandate / Thesis Setup
One-time onboarding configuration. GP defines sectors, stage, check size, geography, and what they explicitly don't invest in. This is the seed from which all scoring, classification, and resurfacing derives meaning.
- **Pain addressed:** Pain 1 (judgment never captured) — the foundation layer
- **Effort:** S (2–3 days)
- **Dependencies:** None. This is day one.
- **Rationale:** Nothing downstream is personalized without this. Ship first, keep it short (under 10 minutes to complete), and make it editable at any time.

### 2. Gmail Integration — Passive Inbound Capture
OAuth connection to GP's inbox. Reidar reads incoming pitch emails passively, without the GP taking any action. Extracts company name, founder, deck link, and message context. No forwarding, no labeling required.
- **Pain addressed:** Pain 2 (manual logging collapses CRM adoption)
- **Effort:** M (1–2 weeks, OAuth + parsing reliability)
- **Dependencies:** Mandate setup
- **Rationale:** This is the trust bridge. The moment a GP connects Gmail and sees that pitches are being captured without lifting a finger, the product has paid for itself conceptually. Everything else flows from this.

### 3. Inbound Pitch Classification
Every captured pitch is scored against the mandate automatically. Score (0–10), fit summary, and one-line reason why it matches or doesn't. Delivered before the GP opens the email, or surfaced in the pipeline view.
- **Pain addressed:** Pain 1 (judgment capture), Pain 4 (5–15 hours per deal)
- **Effort:** M (scoring logic against structured mandate + Claude prompt)
- **Dependencies:** Gmail integration, mandate setup
- **Rationale:** This is the first daily-value hook. GPs open their inbox every morning. If Reidar has pre-classified everything overnight, they feel the product working within 24 hours of connecting Gmail.

### 4. Pipeline Management (Kanban)
Basic pipeline view: Watching / Outreach / Diligence / Passed / Invested. GP can move companies through stages. All interaction history is attached to each company card.
- **Pain addressed:** Pain 2 (CRM adoption), Pain 6 (missing companies that came back)
- **Effort:** M (UI + data model, already partially built in prototype)
- **Dependencies:** Inbound classification (companies need to exist before they enter pipeline)
- **Rationale:** GPs need somewhere to put companies. Without this, Reidar is a classifier with no memory. Pipeline is the container for all accumulated judgment.

### 5. Pass Reason Capture
When a GP moves a company to Passed, Reidar surfaces a short structured prompt: "What was the deciding factor?" with suggested options (team, market, timing, traction, valuation, fit) plus a free-text field. One-click. Takes 10 seconds.
- **Pain addressed:** Pain 1 (judgment never captured — this is the richest signal)
- **Effort:** S (modal + data storage)
- **Dependencies:** Pipeline management
- **Rationale:** This is the single most important data point Reidar ever collects. Every pass reason is a data point about how this GP actually thinks. Without this, resurfacing has no context. With it, the profile compounds. Make it feel effortless — defaults, not blank fields.

### 6. Company Record / History View
Full timeline for every company Reidar knows about: every email, every calendar event, every note, every pass reason, every score, every signal. The GP should be able to open any company and see the complete story in one scroll.
- **Pain addressed:** Pain 6 (missing companies), Pain 1 (judgment capture)
- **Effort:** M
- **Dependencies:** Gmail integration, pipeline management, pass reason capture
- **Rationale:** This is what differentiates Reidar from a screener. The history view is where all the passive capture becomes visible and valuable. Without it, GPs don't see the accumulation happening.

### 7. Notification System (Email + In-App)
Weekly digest email, inbound classification alerts, and signal notifications. Must be configurable (frequency, type). In-app notification drawer for real-time updates.
- **Pain addressed:** All pains — notifications are the delivery mechanism for Reidar's value
- **Effort:** M (email templates + in-app drawer, partially built)
- **Dependencies:** Classification, signal monitoring
- **Rationale:** A product that only works when the GP actively opens the app will be abandoned within two weeks. Push notifications are how Reidar stays in the GP's life without requiring discipline.

---

## Should Have — Ship in the First Post-MVP Sprint

### 8. Google Calendar Integration — Meeting Detection
OAuth connection to calendar. Reidar detects any meeting with a founder in the pipeline (or an unknown contact with a startup email domain) and prepares a pre-meeting brief automatically.
- **Pain addressed:** Pain 4 (research time), Pain 1 (judgment capture)
- **Effort:** M
- **Dependencies:** Gmail integration (for contact graph), company records
- **Rationale:** The pre-meeting brief is the most visible, time-saving feature in the product. It belongs in MVP but requires calendar OAuth, which adds trust surface area. Ship Gmail first to establish trust, then ask for calendar access.

### 9. Pre-Meeting Brief Generation
Auto-generated 1-page brief delivered 30 minutes before a scheduled founder call: company background, recent news, Reidar's mandate score, any prior interactions, and suggested questions based on the GP's historical concerns.
- **Pain addressed:** Pain 4 (research time — this alone saves 2–3 hours per meeting)
- **Effort:** M (brief generation prompt + delivery)
- **Dependencies:** Calendar integration, company records, mandate
- **Rationale:** This is the feature GPs will mention when they refer Reidar to colleagues. "It sends me a brief before every call." Make it beautiful and right, not just fast.

### 10. Signal Monitoring
Nightly check for signals on pipeline companies: funding rounds, hiring spikes, product launches, press coverage. Surfaces only meaningful signals — not noise — and attaches them to the company timeline.
- **Pain addressed:** Pain 6 (missing companies that came back around)
- **Effort:** M (already partially built in prototype)
- **Dependencies:** Company records, pipeline management, Brave Search integration
- **Rationale:** Signals are the mechanism by which Reidar earns attention over time. Without signals, the product goes quiet after week one. With signals, it whispers useful things to the GP every few days.

### 11. Temporal Resurfacing
The core retention hook. When a signal about a previously-passed company matches the context of the original pass reason, Reidar surfaces it with full history. "You passed on Sequoia Seed 18 months ago because of team. They just hired a new CTO."
- **Pain addressed:** Pain 6 (high emotional intensity — this is the Aha Moment)
- **Effort:** L (requires signal + pass reason + matching logic + alert copy)
- **Dependencies:** Signal monitoring, pass reason capture, company history (6+ weeks of data to resonate)
- **Rationale:** This is the feature that converts a skeptical user into an evangelist. It cannot happen in week one — it requires accumulated data. But it must be engineered from day one, because the data structure that enables it must be built correctly upstream.

### 12. Investor Profile View
A mirror: what has Reidar learned about how this GP thinks? Themes they care about, patterns in their passes, sectors where they're deepening knowledge. Updated automatically, visible to the GP at any time.
- **Pain addressed:** Pain 1 (judgment capture made visible)
- **Effort:** M
- **Dependencies:** Pass reasons, classification history, company records
- **Rationale:** Transparency about what Reidar knows builds trust. GPs are more likely to lean into the product when they can see their own thinking reflected back at them. Also useful for catching errors in the profile.

---

## Could Have — Valuable but Not Blocking

### 13. Meeting Notes Integration (Granola / Fireflies)
Webhook or manual paste to ingest meeting transcripts. Reidar extracts key takeaways, concerns, action items, and associates them with the company record.
- **Pain addressed:** Pain 1 (judgment capture), Pain 4 (post-meeting synthesis)
- **Effort:** L
- **Dependencies:** Company records, calendar integration
- **Rationale:** High value but requires either a third-party webhook (Granola/Fireflies integration) or manual workflow. The manual paste version can ship early as a low-effort fallback.

### 14. Investment Memo Drafting
AI draft of a memo informed by the full company history, GP's evaluation notes, pass reasons on comparable deals, and market context. GP edits, not writes from scratch.
- **Pain addressed:** Pain 5 (memo writing)
- **Effort:** M (prompt engineering, mostly)
- **Dependencies:** Company records, investor profile, meeting notes
- **Rationale:** High-value feature, but GPs won't reach memo stage until they've been in the product 60–90 days. Don't deprioritize it — schedule it in the second sprint.

### 15. AI Associate Chat
Conversational interface: "What have I seen in climate fintech this year?" or "Who introduced me to Watershed?" Queries the full knowledge base with natural language.
- **Pain addressed:** Pain 1, Pain 4
- **Effort:** L (RAG architecture, embedding pipeline)
- **Dependencies:** All capture features must be running (chat is only as good as what's been ingested)
- **Rationale:** Powerful, but only works after 60+ days of data accumulation. Premature investment in chat before the knowledge base is rich enough will produce mediocre answers and damage trust.

### 16. LP Report Export
Decision provenance summary for LP communications: companies evaluated, pass reasons, diligence activity, investment rationale. Exportable PDF or shareable link.
- **Pain addressed:** Unlocks a downstream pain (LP communications) not in the core hierarchy
- **Effort:** M
- **Dependencies:** Full company history, investment memos
- **Rationale:** Real value for Fund II–III GPs doing LP updates, but not a retention driver in Fund I. Post-MVP.

---

## Won't Have (This Time)

### 17. CRM Sync (Affinity / Attio)
Export data to existing CRMs.
- **Rationale:** Reidar is trying to replace the CRM, not feed it. Building sync in the early phase signals that Reidar is an add-on, not the system of record. It also creates a behavioral escape hatch — GPs will default to their old tool. Hard no until retention is proven.

### 18. Team / Multi-GP Profiles
Separate judgment profiles per partner, shared deal flow, attribution.
- **Rationale:** Solo GP first is a design principle, not a feature decision. Adding multi-user complexity before the single-user experience is excellent creates a product that does nothing perfectly. Ship when Fund II customers request it.

### 19. Mobile App
Native iOS or Android.
- **Rationale:** GPs are not doing deal work on their phones. They're doing it at their desk, between meetings, on their laptop. A mobile app is a distraction from the core workflow and a significant engineering investment with no clear retention upside at this stage.

---

## Build Order (Sequenced)

**Milestone 0 — Week 1–2: Foundation**
Mandate setup, data model, user auth, basic pipeline UI.

**Milestone 1 — Week 3–5: The Capture Loop**
Gmail OAuth, inbound parsing, pitch classification against mandate. First daily-value moment: GP wakes up to classified pitches.

**Milestone 2 — Week 6–8: The Memory Layer**
Company history view, pass reason capture modal, notification emails. The product now remembers what the GP has seen.

**Milestone 3 — Week 9–11: The Signal Engine**
Signal monitoring (Brave Search), nightly signal run for pipeline companies, signal notifications.

**Milestone 4 — Week 12–14: The Calendar Layer**
Google Calendar OAuth, meeting detection, pre-meeting brief generation.

**Milestone 5 — Week 15–20: The Compounding Layer**
Temporal resurfacing logic, investor profile view, AI associate chat (basic). This is when the product becomes defensible.

---

## Dependencies Map

```
Mandate Setup
    └── Inbound Classification
            └── Pipeline Management
                    └── Pass Reason Capture
                            └── Temporal Resurfacing ←─ Signal Monitoring
                                                              └── Company History View

Gmail Integration
    └── Inbound Classification
    └── Company History View
    └── Contact Graph (for calendar matching)

Calendar Integration
    └── Pre-Meeting Brief
    └── Meeting Notes (if auto-detected)

Signal Monitoring ──────────────────┐
Pass Reason Capture ────────────────┤
Company History View ───────────────┴── Temporal Resurfacing (requires ALL THREE)
```

**Critical blockers:**
- Temporal resurfacing is blocked until signal monitoring AND pass reason capture have been running for 4–6 weeks. No shortcuts.
- Pre-meeting briefs are blocked on calendar OAuth. Calendar OAuth requires trust established via Gmail first.
- AI associate chat quality is entirely dependent on capture pipeline depth. Don't ship chat until week 16 at the earliest.

---

## Scope Discipline

**Trap 1: AI Associate Chat (shipped too early)**
Chat feels like a flagship feature and will be requested by early users. The temptation is to build it immediately to look impressive in demos. The trap: a chat interface over a thin knowledge base gives shallow, generic answers that erode trust. Reidar needs 60–90 days of captured data before chat answers are meaningfully better than ChatGPT. Ship it early and you've built a demo feature that disappoints in real use.

**Trap 2: CRM Sync**
GPs will ask "can you export to Affinity?" within the first two weeks. The team will interpret this as product-market fit signal and sprint to build it. The trap: CRM sync is a defensive ask from users who aren't yet committed to Reidar as their primary system. Building it validates that Reidar is an add-on. Every engineering hour spent on Affinity sync is an hour not spent on temporal resurfacing — which is the only feature that will make CRM sync irrelevant.

**Trap 3: Investment Memo Drafting**
Memo generation is tangible, demonstrable, and easy to sell in a demo. It looks like a clear 10x productivity win. The trap: GPs don't reach memo stage until they're 60–90 days into a deal. Prioritizing memo generation over capture infrastructure means building a beautiful output layer on top of a shallow input layer. The memos will be generic and unimpressive without rich company history behind them. Build the inputs before the outputs.
