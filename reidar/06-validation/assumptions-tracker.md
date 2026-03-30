# Assumptions Tracker

**Phase:** 8 — Validation
**Project:** reidar
**Date:** 2026-03-29
**Confidence:** See per-row ratings

---

Every material claim in the Reidar business plan rests on one or more assumptions. This table makes them explicit, honest, and testable. Update status as validation runs.

Status legend: **Untested** / **Testing** / **Validated** / **Invalidated**

---

## Critical Assumptions (Business Breaks If Wrong)

| # | Assumption | Category | Confidence | How to Test | Status |
|---|---|---|---|---|---|
| A1 | Emerging GPs will grant Gmail + calendar OAuth access to Reidar | Trust / GTM | **Low** | Design partner onboarding: track OAuth completion rate | Untested |
| A2 | Pre-meeting briefs are valuable enough on Day 1 (before history accumulates) | Product | **Low-Medium** | Concierge MVP: manually deliver briefs to 5 GPs; measure session-by-session NPS | Untested |
| A3 | Pass reason capture surfaces usable signal, not just noise | Product | **Low** | 6-week pilot: ask 3 design partners to rate every resurfaced alert as useful/not useful | Untested |
| A4 | GPs will pay $500/month without requiring LP or IC approval | Willingness to Pay | **Medium** | 10 customer discovery interviews; ask directly about software budget authority | Untested |
| A5 | GPs who have used Reidar for 6+ months won't want to restart from scratch (switching cost) | Retention | **Low** | Only testable in Month 7+; track churn rate and exit interview reasons | Untested |
| A6 | The compounding moat (accumulated judgment history) is meaningfully harder to replicate than standard CRM features | Competitive | **Medium** | Design partner co-design sessions: ask GPs to try Affinity/4Degrees after 3 months of Reidar; gather qualitative comparison | Untested |

---

## Important Assumptions (Material Impact If Wrong)

| # | Assumption | Category | Confidence | How to Test | Status |
|---|---|---|---|---|---|
| B1 | NYC is the right beachhead — GPs there are more reachable than SF | GTM | **Medium-High** | Track outreach response rate in NYC vs. any SF contacts; infer from conference presence | Untested |
| B2 | Word of mouth travels within the NYC emerging GP community | Growth | **Medium** | Track referral source for each new customer; ask "how did you hear about us?" | Untested |
| B3 | The Insight Partners contact will make 3+ warm intros to emerging fund managers | GTM | **Medium** | Ask directly; offer a structured "here's what I'm asking you to do" pitch | Untested |
| B4 | GPs will engage with a Substack/LinkedIn content strategy | Content GTM | **Low-Medium** | Publish 4 posts; track open rate, shares, and inbound DMs from target persona | Untested |
| B5 | Design partner → paid conversion rate will be ≥ 60% (3 of 5) | Revenue | **Medium** | Track at Month 4; interview churned design partners | Untested |
| B6 | Monthly churn stabilizes below 3% after the first 90 days | Retention | **Medium** | Track monthly; compare to SaaS benchmark (3% = acceptable, 5%+ = product problem) | Untested |
| B7 | The technical co-founder can build the passive capture layer (Gmail/calendar deep integration) in < 6 months | Feasibility | **Medium-High** | Technical spike: build Gmail OAuth + basic read in Week 1–2 as a proof of concept | Untested |

---

## Lower-Stakes Assumptions (Manageable If Wrong)

| # | Assumption | Category | Confidence | How to Test | Status |
|---|---|---|---|---|---|
| C1 | $500/month Seed tier is the right price (not $250 or $750) | Pricing | **Medium** | A/B test pricing conversation in discovery calls; use anchoring technique | Untested |
| C2 | The "AI investment associate" category framing lands better than "VC CRM" | Positioning | **Medium** | Split messaging test: send two versions of outreach to 10 GPs each; compare response rate | Untested |
| C3 | GPs prefer proactive surfacing ("You passed because X — they just fixed X") over dashboard browsing | UX | **Medium** | User testing with 3 design partners: observe whether they use the alert feed or the pipeline view | Untested |
| C4 | Infrastructure costs stay below $1,000/month for the first 20 customers | Unit Economics | **High** | Track actual API and hosting costs monthly; alert if >$50/customer/month | Untested |
| C5 | EVCA/VC Platform community participation will generate warm leads within 90 days | GTM | **Low** | Track lead source for every conversation; set 90-day target of 3 leads from community presence | Untested |
| C6 | SOC 2 is not required by beachhead customers in Year 1 | Compliance | **Medium** | Ask directly in discovery calls: "Would you need a SOC 2 certification before connecting your email?" | Untested |

---

## Assumption Priority Map

The following assumptions are **load-bearing** — if any of these come back negative, the current strategy requires a pivot before further investment:

1. **A1** (Gmail OAuth consent) — If GPs won't connect their email, the passive capture thesis is dead. Nothing else matters.
2. **A2** (Day 1 value) — If there's no value before 6 months of history, the design partner program will fail. No paid conversion.
3. **A4** (WTP at $500/month) — If GPs won't pay without budget approval, the sales cycle extends from days to months. The beachhead model breaks.

All other assumptions are important but survivable. These three determine whether the product idea is viable at all.

---

*Cross-references: experiment-design.md (detailed test protocols for top 3), kill-criteria.md (what invalidation means for the business)*
