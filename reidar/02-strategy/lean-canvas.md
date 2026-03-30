# Lean Canvas: Reidar
**Phase:** 4 — Strategy
**Project:** reidar
**Date:** 2026-03-29

---

## Canvas Grid

| | | | | |
|---|---|---|---|---|
| **Problem** | **Solution** | **Unique Value Proposition** | **Unfair Advantage** | **Customer Segments** |
| 1. Judgment never gets captured — "why we passed" lives only in a GP's head | 1. Passive capture layer: connects to Gmail, calendar, and meeting notes; logs pass reasons automatically | **We help emerging VC GPs make sure nothing they've ever learned gets lost — by passively capturing every investment decision and resurfacing it when conditions change.** | Personal data moat: accumulated judgment profiles cannot be reconstructed from outside; switching cost compounds with every decision logged | **Primary:** Founding GPs at emerging funds — Fund I–III, $10M–$150M AUM, 1–3 GPs, no dedicated analyst |
| 2. CRM data entry burden causes tools to fail within weeks | 2. Pre-meeting brief engine: auto-generates context from prior interactions and notes before every founder call | | First-mover on personal judgment layer — no competitor has built this; 18–24 month window before Affinity could ship adjacent features | **Early Adopters:** NYC-based Fund I–III managers, active on Twitter/X, 2022–2025 vintage, have publicly expressed frustration with current tools |
| 3. Shared intelligence platforms give everyone the same signals — alpha decays as the subscriber base grows | 3. Resurfacing engine: detects when a passed company's conditions change and alerts the GP with the original pass reason | | Founder origin story: Remi started Reidar while trying to break into VC — knows the pain personally | **Secondary:** Analysts/associates at slightly larger emerging funds ($75M–$150M), 1 analyst |
| *Existing alternatives: Affinity, Notion/Airtable, spreadsheets (40–50% of micro-funds), PitchBook/Harmonic* | | | Insight Partners relationship: reference customer credibility at a top-10 growth fund | **Anti-persona:** Established tier-1 VC (>$300M AUM), corporate VC, family offices |
| **Key Metrics** | | **Channels** | | **Cost Structure** |
| Acquisition: qualified GP signups/month (target 5–10 at seed stage) | | **Inbound:** Founder-led Twitter/X content, SEO on unclaimed terms ("AI investment associate," "passive VC workflow capture"), long-form newsletter | | AI API costs (Anthropic inference) — primary variable COGS |
| Activation: first resurfacing alert that matches a real evaluation within 30 days | | **Outbound:** Direct founder outreach to 200-person qualifying GP list; EVCA/EMC/Partner Track Slack community presence | | Infrastructure (cloud hosting, email integration) |
| Retention: monthly active usage rate; profile confidence score growth; 90-day churn | | **Partnerships:** VC Lab (emerging manager curriculum), Granola (meeting notes), LP networks | | SOC 2 Type 1: $25K–$65K Year 1 (required for enterprise sales) |
| Revenue: MRR growth, ACV, CAC payback | | **Leverage:** Insight Partners contact → reference customer → warm intros to GP network | | CAC: $2K–$5K early stage (founder-led); $200–$500 via Tier 1 community channels |
| Referral: GP referral rate (1 referral ≈ 3 warm leads in tight VC community) | | | | 2 founders, no salary early; eventual first hire: VC-domain customer success |
| | **Revenue Streams** | | | |
| | Flat firm-level subscription (not per-seat) | | | |
| | Seed tier: $500/month (sub-$50M AUM) | | | |
| | Growth tier: $1,000/month ($50M–$150M AUM) | | | |
| | Design partners: $0 (first 5–10 customers) | | | |
| | Year 1 SOM: 30–50 customers @ ~$15K ACV = $450K–$750K ARR | | | |
| | Year 3 SOM: 300–400 customers @ ~$25K ACV = $7.5M–$10M ARR | | | |
| | Gross margin: 70–80% (SaaS typical; variable cost is AI inference) | | | |

---

## Narrative Expansion

### 1. Problem

The deepest problem Reidar addresses is one of organizational memory failure at the individual level. Every VC decision — why a partner passed, what made them excited, what threshold a company would need to cross — lives entirely inside a GP's head. When that company comes back 18 months later having hired a head of sales and tripled revenue, the GP evaluates it cold. There is no retrieval mechanism for judgment, only for facts. This was the most frequently cited and highest-intensity pain across customer voice research, and it represents a category of loss that no existing tool even attempts to solve.

The second problem is a tool adoption trap. CRM platforms have tried to become the institutional memory layer for VC, but they depend on active data entry. As one source put it: "If entering data takes too many clicks, people won't do it. Without automatic integration, people stop updating it within weeks. You end up with a partially-filled database that nobody trusts." The failure mode is not a bad product — it's a workflow mismatch. Affinity partially solves this by capturing relationship graph data passively, but it captures who you know, not how you think. The judgment layer remains empty.

The third problem is the commoditization of market intelligence. Platforms like Harmonic, Crunchbase, and PitchBook distribute the same signals to every subscriber simultaneously. Alpha decays as the subscriber base grows. The competitive advantage from using shared data approaches zero as adoption increases. The GPs who will win in a crowded emerging manager environment need proprietary signal — and the only truly proprietary signal is their own accumulated judgment.

### 2. Customer Segments

The primary customer is a founding GP at an emerging fund — Fund I through III, $10M to $150M AUM, one to three partners, no dedicated analyst. This is someone who is simultaneously the sourcer, the evaluator, the relationship manager, and the decision-maker. They do not have the back-office infrastructure of a Sequoia or a16z. They are sector-specialized (enterprise SaaS, climate, fintech) and pre-seed or seed stage focused. They are budget-sensitive but not price-sensitive if the ROI is clear — a single good investment thesis preserved is worth 100x the annual subscription.

The early adopter profile is more specific: NYC-based Fund I–III managers, active on Twitter/X, 2022–2025 vintage funds. This cohort has enough deal history to generate meaningful training data for a personalized model (a fund that has been running for less than a year has insufficient decision history to demonstrate resurfacing value). Critically, this group has publicly expressed frustration with current tools, which means they have already identified the pain and are actively seeking a solution — the awareness stage of the customer journey is complete.

Secondary customers are analysts and associates at slightly larger emerging funds ($75M–$150M AUM) with one analyst on staff. These users are often the primary operators of whatever tooling exists at the fund, making them key influencers in the buying decision even if the GP is the economic buyer. The anti-persona is important to hold: established tier-1 VC firms have operations teams, proprietary systems, and switching costs that make them poor early targets regardless of the product's potential there.

### 3. Unique Value Proposition

The UVP is: "We help emerging VC GPs make sure nothing they've ever learned gets lost — by passively capturing every investment decision and resurfacing it when conditions change."

The word "passively" is load-bearing. It directly counters the CRM failure mode (P2) without requiring the user to change behavior. The phrase "nothing they've ever learned" speaks to the judgment loss problem (P1). And "resurfacing when conditions change" names the specific delivery mechanism that converts stored memory into actionable intelligence — the moment a GP gets an alert that says "you passed on this company because they had no GTM motion; they just hired four enterprise AEs" is the moment they understand what Reidar actually is.

### 4. Solution

Three features map directly to the three problems. First, a passive capture layer that connects to Gmail, calendar, and meeting notes and learns without requiring deliberate data entry — this is the behavioral unlock that breaks the CRM adoption trap. Second, a pre-meeting brief engine that synthesizes prior interactions, emails, and notes before every founder call, giving the GP context they would otherwise reconstruct manually or skip. Third, a resurfacing engine that monitors passed companies for the specific conditions that caused the pass and fires an alert when those conditions change, converting stale judgments into live deal opportunities.

The compounding dynamic is what makes this a platform rather than a feature. In months one through two, Reidar is a workflow tool. In months three through six, it becomes an intelligence layer. By month twelve, the personalized judgment profile is a genuine asset — non-transferable, non-replicable, and increasingly valuable with every decision added.

### 5. Channels

Inbound channels leverage the insight that the target customer is active on Twitter/X and reads long-form VC content. Founder-led content about "how VCs actually make decisions" is the SEO and social wedge — it attracts the audience organically while establishing Remi as a credible voice in a space where he does not yet have a track record. Several search terms around "AI investment associate" and "passive VC workflow capture" appear unclaimed, representing a low-competition SEO opportunity.

Outbound is a 200-person list of qualifying emerging GPs, worked directly by the founder. The EVCA, EMC, and Partner Track Slack communities are confirmed gaps — no competitor has established a presence there — making them high-leverage, low-cost distribution channels for a seed-stage company. The Insight Partners relationship is the single highest-leverage channel asset: one reference customer at a top-10 growth fund converts warm outreach into credible conversations with the emerging GP community that Insight's LPs and portfolio companies touch.

### 6. Revenue Streams

The model is a flat firm-level subscription. This is a deliberate beachhead choice: emerging funds are budget-sensitive and are buying on behalf of a small team, so per-seat pricing would create friction without meaningful upside. AUM-based tiers ($500/month for sub-$50M, $1,000/month for $50M–$150M) align the price to the customer's ability to pay and the value at stake (a larger AUM means more deals, more history, and more resurfacing opportunities).

The Year 1 target of 30–50 customers at approximately $15K ACV ($450K–$750K ARR) is achievable with a direct founder-sales motion. Year 3 at 300–400 customers and $25K ACV ($7.5M–$10M ARR) implies modest price expansion as the product matures and a broader distribution motion. Gross margins at 70–80% are standard for SaaS; the primary variable cost is Anthropic API inference, which decreases per-unit as model costs continue to fall and as Reidar's classification and resurfacing work becomes more efficient.

### 7. Cost Structure

The cost structure is lean by design. The two founders draw no salary early. The co-founder handles engineering; Remi handles sales and product. The primary costs in Year 1 are AI inference (Anthropic API), cloud infrastructure, and SOC 2 Type 1 certification ($25K–$65K), which is a non-negotiable compliance requirement for selling to fund managers who handle sensitive deal flow data. CAC is $2K–$5K in the direct outreach channel and drops to $200–$500 through Tier 1 community distribution as the brand builds. The first non-founder hire is a VC-domain customer success and product role — someone who speaks GP fluently and can translate user feedback into product decisions.

### 8. Key Metrics

Five metrics across the AARRR framework define success at this stage. Acquisition: qualified GP signups per month, targeting five to ten at seed stage — "qualified" means Fund I–III, the right AUM band, no analyst on staff. Activation: the "first intelligence moment" — the GP receives a resurfacing alert that matches a real company they evaluated, within 30 days of connecting their accounts. This is the moment the product becomes real for the user. Retention: monthly active usage rate and profile confidence score growth (a proxy for how much judgment the system has accumulated — the higher the confidence score, the deeper the switching cost). Revenue: MRR growth, ACV per customer, and CAC payback period. Referral: GP referral rate, where one referral in the tight VC community generates approximately three warm leads.

### 9. Unfair Advantage

The unfair advantage is structural, not tactical. The personal data moat is the core: once a GP has been using Reidar for six months, their judgment profile exists nowhere else in the world. No competitor can reconstruct it. No acquirer can copy it. Switching to an alternative means starting over — losing not just a tool but an irreplaceable asset. This is the same dynamic that made Spotify's Discover Weekly sticky: the recommendations are only as good as the history, and the history is not portable.

The first-mover window on the personal judgment layer is estimated at 18–24 months before Affinity could plausibly ship adjacent features. Affinity has the relationship graph and the distribution; it does not yet have the passive judgment capture or the resurfacing logic. That gap is the runway. The 40% of new GPs who have no prior VC experience — the cohort Reidar is designed for — are the least locked-in, most tool-hungry, and most likely to adopt a new paradigm before incumbents close the gap.

---

## Strategic Notes

### Riskiest Assumptions

**Assumption 1: Passive capture is technically achievable without meaningful data quality degradation.** The entire value proposition depends on Reidar learning from normal workflow without requiring deliberate input. If the Gmail and calendar integrations surface noisy data that produces irrelevant resurfacing alerts, the activation moment fails and the product feels like a liability rather than an asset. This is the highest-stakes technical risk, and it needs to be stress-tested in the first five design partner relationships before any marketing investment.

**Assumption 2: Emerging GPs will share raw deal flow and investment thesis data with a seed-stage company.** The product requires access to sensitive, proprietary information — pass reasons, thesis notes, founder communications. Even if the value is clear, the trust threshold for a Fund I GP sharing this data with a startup they have known for 30 days is high. SOC 2 Type 1 certification helps, but it does not eliminate this barrier. The Insight Partners reference customer is the primary trust signal that can accelerate this decision, which means that relationship needs to be activated early and explicitly.

### What Would Need to Be True for the Revenue Model to Work

The $500–$1,500/month price point requires that emerging GPs perceive the ROI as clear and near-term. For a $50M fund deploying $2M–$5M checks, a single additional good deal sourced from a resurfacing alert — one that would otherwise have been missed — is worth $500K–$2M at fund return. At that ratio, the subscription cost is trivial. But the GP needs to experience that resurfacing moment firsthand, which means the activation metric (first intelligence moment within 30 days) is the critical variable. If that window stretches to 90 days, churn risk rises significantly. The revenue model works if activation is fast, which means the passive capture system needs to work well on a relatively small initial data set — not six months of history, but two to four weeks.

### If the Solo GP Pivot Proved to Be the Better Customer

If the evidence pointed toward individual GPs rather than emerging firms as the atomic unit of value, several things in this canvas would change. The pricing model would need to shift from firm-level to individual-level subscription, likely at a lower absolute price point ($200–$400/month) but potentially higher total ARR through volume. The unfair advantage strengthens: individual judgment profiles are even more personal and non-transferable than firm-level ones, and the switching cost argument becomes more visceral ("your thinking is inside this system"). The channel strategy would shift further toward Twitter/X and individual GP communities and away from fund-level outreach. The anti-persona boundary would blur — a solo GP at a tier-1 fund operating independently is suddenly in scope. The risk is that individual GPs have less budget authority and more difficulty getting expense approval, which means a consumer-style monthly billing model becomes more important than annual contract sales. The Year 1 ARR target would likely be lower in dollar terms but the top-of-funnel would be significantly larger.
