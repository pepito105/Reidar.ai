# Business Model: Reidar
Phase: 4 — Strategy
Project: reidar
Date: 2026-03-29

---

## Revenue Model

Reidar sells firm-level flat-fee subscriptions. There are no per-seat charges. Revenue is recurring monthly, with annual billing offered at a discount equivalent to two months free.

### Pricing Tiers

**Pilot — $0 / 90 days**
Design partners only. First 5–10 customers. Full product access in exchange for weekly structured feedback sessions and a signed public testimonial upon graduation. No revenue, but this tier funds the proof points that make every subsequent sale possible. Graduates move to Seed or Growth depending on fund size.

**Seed — $500/month ($6,000 ACV)**
Target: sub-$50M AUM funds, typically 1–2 GPs, no analyst staff.
Includes: passive Gmail and calendar capture, inbound pitch classification, pass reason capture, company history retrieval, pre-meeting briefs.
Rationale: This is the full core value proposition at a price point equivalent to roughly 2 hours of a GP's implied hourly rate per month. For a fund deploying $5M–$50M, $6,000 ACV is under 0.1% of AUM — below the threshold of budget scrutiny. The constraint at this tier is feature depth, not price.

**Growth — $1,000/month ($12,000 ACV)**
Target: $50M–$150M AUM funds, 2–3 GPs, occasional analyst support.
Includes: everything in Seed, plus team profiles for 2–3 GPs, one analyst seat, memo drafting, LP report exports.
Rationale: At $50M–$150M AUM, the GP's time has a meaningfully higher opportunity cost, and the memo drafting and LP reporting features address pains that emerge at this fund size. The $12K ACV is still below 0.025% of AUM at the low end of this tier. The GP-level collaboration features (team profiles, analyst seat) reflect the structural reality that these funds have more than one decision-maker.

**Studio — $2,000+/month ($24,000+ ACV)**
Target: $150M–$500M AUM funds.
Includes: everything in Growth, plus full API access, Affinity/Attio CRM sync, custom signal integrations, dedicated customer success manager.
Rationale: At this AUM level, the GP is running a more operationally complex firm with existing tooling investments (Affinity, Attio, proprietary deal flow systems). The value proposition shifts from "replace your broken workflow" to "connect your existing stack and make it smarter." API access and CRM sync are table stakes for this buyer. Dedicated CSM reflects the sales and retention cost of larger accounts.

### Why Firm-Level Flat Fee, Not Per-Seat

Emerging fund GPs resist per-seat pricing for two reasons rooted in how they think about costs. First, the fund's operating budget is finite and set at formation; per-seat models feel open-ended, especially when team size fluctuates between carry staff and operating staff. Second, the GP is making the purchase decision, and per-seat models place the cost visibility at the wrong level — the firm pays for the capability, not for individual logins. Flat-fee pricing aligns the purchase decision with the value delivery unit (the firm's institutional memory) rather than headcount. It also simplifies renewals and removes the adoption-killing dynamic where GPs hesitate to add an associate to the system because it triggers an invoice change.

---

## Unit Economics

| Tier | ACV | Gross Margin | CAC | LTV | Payback Period | LTV:CAC |
|---|---|---|---|---|---|---|
| Seed | $6,000 | 72–78% | $2,000–$4,000 | $40,000 | 8–16 months | 10–20x |
| Growth | $12,000 | 72–78% | $2,000–$4,000 | $80,000 | 4–8 months | 20–40x |
| Studio | $24,000+ | 70–75% | $4,000–$8,000 | $160,000+ | 4–8 months | 20–40x |

**Gross margin methodology:**
COGS is approximately 22–28% of revenue, composed of:
- Anthropic API inference costs: 15–20% of revenue at current usage assumptions (pre-meeting brief generation, classification scoring, memo drafting, signal detection per customer per month)
- Cloud hosting (Railway/AWS): approximately 5% of revenue
- Email and calendar integration infrastructure: approximately 2–3% of revenue

At 72–78% gross margin, Reidar is in the normal range for AI-native SaaS products (not pure software at 85%+, but not infrastructure-heavy either). The main margin risk is inference cost inflation if usage per customer scales faster than expected — specifically if GPs use the memo drafting or signal detection features at high volume.

**LTV methodology:**
LTV = ACV / annual churn rate. Annual churn target is 15%, which is aggressive for early SaaS but reflects the fund lifecycle risk specific to VC tooling (a fund that stops deploying capital loses its reason to pay for deal sourcing tools). At 15% churn:
- Seed LTV: $6,000 / 0.15 = $40,000
- Growth LTV: $12,000 / 0.15 = $80,000
- Studio LTV: $24,000 / 0.15 = $160,000

If actual churn runs at 20% (a realistic pessimistic scenario for year one), Growth LTV falls to $60,000 — still healthy but narrows payback comfort.

**CAC methodology:**
$2,000–$4,000 via founder-led outbound (time cost of GP direct outreach, conference presence, content distribution). $500–$1,000 via community referral (VC operator communities, Twitter/LinkedIn referral loops). These are time-cost estimates, not paid channel spend, since there is no paid acquisition budget at the pre-seed stage. CAC increases to $4,000–$8,000 at the Studio tier, reflecting the longer sales cycle and likely need for a demo, security review, and procurement conversation.

**Payback period interpretation:**
At the Growth tier, 4–8 month payback on a $12K ACV product with 74% gross margin means the capital invested in each customer acquisition is returned within the first year, leaving years two and three as nearly pure gross profit contribution. This is the economic argument for prioritizing Growth tier customers over Seed tier customers when both are equally available.

---

## Pricing Strategy Rationale

**Competitor anchors:**
The relevant pricing comparisons for a GP evaluating Reidar are not other AI tools — they are the costs the GP is already paying or contemplating:

- A part-time analyst or EA: $40,000–$80,000 annually. Reidar at $12K ACV is 15–30% of this cost for a subset of what a junior hire does.
- Affinity (CRM): approximately $20,000–$30,000 ACV for a small fund. Reidar is additive, not directly competing, but the comparison establishes that $12K is within the normal range of VC tooling spend.
- Harmonic or Crunchbase Pro: $5,000–$20,000 annually for signal/database access. Reidar's Seed tier is priced in this range, which makes the first conversation easy — "you're already spending this on signals from tools that give everyone the same data."

**Risk of under-pricing:**
Pricing the Seed tier at $500/month ($6K ACV) risks two problems. First, it signals that the product is not mission-critical. GPs who spend $6K per year on a tool categorize it as a nice-to-have and cut it first when fund economics tighten. Second, it compresses the growth path — moving a customer from Seed to Growth is a 2x price increase, which is a significant conversation. The upgrade path would be smoother if Seed launched at $700–$800/month, with Growth at $1,200/month.

**Risk of over-pricing:**
The Growth tier at $12K ACV is near the limit of what a 1-GP emerging fund will approve without a lengthy evaluation. Above $15K ACV, many GPs will require a board discussion or LP approval for the operating expense, which introduces a 3–6 month sales cycle delay. Studio tier pricing at $2,000+/month ($24K+ ACV) is appropriate for its target segment but should not be pushed to $3,000+/month without confirmed willingness to pay from at least 3 Studio-tier customers.

**Value anchoring strategy:**
The most effective anchor in the sales conversation is the analyst cost comparison. "A part-time analyst costs $60K/year and gives you 20 hours per week. Reidar costs $12K/year, runs 24/7, and never forgets what you told it about a company 18 months ago." This is not a full replacement argument — it is a cost-per-leverage argument that resonates with GPs who know they need research support but cannot justify a full hire.

---

## Scalability Analysis

**At 100 customers (approximately $1M ARR, mixed Seed and Growth):**
Gross margin holds in the 72–78% range. Inference costs are predictable and manageable. Hosting costs scale sublinearly. The main cost pressure is customer success — 100 customers with varying onboarding states cannot be managed by two founders alone. The first CS/domain expert hire ($100K all-in) becomes justified at this point. After that hire, the effective margin on the next 50 customers drops to approximately 60% until revenue catches up.

**At 500 customers (approximately $5M–$6M ARR):**
Two risks materialize. First, inference costs: if the average customer at 500 accounts is generating significantly more AI-processed interactions than the early cohort (larger funds, more active deal flow), inference cost per customer increases and gross margin compresses toward 65–70%. Mitigation is tier-based rate limiting and introducing usage-based overages above a defined threshold at the Studio tier. Second, the personal, non-shared intelligence model creates a support complexity problem — each customer's data is isolated, which means debugging and CS escalations cannot be triaged by examining shared patterns. This is a cost that needs to be anticipated in the support infrastructure before 500 customers, not after.

**Margin killers to watch:**
- Anthropic API price changes: currently, the inference cost assumption is 15–20% of revenue. If Anthropic raises API pricing by 30–40%, gross margin falls to 60–65%, materially changing the unit economics. Mitigation: evaluate model tiering (use Claude Haiku for classification and batch scoring, reserve Sonnet for memo drafting and research) to manage cost per interaction.
- Feature creep in AI-heavy tiers: Memo drafting and signal detection are high-inference features. If Growth and Studio tier customers use these features at 10x the assumed volume, COGS could spike. Instrument usage per feature from day one.
- Customer concentration: If the first 20 customers are disproportionately Seed tier ($6K ACV), the path to $1M ARR requires 167 customers — a meaningful GTM burden. Prioritize Growth and Studio tier sales from the beginning, even though they require more effort per deal.

---

## Key Dependencies and Risks

**Anthropic API dependency:**
Reidar's AI capabilities — classification, brief generation, memo drafting, signal detection — run on Anthropic's Claude models. This is a single-source dependency with three risk vectors: pricing changes (managed through model tiering and usage instrumentation), availability outages (managed through graceful degradation — the product should function as a database and history layer even when AI features are offline), and competitive model shifts (if a materially better or cheaper model emerges from a competitor, the switching cost is a rewrite of prompts and model calls, not a fundamental architecture change).

**Google OAuth for Gmail and calendar:**
The passive capture architecture depends on Google granting and maintaining OAuth access to user accounts. Google's API policy changes have historically affected email integrations (the 2023 API policy update affected several email productivity apps). Risk mitigation is twofold: design the data model so that captured data is owned by Reidar's database, not perpetually pulled from Google (making the captured history persistent even if OAuth access is revoked), and prioritize SOC 2 Type 1 compliance in year one ($25K–$65K investment) to meet Google's security requirements for continued API access.

**Fund lifecycle churn:**
VC funds have a lifecycle — typically 10 years, with active deployment in years 1–4. A GP who raises Fund I and deploys over 4 years may reduce their deal sourcing activity in years 5–7 during the portfolio management phase. This creates a structural churn driver that has nothing to do with product quality. Mitigation: build features that serve the portfolio management phase (signal monitoring for portfolio companies, LP reporting, follow-on evaluation support), ensuring Reidar remains valuable throughout the fund lifecycle, not just during deployment.

**AI commoditization risk to pricing power:**
Pre-meeting brief generation and inbound email classification are features that will exist in generic AI products within 18–24 months. ChatGPT Plus, Notion AI, and similar tools will offer basic research synthesis that erodes the "wow" factor of the pre-meeting brief specifically. Reidar's pricing power depends on the compounding intelligence layer — the features that are uniquely valuable precisely because they require 12+ months of this GP's interaction history. This means the pricing moat is in pass reason capture, company history, temporal resurfacing, and LP report provenance — not in the AI research features. Product development and marketing should reinforce the compounding memory layer as the primary differentiator, not AI research quality.

---

## The Upmarket Path

**Year 1 — Emerging funds ($0–$50M AUM):**
The beachhead. 1–2 GPs, no analyst, maximum pain density, lowest sales friction. Design partners are all in this segment. Revenue target: $500K ARR by end of year one, which requires approximately 40–50 paying Seed-tier customers or 25–30 Growth-tier customers. CAC is low because the GP is the buyer and the decision cycle is short (days to weeks, not months). The product in this phase is optimized for immediate value delivery: inbound classification, pass reason capture, and pre-meeting briefs.

**Year 2–3 — Mid-tier funds ($50M–$150M AUM):**
The growth phase. Funds in this range have more complex tooling needs, are more likely to have an existing CRM (Affinity or Attio), and have 2–4 GPs with varying investment approaches. The product needs to support multiple GP profiles, analyst seats, and CRM sync. Revenue target: $3M–$5M ARR by end of year three. The sales motion shifts from founder-led outbound to a hybrid model: inbound from community referrals plus structured outbound targeting Managing Partners at funds in this AUM range. CAC increases, but ACV doubles. The product in this phase prioritizes team collaboration features and integration depth.

**Year 3–5 — Institutional funds ($150M–$500M AUM):**
The expansion phase. Institutional funds have procurement processes, security reviews, and legal requirements that extend the sales cycle to 3–6 months. They also have larger operating budgets and are willing to pay $24K+ ACV for products that integrate with their existing stack and have enterprise-grade security. The Studio tier becomes the growth lever. At this AUM level, the "no analyst" pain disappears — these funds have analysts. The value proposition shifts to: Reidar ensures that senior GP judgment is captured even when analysts rotate (a real institutional pain), and that the firm's intellectual capital persists across partner changes.

**Where the model breaks:**
Above $500M AUM, the decision to purchase a tool like Reidar involves a COO, a CFO, and often the LP advisory board. The sales cycle extends to 6–12 months, the legal review requires dedicated resources, and the required integrations (proprietary deal management systems, data rooms, LP portals) are custom rather than standardized. At this point, Reidar would need to either build an enterprise sales motion (expensive, requires a different team profile) or explicitly hold the line at $500M AUM and let institutional players above that threshold go. The right answer for the first five years is to hold the line and maximize penetration in the $0–$500M AUM segment before attempting to replatform for enterprise.

**ACV expansion path per customer:**
The natural upgrade path is designed to follow fund growth. A GP who launches Fund I at $30M AUM starts at the Seed tier ($6K ACV). If Fund II is $75M AUM, they upgrade to Growth ($12K ACV). If Fund III is $200M AUM, they move to Studio ($24K ACV). This is a 4x ACV expansion over a 6–10 year customer relationship, entirely driven by the customer's own success — not by Reidar adding features the customer doesn't need. This is the most defensible expansion motion in B2B SaaS: growth that feels inevitable to the customer because it tracks their own trajectory.

---

## Strategic Connections

- The compounding value architecture (better over 12 months than at day 30) is both the product's moat and its most significant onboarding risk. The first 60 days — before sufficient history exists to demonstrate compounding — are the highest churn risk window. The business model should account for this with a 90-day onboarding milestone and proactive check-ins timed to the first "Reidar surfaced something I would have missed" moment.
- The personal, non-shared intelligence model is the primary pricing differentiator against shared-database tools. It is also the reason a network-effects growth strategy is unavailable in the short term. Any future pivot toward warm intro networks or shared deal flow features must be designed as an opt-in layer, not a default, to preserve the trust that makes the core value proposition work.
- Gross margin durability at scale depends on model tiering discipline. Every feature that can use Claude Haiku should use Haiku. Sonnet-level inference should be reserved for features where output quality is directly evaluated by the GP (memo drafting, research summaries). This is both a cost management principle and a product design principle.
