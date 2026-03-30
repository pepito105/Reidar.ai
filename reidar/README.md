# Reidar — Startup Design Summary

**Project:** reidar
**Completed:** 2026-03-29
**Mode:** Full (all 8 phases)

---

## What Reidar Is

Reidar is an AI investment associate that captures the judgment VCs accumulate over time — and makes sure none of it gets lost.

Every GP develops pattern recognition: which founders to back, which markets to believe in, which signals separate signal from noise. But that intelligence lives in people's heads, in Slack threads, in Notion docs that never get searched again. When a company comes back 18 months after a pass, slightly different, slightly better-timed, the GP evaluates it cold. No context. No memory. No institutional knowledge.

Reidar fixes this not by adding another tool to the stack, but by watching how you already work. It connects to Gmail and calendar, delivers a pre-meeting brief before every call, captures pass reasons after every decision, and resurfaces your own context when conditions change — "You passed because they had no GTM motion. They just hired four enterprise AEs."

The moat isn't the product. It's your history. The longer you use Reidar, the less replicable your edge becomes, because it's built from your decisions, your instincts, your patterns. That data only exists because someone uses Reidar daily. It can't be scraped. It can't be bought. It compounds.

**Target customer:** NYC-based emerging fund managers, Fund I–III, 1–3 GPs, $10M–$150M AUM
**Pricing:** $500/month (Seed tier) / $1,000/month (Growth tier)
**Raise:** $400K pre-seed on SAFE, $3.5M post-money cap
**Verdict:** Conditional proceed — validate data access consent and Day 1 value before raising

---

## Key Research Findings

**Market:**
- ~500–800 US emerging fund GPs are addressable in the beachhead
- SAM: $37M–$62M (narrow but real); TAM: ~$930M+ (full VC market)
- AI VC tooling market growing at 35–40% CAGR; $200–400M invested in the category in the past 24 months
- 40–50% of emerging GPs use spreadsheets for deal tracking; 30–40% use Notion — both are workarounds, not solutions

**Competitive whitespace:**
- No direct competitor occupies the sub-$1,000/month emerging fund price point with a judgment-capture focus
- Affinity ($2,000–$3,000/month) is overpriced and overbuilt for Fund I–III managers
- Rowspace ($50M Sequoia) validated the institutional tier above Reidar's beachhead — confirms the market exists
- The judgment-capture / resurfacing thesis was independently validated by HBR research (Tier 1 source)

**Customer voice:**
- Most frequently cited frustrations (verbatim): "I've definitely looked at the same company twice and not remembered seeing it," "Our CRM tracks who we know, nothing tracks how we think," "When we passed we all remembered why but six months later it was gone"
- Highest-priority unmet need: automated context capture without manual logging burden

**Timing:**
- Post-ChatGPT GP mindset shift is documented: 73% of emerging managers (VC Lab survey) say AI tooling is now a priority
- Emerging manager cohort growing: 37% of new fund launches in 2024 were Fund I–III
- EU AI Act creates compliance complexity for EU expansion; US market is the right focus for 24+ months

---

## Strategic Positioning Summary

**Category:** AI investment associate (not VC CRM, not deal sourcing platform)

**Positioning statement:** For emerging fund GPs who are building their sourcing edge, Reidar is the AI investment associate that captures your accumulated judgment and makes sure nothing you've ever learned gets lost. Unlike Affinity or generic CRMs that track who you know, Reidar learns how you think — and the intelligence it builds is yours alone.

**Unique mechanism:** Passive capture from existing workflows (Gmail + calendar + meeting notes) → compounding context that grows with every decision → irreplicable firm-specific intelligence

**Beachhead go-to-market:** NYC emerging fund managers via design partner program (5 free 90-day accounts) → warm intro chain → content flywheel (Substack / LinkedIn on VC intelligence) → EVCA/VC Platform community presence

**Break-even:** 16 paying customers at $500/month

---

## Top 3 Risks and Mitigations

### Risk 1: GPs Won't Grant Gmail/Calendar Access [Priority: 20/25]
VCs are the most data-protective B2B buyers. An unknown founder asking to connect to their work email is the single highest-stakes ask in the GTM.

**Mitigation:** Start with Calendar OAuth only (lower stakes than Gmail). Lead every conversation with a data handling document before mentioning product features. Get one named, trusted GP to vouch publicly before scaling. Use warm intros exclusively for the first 10 customers — no cold OAuth requests.

### Risk 2: Passive Capture Doesn't Deliver Valuable Signal [Priority: 15/25]
The compounding moat requires 6 months to form. If Day 1 value (pre-meeting briefs) isn't compelling without the history, GPs won't stay long enough to see the moat.

**Mitigation:** Run the Concierge MVP (manually deliver briefs for 4 weeks, measure whether GPs find them useful) before automating anything. The Day 1 brief must be better than a 5-minute Google search — not marginally better. Design signal quality around GP-stated pass reasons, not generic company events.

### Risk 3: Sales Cycles Are Longer Than the Model Assumes [Priority: 12/25]
Small VC funds are notoriously slow to commit to software. Budget processes are informal, GPs are time-constrained, and a $500/month decision that requires a co-GP discussion takes weeks.

**Mitigation:** Price to stay below individual GP authorization threshold ($500/month calibrated for this). Monthly billing only — no annual contracts that require deliberation. Lead with free trial or design partner framing, not a purchase conversation.

---

## Confidence Dashboard Summary

| Claim | Confidence |
|---|---|
| Judgment-capture problem is real and recurring | **High** (multiple Tier 1 sources, customer voice research, HBR validation) |
| GPs will pay $500/month for a solution | **Medium** (WTP data is extrapolated from competitor pricing, not direct validation) |
| Passive capture via Gmail/calendar is technically feasible | **Medium-High** (Google Workspace API is well-documented; production reliability untested) |
| GPs will grant Gmail access to an unknown founder | **Low** (no validation; research explicitly flags this as a structural barrier) |
| The accumulated-history moat creates meaningful switching cost | **Low** (theoretically sound; empirically untested — requires 6+ months of real usage) |
| NYC emerging GPs are the right beachhead | **Medium-High** (geographic research supports; no direct customer validation yet) |
| $400K raise at $3.5M cap is achievable | **Medium** (benchmark-supported; no investor conversations yet) |
| 15 paying customers at Month 12 (base case) | **Medium** (reasonable for design-partner-led GTM; acquisition rate is the primary variable) |

---

## Anti-Patterns Detected

**"Building in stealth too long"** — The product has been in development without customer validation. The Concierge MVP and customer discovery experiments must happen before any further product build. The risk is building the wrong version of passive capture (wrong format, wrong signals, wrong delivery mechanism) because no GP has used it yet.

**"Vanity metrics risk"** — Waitlist size, LinkedIn followers, and design partner sign-ups are leading indicators only. The only metrics that validate the business are: (1) paid conversion from design partners, (2) monthly churn below 5%, and (3) at least one unsolicited referral from a paying customer.

---

## Document Index

```
reidar/
├── README.md                              ← You are here
├── PROGRESS.md                            ← Phase completion tracker
├── action-plan-30-days.md                 ← First month playbook
│
├── 00-intake/
│   ├── brief.md                           ← Founder intake + refined positioning
│   └── brainstorm.md                      ← 6 idea variations + convergence
│
├── 01-discovery/
│   ├── market-analysis.md                 ← TAM/SAM/SOM, regulatory, timing
│   ├── competitor-landscape.md            ← 8 competitor profiles + matrix
│   ├── target-audience.md                 ← Personas, pain hierarchy, JTBD
│   ├── industry-trends.md                 ← Tech trends, investment signals
│   ├── confidence-dashboard.md            ← 32-row claim confidence table
│   ├── research-gate.md                   ← Go/no-go assessment (green light)
│   └── raw/                               ← 11 raw research files
│
├── 02-strategy/
│   ├── lean-canvas.md                     ← 9-box business model
│   ├── positioning.md                     ← April Dunford framework
│   ├── value-proposition.md               ← VPC + one-sentence value props
│   ├── business-model.md                  ← Revenue model + unit economics
│   └── go-to-market.md                    ← First 100 customers plan
│
├── 03-brand/
│   ├── mission-vision-values.md           ← Mission, vision, 5 values
│   ├── tone-of-voice.md                   ← Personality, voice, vocabulary guide
│   └── brand-personality.md               ← Archetype, visual direction
│
├── 04-product/
│   ├── mvp-definition.md                  ← Hypothesis, must-haves, out of scope
│   ├── feature-prioritization.md          ← MoSCoW, build sequence
│   └── user-journey.md                    ← 8-stage GP journey, aha moment
│
├── 05-financial/
│   ├── revenue-model.md                   ← Pricing, Year 1–3 projections
│   ├── cost-structure.md                  ← Burn, COGS, break-even
│   └── projections.md                     ← 3 scenarios, raise sizing, cash flow
│
└── 06-validation/
    ├── validation-playbook.md             ← 5 ordered experiments
    ├── experiment-design.md               ← Detailed protocols + scripts
    ├── risk-analysis.md                   ← Risk matrix + mitigations
    ├── assumptions-tracker.md             ← 19 assumptions + test methods
    ├── kill-criteria.md                   ← 7 measurable stop conditions
    └── scorecard.md                       ← 6.7/10 — conditional proceed
```
