# Kill Criteria

**Phase:** 8 — Validation
**Project:** reidar
**Date:** 2026-03-29
**Confidence:** High (criteria are specific, measurable, and tied to identified assumptions)

---

## Purpose

These are the conditions under which Remi should seriously consider stopping or pivoting — before spending more money, more time, or more co-founder goodwill chasing an idea that the evidence says isn't working.

Kill criteria exist to protect founders from sunk-cost thinking. The goal isn't to make stopping easy — it's to make the decision honest and data-driven rather than emotional.

Each criterion is specific and falsifiable. "No demand" is not a kill criterion. "Fewer than X people said Y after we did Z" is.

---

## Kill Criteria

### K1 — Zero OAuth Consent

**Trigger:** 0 of 5 Experiment 4 participants complete Gmail or Calendar OAuth, even with a warm intro and a full privacy walkthrough.

**What it means:** The product premise requires a level of trust that cannot be established with an unknown founder selling to a data-sensitive market. The passive capture approach is not viable without an existing trust anchor (e.g., a known VC investor who endorses the product, a platform integration, or a partner channel that pre-establishes credibility).

**What to do:** Before stopping, test one alternative:
- Can Reidar deliver core value via **manual note upload only** (no OAuth required)?
- Can the product be built on top of an existing trusted platform (e.g., a Notion integration) rather than Gmail/calendar?
If neither path produces a viable product, stop.

---

### K2 — Concierge MVP Fails to Convert

**Trigger:** Fewer than 2 of 3 Concierge MVP participants say they would pay $500/month at the end of the 4-week manual brief service.

**What it means:** The daily value of pre-meeting briefs — Reidar's primary Day 1 value proposition — is not compelling enough to justify payment. If GPs won't pay for the human-delivered version, they won't pay for the automated one.

**What to do:**
- Run exit interviews on what was and wasn't useful
- If GPs loved the briefs but won't pay, the problem is pricing or category framing — test $250/month and/or a different positioning
- If GPs didn't find the briefs useful, the core product format is wrong — consider pivoting to a different value delivery mechanism (weekly intelligence report? async research assistant?)
- If both are true, the product idea needs a fundamental rethink

---

### K3 — Design Partners Don't Convert

**Trigger:** Fewer than 2 of 5 design partners convert from free to paid at Month 4.

**What it means:** After 90 days of free product usage, the majority of GPs who actively co-designed the product don't value it enough to pay $500/month. This is the most damning possible signal — these are warm, engaged, selected users. If they won't pay, cold outbound prospects won't either.

**What to do:**
- Do not launch paid acquisition before understanding why conversion failed
- Exit interview every non-converting design partner: "What would need to be different for you to pay $500/month?"
- If the answer is "nothing — we just don't use it enough": the usage habit hasn't formed. Investigate why the daily trigger (pre-meeting brief) isn't driving logins.
- If the answer is "the signal quality isn't there yet": the compounding moat hasn't emerged at 90 days. Extend the free period and reassess at Month 6 — but only if you have the runway.

---

### K4 — Churn Exceeds 8%/Month for 90+ Days

**Trigger:** Monthly churn stays at or above 8% for 3 consecutive months after the first 5 paying customers are established.

**What it means:** At 8% monthly churn, the average customer stays for ~12 months (1/0.08). LTV is $6,000 at $500/month pricing. CAC at early-stage B2B will be $1,500–3,000 even for founder-led sales. The unit economics are barely viable and will collapse as marketing spend scales. More importantly: high churn means the compounding moat isn't forming. Customers are churning before the history creates switching cost.

**What to do:**
- Segment churn: are customers leaving before or after Month 3? (Before = onboarding failure; after = value promise not delivered)
- If customers leave before Month 3, the activation flow is broken — redesign onboarding around the first "aha moment"
- If customers leave at Month 3–6, the compounding value isn't becoming visible — build the "your intelligence history" quarterly summary and make the moat tangible
- If churn doesn't improve within 60 days of the fix, the product-market fit is fundamentally wrong

---

### K5 — Fundraise Fails After Full Effort

**Trigger:** After 60 days of active fundraising (genuine outreach, 20+ investor conversations, warm intros pursued), no check commits.

**What it means:** The investor market doesn't believe in the founding team, the product, or the market opportunity enough to take the risk at pre-seed. This is not necessarily a product kill criterion — it may mean the raise needs different framing, a different investor profile, or more traction evidence first.

**What to do before stopping:**
- Run 5 investor post-mortems: "Why did you pass?" Listen for patterns
- If the pattern is "founder credibility": get the Insight Partners beta user to be a named reference; publish 4 weeks of content to establish domain authority; consider applying to a structured program (YC, On Deck VC, Antler)
- If the pattern is "not enough traction": get 3 paying customers before the next fundraise attempt, even if it means extending the manual/concierge period
- If the pattern is "market too small": consider whether the pitch needs to lead with the broader VC market ($930M+ TAM) rather than the beachhead, with the beachhead framed as the efficient entry strategy

---

### K6 — Core Technical Build Fails

**Trigger:** Co-founder cannot build a working Gmail + Calendar integration that reliably ingests context and delivers pre-meeting briefs within 8 weeks of full-time work.

**What it means:** The passive capture premise is technically harder than estimated, or the co-founder's skill set doesn't cover the specific technical requirements (Google Workspace API, OAuth, context processing pipeline).

**What to do:**
- First, evaluate whether the timeline slipped due to scope creep (solving too many things) or genuine technical difficulty. Scope creep is fixable; genuine difficulty may not be.
- If the integration can't be built reliably, consider whether Reidar can prove the model with a simpler technical approach first: structured note templates, not automated capture. Prove the value, then automate.
- If the co-founder confirms the integration is not buildable with current resources, the technical feasibility assumption is invalidated. Either bring in a third technical co-founder with relevant API experience, or reconsider the product premise.

---

### K7 — No Problem-Market Fit Evidence After 10 Interviews

**Trigger:** Fewer than 4 of 10 customer discovery interviewees describe the judgment-capture problem unprompted, and fewer than 3 say they'd grant email access to a trusted product.

**What it means:** The problem Reidar is solving is either not acute for the beachhead market, or it's being described in a way that doesn't resonate. This is the earliest and cheapest kill criterion to hit — and the most important one to test first.

**What to do:**
- Before stopping, run 5 more interviews with a different ICP: what if the problem is more acute for **fund analysts** (not GPs) or **associates at larger funds** (not emerging GPs)?
- Also test different framings: instead of "institutional memory," try "deal sourcing intelligence" or "pattern recognition training." If the reaction changes, the problem is real but the positioning is wrong — pivotable.
- If 15 total interviews across two ICP segments produce no strong signal, the core problem hypothesis is wrong. Stop building.

---

## How to Use Kill Criteria Honestly

These criteria exist because founders are naturally optimistic and sunk-cost biased. When you hit a kill criterion:

1. **Don't move the goalposts.** "Fewer than 2 of 5 convert" means what it says. Changing it to "fewer than 1 of 5" post-hoc is not honest decision-making.
2. **Run the exit interviews first.** A negative result is only a kill if you understand why. Exit interviews often surface the pivot.
3. **Tell your co-founder and investors the truth.** "Here's what the data said, here's what I think it means, here's what I'm going to do about it." Investors respect honesty; they lose trust in founders who hide bad news.
4. **A pivot is not a failure.** Most successful companies pivoted. The skill is recognizing the signal early — before spending 18 months on the wrong version.

---

*Cross-references: assumptions-tracker.md (assumptions each criterion is tied to), validation-playbook.md (experiments that generate the data), risk-analysis.md (risks that kill criteria protect against)*
