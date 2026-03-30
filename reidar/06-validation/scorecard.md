# Idea Scorecard

**Phase:** 8 — Validation
**Project:** reidar
**Date:** 2026-03-29
**Confidence:** Medium — scores reflect the evidence available at pre-revenue stage; several dimensions are based on research, not customer validation

---

## Scoring

| Dimension | Score (1–10) | Rationale |
|---|---|---|
| Problem severity | 7 | Real and recurring pain with documented evidence. The judgment-loss problem surfaces consistently in VC community discourse and was independently validated by HBR research. However, it isn't "hair on fire" — GPs have functional workarounds (Notion, spreadsheets, tribal memory) that they've tolerated for years. The problem is chronic, not acute. |
| Market size | 5 | The beachhead (US emerging GPs, $10M–$150M AUM) produces a SAM of $37M–$62M — genuinely narrow for a VC-backed company. The total addressable VC market is ~$930M+, but getting there requires multiple years of product-market expansion. Investors writing pre-seed checks today are underwriting the path to the large market, not just the beachhead. |
| Competitive advantage | 7 | The accumulated-history moat is real in theory and supported by the data (customers who build 6+ months of decision context won't want to restart). The gap in the market at the sub-$1,000/month emerging fund price point is confirmed — no direct competitor occupies it. Rowspace validates institutional demand at the upmarket tier. However, the moat is unproven in practice and requires customers to stay long enough to build it. |
| Feasibility | 8 | The prototype exists. The core technology stack (FastAPI, React, Anthropic API) is already built and functional. The co-founder brings CS + math background for the technical architecture. The hardest technical component (Google Workspace OAuth + context pipeline) is achievable but untested at production quality. No fundamental technical barrier. |
| Business model clarity | 6 | Pricing is set and benchmarked. Unit economics are favorable (93–96% gross margin, 5–11x LTV:CAC). The SaaS subscription model is well-understood. What's missing: no validated WTP data, no confirmed sales motion, no evidence the design partner → paid conversion works. The model is theoretically sound but empirically unverified. |
| Founder-market fit | 6 | The authentic pain point (started Reidar while trying to break into VC) is a genuine advantage — it's a more compelling origin story than a consultant who spotted a market gap. Proven 0→1 operator with Strings ($600K+ GMV) demonstrates execution ability. The gap: no prior VC experience means the credibility required to sell to GPs must be manufactured through content, design partners, and warm intros rather than assumed. The co-founder's technical depth compensates for some of the domain gap. |
| Timing | 8 | The timing case is strong. AI adoption in VC tooling is accelerating (documented in industry-trends.md). Emerging manager cohorts grew 37% of new fund launches in 2024. The post-ChatGPT mindset shift among GPs — from "AI is a toy" to "AI might be a sourcing edge" — is documented and recent. Rowspace's $50M Sequoia raise specifically validates the category. The window isn't closing imminently, but it's open now in a way it wasn't 3 years ago. |
| **Overall** | **6.7** | |

---

## Verdict

**Conditional proceed.** Reidar has a real problem, a defensible thesis, and a working prototype. The timing is favorable and the competitive whitespace at the emerging fund price point is confirmed. These are the conditions for a viable company.

The conditions are:

**The data access problem must be solved before scale.** The entire product premise rests on passive capture from Gmail and calendar. If GPs won't connect their email — and the research is clear that this is a material trust barrier — the current product design doesn't work. This must be answered in the first 4 weeks, not the first 4 months.

**The Day 1 value must be real without the moat.** The compounding advantage takes 6 months to develop. GPs won't wait 6 months to see if it was worth it. The pre-meeting brief must be useful on Day 1, from publicly available information alone, in a way that is genuinely better than what a GP can do themselves in 5 minutes. The Concierge MVP test (Experiment 3) exists specifically to answer this question.

**The founder credibility gap is the GTM constraint.** This isn't a reason to stop — it's a design constraint. The first 10 customers must come through warm intros, not cold outreach. The content strategy (Experiment 3 in the playbook) is not optional GTM infrastructure; it's reputation-building that compensates for the absence of a prior GP network.

If the three experiments produce positive signals — GPs will connect their calendar, briefs are genuinely useful, content generates inbound — Reidar has a strong case for a $400K pre-seed raise and a credible path to $93K ARR at Month 12.

If any of the three produce negative signals, the response is specific and bounded: test the alternative before concluding the idea is wrong. The kill criteria define those boundaries.

The honest recommendation: **run the validation experiments before raising.** You don't need funding to run 10 discovery interviews and 3 concierge MVP pilots. Raise after you have evidence. The raise will be cleaner, the valuation cap will be more defensible, and you'll be selling a story grounded in real data, not a compelling thesis.

---

## Flags

**Red Flags:**
- Gmail OAuth consent is unvalidated and structurally hard — VCs are the most data-protective B2B buyers in existence
- No paying customers, no validated WTP, no evidence of behavior change from the product in the hands of real users

**Yellow Flags:**
- SAM is narrow; the broader market expansion requires multiple product-market expansions that haven't been designed yet
- Founder-market fit gap (no VC background) requires manufactured credibility that takes time and consistency
- Co-founder commitment is verbal — formalize before investor conversations

---

*Cross-references: risk-analysis.md (detailed risk breakdown), kill-criteria.md (what invalidation looks like), validation-playbook.md (what to do next)*
