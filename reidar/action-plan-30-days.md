# 30-Day Action Plan

**Project:** reidar
**Date:** 2026-03-29
**Goal:** Validate the three core assumptions before raising, or raise from a position of early evidence

---

## The Principle

The 30-day plan has two parallel tracks running simultaneously:

**Track A — Validation:** Run experiments to answer the three load-bearing questions before spending investor money on the wrong version of the product.

**Track B — Fundraise prep:** Consolidate materials, work the network, and begin investor conversations in Week 2.

These aren't sequential. You're validating and fundraising at the same time. Evidence from Track A makes Track B more credible with every passing week.

---

## Week 1: Build the Foundation

**Goal:** Co-founder formalized, outreach list built, first 5 conversations scheduled, landing page live.

### Monday–Tuesday: Formalize the Team

- [ ] Sign co-founder agreement (IP assignment, equity split, vesting schedule). Use Clerky's standard docs — takes 2 hours, not a lawyer. Non-negotiable before any investor conversation.
- [ ] Set the co-founder's departure date from their current job. Not "when we raise." A specific calendar date.
- [ ] Sign up for a Delaware C-Corp via Stripe Atlas ($500, 2-day turnaround) if not already incorporated.

### Wednesday–Thursday: Build the Outreach List

Build a list of 25 target GPs for customer discovery. Prioritize:

1. **Tier 1 (warm):** Anyone in your network who knows a GP, fund manager, or VC-adjacent person. Text 10 people today: "I'm doing customer discovery for Reidar — do you know any GPs at small/emerging funds I should talk to?" Collect names.

2. **Tier 2 (luke-warm):** GPs who follow you on Twitter/LinkedIn, Duke alumni in finance/VC, anyone who's engaged with your posts in the last 12 months.

3. **Tier 3 (cold):** Use EVCA member directory + LinkedIn search ("General Partner" + "Fund I" + NYC). Target GPs who are active on LinkedIn — they're more likely to respond to cold messages.

For each person on the list, note: how you know them, their fund name and size, and one specific thing to reference in the outreach message.

### Friday: Launch the Landing Page

Build a Framer landing page in one day (use their VC/SaaS template). The page needs:
- Headline: "The AI investment associate that makes sure nothing you've ever learned gets lost."
- 3-line description: what Reidar does, not how it works
- Single CTA: "Request early access" + email field
- No pricing, no demo link, no team section

Publish and share to 15 warm contacts with: "I'd love your honest reaction to this — does the problem resonate?"

### Week 1 Deliverables
- [ ] Co-founder agreement signed
- [ ] 25-person outreach list with warm/lukewarm/cold tier labels
- [ ] 5 discovery call slots booked (use Calendly, 20-minute slots)
- [ ] Landing page live with email capture working
- [ ] First 5 LinkedIn connection requests sent to Tier 3 targets with personalized notes

---

## Week 2: Run Experiments + Begin Investor Outreach

**Goal:** Complete 5–7 customer discovery calls. Begin investor conversations. Co-founder starts technical spike.

### Customer Discovery (Daily, 1–2 calls/day)

Run interviews using the script in `06-validation/experiment-design.md`. After each call:
- Score the interview (8-point scale in the experiment design)
- Note the exact words they used to describe the problem (language map for positioning)
- Ask: "Is there anyone else I should be talking to?" — every call should generate 1–2 new names

**Target by end of Week 2:** 6–8 completed interviews. Running average score tracked.

### Investor Outreach — Prep Materials

Build the investor package this week (don't wait until you have traction):

**1. One-page deck (10 slides max):**
- Problem (1 slide with a GP quote from your discovery calls)
- Solution (1 slide — what Reidar does in 3 bullets)
- Why now (1 slide — timing: AI adoption, emerging manager growth, Rowspace validation)
- Market (1 slide — beachhead SAM + full TAM path)
- Product (1 slide — prototype screenshots, core features)
- Business model (1 slide — pricing, unit economics, gross margin)
- Traction (1 slide — prototype live, X conversations, X discovery calls, X interested in beta)
- Team (1 slide — your background + co-founder CS/math + authentic origin story)
- Ask (1 slide — $400K at $3.5M cap, use of funds, 12-month milestones)

**2. Two-paragraph investor email:**
```
Subject: Reidar — AI investment associate for emerging fund managers

Hi [name],

I'm building Reidar — an AI investment associate that captures the judgment VCs accumulate
over time and makes sure none of it gets lost. It watches how a GP already works (Gmail,
calendar, meeting notes) and builds an irreplicable intelligence layer: pre-meeting context,
pass reason capture, resurfacing when conditions change.

The emerging fund GP market is underserved by tools built for established firms. We're raising
$400K on a SAFE at $3.5M cap to prove the model with 10 paying NYC-based GPs in 12 months.
Working prototype live. Happy to share a deck or get on a call — [Calendly link].
```

**3. Build the investor list (20 targets):**
- Tier 1: Micro-VCs and angels who invest in pre-revenue B2B SaaS / VC tooling / AI (Precursor Ventures, Hustle Fund, angel investors in your network)
- Tier 2: Angels from the VC community who'd understand the pain firsthand (former GPs turned angels, VC platform operators)
- Tier 3: Duke network angels who'd back you on founder conviction

### Co-Founder: Technical Spike

This week: build a proof-of-concept Google Calendar OAuth connection. Not the full product — just: user clicks "Connect Google Calendar" → OAuth screen → calendar events read into a local variable → confirmation shown.

Goal: prove the OAuth flow works before Week 4 when you'll use it in Experiment 4. Estimated: 2–3 days of focused work.

### Week 2 Deliverables
- [ ] 6–8 discovery calls completed, scores tracked
- [ ] Investor deck complete (10 slides)
- [ ] Investor list of 20 targets with tier labels
- [ ] First 5 investor emails sent to warm Tier 1 targets
- [ ] Calendar OAuth proof-of-concept working locally
- [ ] LinkedIn post 1 published (the problem framing post)

---

## Week 3: Concierge MVP + Investor Conversations

**Goal:** Recruit 3 Concierge MVP participants, deliver first manual briefs. Investor conversations ongoing. Begin investor follow-ups.

### Concierge MVP — Recruiting

From the 6–8 discovery call pool, identify 3 GPs who:
- Scored 5+ on the 8-point interview scale
- Have ≥ 5 external meetings per week
- Expressed interest in being in a beta

Email each of them:
```
Subject: Reidar — private beta invitation

Hi [name],

Thanks for talking with me last week. Based on our conversation, I'd like to invite you
to be one of 3 founding beta partners.

Here's what it is: for the next 4 weeks, I'll personally research and write a brief for
every external meeting you have — the night before, in your inbox, no work from you.
After each meeting, I'll ask one question: "Worth capturing anything?" That's it.

In exchange: 30 minutes with me weekly, and a note I can share publicly (with your approval)
about what it was like. No cost, no commitment beyond 4 weeks.

Does [day] or [day] work to kick this off?
```

### Concierge MVP — Week 1 Delivery

Once 2–3 GPs confirm:
1. Ask each to share a Google Calendar view (read-only) or just forward you their upcoming external meetings
2. Deliver the first batch of briefs using the format in `06-validation/experiment-design.md`
3. Follow up the morning after each meeting: "How'd [company] go? Pass reason worth capturing?"

This is the most important work happening in Weeks 3–6. Don't let investor meeting prep crowd it out.

### Investor Conversations

Send the second batch of investor emails (5 more Tier 1/2 targets). For any Tier 1 investors who responded in Week 2: take the call and present the deck.

**One thing to say in every investor call:** "We have 3 GPs running a manual version of the product right now. We'll know whether GPs find daily briefings valuable within 4 weeks." Investors at pre-seed are buying your ability to learn fast. Show them you're already learning.

### Week 3 Deliverables
- [ ] 3 Concierge MVP participants confirmed
- [ ] First briefs delivered (minimum 5 briefs total across 3 GPs)
- [ ] 3–5 investor conversations completed or scheduled
- [ ] LinkedIn post 2 published (the data observation post)
- [ ] Investor follow-up emails sent to anyone who didn't respond in Week 2
- [ ] OAuth consent test scheduled for Week 4 (3–5 GPs from the discovery pool)

---

## Week 4: Evidence + Decisions

**Goal:** Run OAuth consent test. Gather Week 1 Concierge MVP feedback. Make go/no-go decision on continuing the raise vs. extending validation.

### OAuth Consent Test (Experiment 4)

Run the flow built in Week 2:
- Present the "Connect your Google Calendar" flow to 3–5 GPs who expressed interest
- Observe completion vs. abandonment
- Run the 5-minute debrief: "What made you hesitate / what made you comfortable?"
- Score against the target: 3 of 5 complete OAuth

If < 3 complete: pivot to calendar-only strategy immediately. Brief potential investors on the finding proactively — "We ran an OAuth consent test. Here's what we learned and here's how we're adapting."

### Concierge MVP — Week 2 Check-in

By end of Week 4, you have 2 weeks of manual brief data. Review:
- Are GPs opening and engaging with the briefs?
- Are they capturing pass reasons when asked?
- Are they asking for more / different format?

Adjust brief format based on what you observe, not what you assume. If GPs stop responding by Week 2, something is wrong with the daily habit — change the delivery mechanism before blaming the product concept.

### Week 4 Assessment — The Real Go/No-Go

At the end of Week 4, make an honest assessment:

**If evidence is positive** (6+ interviews scored well, Concierge GPs are engaged, OAuth consent test passes, 2–3 investors expressed serious interest):
→ Complete the raise in the next 2–4 weeks. Close with a "here's our traction so far" update to investors.

**If evidence is mixed** (some signals positive, some negative):
→ Identify which kill criterion is at risk. Design the specific pivot. Give it 2 more weeks before deciding.

**If evidence is clearly negative** (Concierge MVP briefs aren't being read, OAuth consent test fails, investors consistently cite the data trust problem):
→ Run the alternatives laid out in the kill criteria before concluding the idea is wrong.

### Week 4 Deliverables
- [ ] OAuth consent test completed, results documented
- [ ] Week 2 Concierge MVP check-in calls done, feedback synthesized
- [ ] 10 total discovery calls completed (target), score summary written up
- [ ] LinkedIn post 3 published (the scenario framing post)
- [ ] Decision made: raise now / extend validation / pivot

---

## Standing Weekly Rhythms (Weeks 1–4)

**Every Monday morning (30 minutes):**
- Review the assumptions tracker: what moved last week?
- Review investor pipeline: who to follow up, who to schedule
- Review Concierge MVP: what briefs to write this week

**Every Friday (30 minutes):**
- Write up the week's learnings in a single paragraph
- Update the assumptions tracker status column
- Send one update to any investor in active conversation: 2 sentences on what you learned this week

The Friday update is not optional. Investors at pre-seed are backing momentum. A founder who updates weekly with real learning signals is more investable than one who goes silent between calls.

---

## Metrics to Track Daily

| Metric | Week 1 Target | Week 2 Target | Week 3 Target | Week 4 Target |
|---|---|---|---|---|
| Discovery calls completed | 2 | 6 | 8 | 10 |
| Average interview score (1–8) | — | ≥ 4 | ≥ 4 | ≥ 4 |
| Landing page email captures | 5 | 15 | 25 | — |
| Investor emails sent | 0 | 5 | 10 | 15 |
| Investor conversations taken | 0 | 2 | 4 | 6 |
| Concierge MVP briefs delivered | 0 | 0 | 5 | 12 |
| LinkedIn post published | 0 | 1 | 1 | 1 |

---

*Cross-references: validation-playbook.md (experiment details), experiment-design.md (scripts), projections.md (fundraise timeline)*
