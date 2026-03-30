# Validation Playbook

**Phase:** 8 — Validation
**Project:** reidar
**Date:** 2026-03-29
**Confidence:** Framework is sound; execution depends on founder's network and sales motion

---

## Overview

Reidar has a working prototype and a clear hypothesis. The job of validation is not to prove the idea is good — it's to find out quickly and cheaply where the idea is wrong, and fix it before spending months building in the wrong direction.

Experiments are ordered from fastest/cheapest to most expensive. Run them in sequence. Don't skip ahead.

---

## Experiment 1: Customer Discovery Interviews
**Cost:** $0 | **Time:** 2 weeks | **Tests:** A1, A2, A4, C2, C6

### What It Tests
Whether emerging GPs experience the judgment-capture problem the way Reidar frames it. Whether they'd grant email/calendar access to a product they haven't used. Whether $500/month is in impulse-buy territory.

### How to Run It

**Target:** 10–15 emerging fund GPs. Prioritize:
- Fund I–III, $10M–$100M AUM
- Active on LinkedIn or VC Twitter
- NYC-based if possible
- Warm intro preferred; cold DM acceptable

**Outreach script (LinkedIn DM):**
> "Hey [name] — I'm Remi, building a tool for emerging GPs around institutional memory: the judgment, pass reasons, and pattern recognition that never makes it into a CRM. Would love 20 minutes to hear how you currently handle this. Not pitching — genuinely in discovery mode. Would [day] work?"

**Interview structure (20 minutes):**
1. (5 min) "Walk me through the last time a company came back to you after a pass — what happened?"
2. (5 min) "How do you currently capture why you pass on something? What do you wish you'd captured?"
3. (5 min) "If a tool watched your Gmail and calendar and surfaced your old context before each meeting — what would make you say yes to connecting your email? What would make you say no?"
4. (5 min) "We're thinking $500/month. Where does that land for you — easy, needs approval, out of range?"

**What to record after each call:**
- Did they describe the pain unprompted?
- How did they react to the Gmail/calendar connection question?
- What's their actual current workaround?
- Price reaction: flinch / nod / "let me think"

### What to Measure
- % of interviewees who describe the judgment-capture problem unprompted (target: > 60%)
- % who say they would connect email/calendar if they trusted the product (target: > 40%)
- % who say $500/month is within individual budget authority (target: > 50%)

### What Validates vs. Invalidates

| Result | Interpretation |
|---|---|
| 6+ of 10 describe the problem unprompted | Problem is real and resonant — proceed |
| < 4 of 10 describe the problem | Problem framing is off; the pain may not be acute enough — revisit positioning |
| < 3 of 10 would connect email | Trust barrier is structural; GTM must lead with data privacy story before product pitch |
| < 3 of 10 can approve $500 themselves | Sales motion requires a different entry point (free tier, trial, LP-level sponsorship) |

---

## Experiment 2: Landing Page + Waitlist Test
**Cost:** $200–500 (Framer or Webflow template) | **Time:** 3 days to launch, 2 weeks to collect | **Tests:** C2, B4

### What It Tests
Whether the product narrative converts cold traffic. Whether the "AI investment associate" framing and the judgment-capture hook get GPs to take action without a founder pitch.

### How to Run It

Build a single-page site (Framer recommended — no code, fast):
- Headline: "The AI investment associate that makes sure nothing you've ever learned gets lost."
- 3-bullet value prop: pre-meeting briefs / pass reason capture / resurfacing
- Single CTA: "Request early access"
- Email capture only — no demo link, no pricing

**Drive traffic via:**
- 3–5 LinkedIn posts over 2 weeks (founder voice, not promotional)
- Direct share to 20–30 warm contacts in VC-adjacent network
- Post in EVCA Slack / VC Platform community (one post, thoughtful framing, not spam)

**Track:**
- Unique visitors
- Email capture rate (visitors → waitlist)
- Where traffic came from

### What to Measure
- Conversion rate on the landing page (target: > 5% of visitors sign up)
- % of signups who are identifiably GPs (LinkedIn profile check)
- Response rate if you email signups asking for a 20-minute call (target: > 30%)

### What Validates vs. Invalidates

| Result | Interpretation |
|---|---|
| > 5% conversion, mostly GPs | Messaging resonates; proceed to Experiment 3 |
| > 5% conversion, not GPs | You're solving a different market's problem — worth exploring |
| < 2% conversion | Headline/positioning isn't landing cold; A/B test 2 alternative headlines before burning the channel |

---

## Experiment 3: Concierge MVP (Wizard of Oz)
**Cost:** ~20 hours founder time | **Time:** 4–6 weeks | **Tests:** A2, A3, B5

### What It Tests
Whether the daily/pre-meeting value of Reidar is real when delivered manually — before any automation exists. This is the most important pre-build test. If GPs don't find manual briefs valuable, automated briefs won't save it.

### How to Run It

Recruit 3 GPs from the discovery interview pool who expressed interest. Offer free access in exchange for weekly 15-minute feedback calls.

**What you do (manually):**
- Ask each GP to forward you their calendar for the next 2 weeks
- Ask them to BCC you on any inbound pitch emails they receive
- The evening before each external meeting: Google the company, pull the LinkedIn, write a 3-paragraph brief (founder background, last round, one signal worth noting), and email it to the GP
- After each meeting: follow up asking "did you capture a pass reason? what was it?" — log it in a shared Notion doc with the GP

**What you're simulating:** The automated Gmail → calendar → brief generation loop, done by hand.

**Track per GP:**
- Did they open the brief? (ask them directly)
- Did they use it in the meeting? (ask)
- Did they capture pass reasons? (observe compliance rate)
- After 4 weeks: "Would you pay $500/month for this?"

### What to Measure
- Brief open rate (target: > 80%)
- % of meetings where GP reports brief was useful (target: > 60%)
- Pass reason capture compliance (target: > 50% of meetings)
- Willingness to pay after 4 weeks of manual service (target: 2 of 3 say yes)

### What Validates vs. Invalidates

| Result | Interpretation |
|---|---|
| 2+ of 3 say they'd pay after 4 weeks | Daily value loop is real; build the automation |
| GPs stop engaging by Week 2 | The brief format isn't compelling or the habit doesn't stick — redesign before automating |
| GPs love it but won't pay | The value is real but pricing or category is wrong; interview about this specifically |
| < 50% pass reason compliance | GPs aren't motivated to capture context; rethink the capture mechanic (passive vs. active) |

---

## Experiment 4: OAuth Consent Test
**Cost:** 1–2 days of co-founder dev time | **Time:** 1 week | **Tests:** A1

### What It Tests
The single highest-risk assumption: will GPs actually click "Allow" on a Google OAuth screen connected to their work email?

This can be tested separately from the full product — even a simple "connect your Google account to get your first pre-meeting brief" screen is sufficient.

### How to Run It

1. Co-founder builds a minimal OAuth flow: landing page → "Connect Google Calendar" button → OAuth consent screen → confirmation page
2. No data is actually processed — this is purely to observe consent behavior
3. Present to 5 of the interviewees who expressed interest in Experiment 1
4. Observe: do they complete the flow or abandon at the consent screen?

**Post-experiment question:** "You didn't connect — what made you hesitate?" or "You connected — what made you comfortable enough?"

### What to Measure
- % of GPs who complete OAuth when asked (target: > 40%)
- Abandonment point (landing page → OAuth screen → consent → done)
- Qualitative reasons for refusal

### What Validates vs. Invalidates

| Result | Interpretation |
|---|---|
| 3+ of 5 complete OAuth | Trust is achievable with warm intros and product framing; proceed |
| 1–2 of 5 complete | Trust barrier is high; GTM must lead with data handling transparency (privacy page, "we never store email content") before asking for access |
| 0 of 5 complete | The product premise requires a fundamentally different data access model — rethink (e.g., manual upload, meeting notes only, no email access) |

---

## Experiment 5: Design Partner Program (Paid)
**Cost:** $0 (free access) → conversion to $500/month | **Time:** 90 days | **Tests:** A5, B5, B6, C3

### What It Tests
Everything at once — under real-world conditions, do GPs use the product daily, capture context consistently, and pay $500/month when the free period ends?

### How to Run It

Recruit 5 NYC-based emerging GPs as design partners. Criteria:
- Active on Twitter/LinkedIn (amplification value)
- Fund I–III, actively sourcing
- At least 2 warm intros from network (not cold)

**Terms:**
- 90 days free
- Weekly 30-minute co-design call
- Public testimonial at the end if they found value
- Introduced as "Reidar design partner" — a named, special cohort

**What you track:**
- Weekly active usage (login frequency, briefs generated, notes ingested)
- Month 3: "Would you pay $500/month to continue?" conversation
- Month 4: conversion rate (target: 3 of 5 convert)

### What Validates vs. Invalidates

| Result | Interpretation |
|---|---|
| 3+ of 5 convert to paid | Core design partner → paid conversion works; begin outbound GTM |
| 1–2 of 5 convert | The product isn't delivering enough daily value; fix before spending on acquisition |
| 0 of 5 convert | Fundamental PMF problem — run a post-mortem with each design partner before deciding whether to continue |

---

## Experiment Sequence Summary

| Order | Experiment | Duration | Cost | Decision Gate |
|---|---|---|---|---|
| 1 | Customer discovery interviews | 2 weeks | $0 | Must get: 6/10 GPs describe problem; 3/10 would connect email |
| 2 | Landing page + waitlist | 2 weeks | $300 | Must get: > 5% conversion rate from GP traffic |
| 3 | Concierge MVP | 4–6 weeks | ~20 hrs time | Must get: 2/3 GPs say they'd pay after 4 weeks manual service |
| 4 | OAuth consent test | 1 week | 1–2 days dev | Must get: 3/5 GPs complete OAuth when asked |
| 5 | Design partner program | 90 days | Free access | Must get: 3/5 design partners convert to paid at Month 4 |

**Total time before first paid revenue:** ~16 weeks if all experiments pass sequentially. This is the minimum credible validation path — skipping steps increases the risk of building something no one uses or pays for.

---

*Cross-references: experiment-design.md (detailed protocols for Experiments 1–3), assumptions-tracker.md (assumption IDs), kill-criteria.md (what to do if experiments fail)*
