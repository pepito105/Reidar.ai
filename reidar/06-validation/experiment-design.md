# Experiment Design

**Phase:** 8 — Validation
**Project:** reidar
**Date:** 2026-03-29
**Confidence:** High (frameworks are standard; execution quality depends on founder)

Detailed designs for the three most important experiments. Use these directly — scripts, templates, and metrics are production-ready.

---

## Experiment 1: Customer Discovery Interviews

### Hypothesis
Emerging fund GPs (Fund I–III, NYC-based, 1–3 GP teams) experience the judgment-capture problem acutely enough to pay $500/month for a solution, and are open to connecting their Gmail and Google Calendar to a trusted product.

### Method

**Recruiting (Week 1):**

Target list: 20 GPs to approach (expect 30–40% response rate → 6–8 initial calls).

Priority sourcing:
1. Your existing network (Duke alumni in VC, Strings investors/advisors, anyone who's heard of Reidar)
2. EVCA member directory (public — emerging VC association)
3. Twitter/X lists: "emerging manager" "new fund" "debut fund" NYC-based accounts
4. LinkedIn search: "General Partner" + "Fund I" or "Fund II" + NYC + seed/pre-seed

**Outreach template (LinkedIn DM — 70 words max):**
```
Hey [name] — I'm building a tool for emerging GPs around a problem I think is underbuilt:
capturing the institutional memory that never makes it into a CRM (pass reasons, pattern
recognition, why a company looked different 18 months later).

Would love 20 minutes to hear how you currently handle this — pure discovery, not a pitch.
Would [day] or [day] work?
```

**Email version (if LinkedIn doesn't land):**
```
Subject: 20 minutes on GP institutional memory

Hi [name],

I'm Remi Balassanian — building Reidar, an AI investment associate for emerging fund managers.

I'm in discovery mode on a specific problem: how GPs capture the judgment that doesn't live
in a CRM. Not pitching — I want to hear how you think about this before I build anything.

20 minutes by phone or Zoom? [Calendly link]
```

---

### Interview Script

**Opening (establish context — 1 minute):**
> "Thanks for making time. I'm in pure learning mode — I'll record some notes but I'm not selling anything today. Mind if I jump into questions?"

**Section 1: The Problem (5–6 minutes)**

Q1: "Tell me about a company you've looked at more than once. What happened the second time you saw it — did you remember your original take?"

*(Listen for: spontaneous mention of the memory/context problem. Don't lead.)*

Q2 (if they don't surface it): "How do you currently capture why you pass on something?"

Q3: "If a company you passed on 18 months ago came back significantly better — how quickly could you reconstruct why you passed and what's changed?"

Q4: "What's the most frustrating part of your current process for tracking deals and context?"

**Section 2: Current Solutions (3–4 minutes)**

Q5: "Walk me through the tools you currently use for deal flow. What's in each one?"

Q6: "What do you wish existed that doesn't?"

Q7: "Have you tried any AI tooling for deal sourcing or research? What happened?"

**Section 3: The Product (3–4 minutes)**

Q8: "Here's what we're building. [2-sentence pitch: Reidar connects to your Gmail and calendar and starts learning from how you work. Before every meeting, it surfaces your prior context. Over time, it learns which companies match your pattern.] What's your first reaction?"

Q9: "The part about connecting your Gmail — what would make you comfortable doing that? What would make you say no?"

Q10: "Does this solve the problem you described earlier, or is it adjacent to it?"

**Section 4: Willingness to Pay (2–3 minutes)**

Q11: "We're thinking $500/month, billed monthly. Where does that land for you — easy, needs a conversation with someone, or out of range?"

Q12: "Who else at your firm would need to weigh in on a software decision like that?"

**Closing (1 minute):**
> "Really helpful. Two quick asks: Is there anyone else in your network I should be talking to? And — if we build a small private beta, would you want to be in the first five?"

---

### Metrics and Scoring

After each interview, score on these dimensions (yes/no):

| Signal | Yes | No |
|---|---|---|
| Described the judgment-capture problem unprompted | +2 | 0 |
| Currently using only informal systems (Notion, email, spreadsheet) | +1 | 0 |
| Expressed frustration with current tools | +1 | 0 |
| Reacted positively to Gmail connection concept | +1 | -1 |
| Said $500 is within their personal budget authority | +1 | 0 |
| Asked to be in the beta | +2 | 0 |

**Maximum score per interview: 8. Target average: ≥ 4.**

**Go / No-Go after 10 interviews:**
- Average score ≥ 4 and ≥ 2 beta requests: proceed to Experiment 3
- Average score 3–4: re-examine messaging; run 5 more interviews before deciding
- Average score < 3: core pain hypothesis is wrong; run a pivot session

---

## Experiment 2: Concierge MVP

### Hypothesis
When a GP receives a manually-prepared pre-meeting brief the night before a call — sourced from web research, prior notes, and calendar context — they find it valuable enough to pay $500/month for an automated version.

### Method

**Recruiting 3 design partners from Experiment 1 pool:**
- Must have expressed the problem clearly and reacted positively to the Gmail concept
- Must have ≥ 5 external meetings per week (enough signal volume to make briefs valuable)
- Must agree to a weekly 15-minute feedback call for 4 weeks

**What you do each day (the "manual product"):**

Each evening, pull tomorrow's calendar from each GP (they'll share a Google Calendar view with you):

For each external meeting:
1. Google the company name — find the most recent news, funding, and LinkedIn profile of the CEO
2. Pull any prior email threads they forwarded to you about this company
3. Write a 3-paragraph brief in this structure:
   - **Who they are:** [Company name] is a [stage] [category] startup founded in [year]. [One sentence on what they do.]
   - **Recent signals:** [Latest funding round / news / team change / relevant competitor move].
   - **Your context:** [Any prior interaction you know of — or "First time meeting based on your records."]
4. Send it to the GP's email by 7pm the night before, subject line: "Brief: [Company Name] — [meeting time] tomorrow"

After each meeting, send a follow-up:
> "How did [company] go? Any pass reason worth capturing? Even one sentence helps."

Log responses in a shared Notion doc (one row per company, per GP).

---

### Weekly Feedback Call Structure (15 minutes)

**Week 1:** "What worked, what didn't? Did the brief format feel right?"
**Week 2:** "Which brief was most useful this week and why?"
**Week 3:** "If this existed as a product you installed once — what would need to be true about data handling for you to connect your email?"
**Week 4:** "The free period ends in a few weeks. If this became $500/month, would you continue?"

---

### Metrics

| Metric | Target | Red Flag |
|---|---|---|
| Brief open rate (self-reported) | > 80% | < 50% |
| % of meetings where brief was useful | > 60% | < 40% |
| Pass reason capture rate (% of meetings with a captured pass reason) | > 40% | < 20% |
| Week 4 WTP ("yes, I'd pay $500/month") | 2 of 3 | 0 of 3 |
| Weekly call attendance | 3 of 4 weeks | < 2 of 4 weeks |

---

### Key Learning Questions

Beyond the metrics, you're trying to learn:

1. **What format works?** Does the GP prefer bullet points or prose? Short (3 sentences) or longer? Do they want the brief in email or a Slack-style notification?

2. **What data matters most?** Is it the prior context (your history with the company) or the market signals (recent funding)? This determines what to build first.

3. **What breaks down?** At what point does the manual process fail — when you can't find enough information, when the GP doesn't engage, when meeting notes aren't captured?

4. **What does a "perfect" brief look like?** Ask GPs to show you a brief that actually affected how they approached a meeting. Extract the pattern.

---

## Experiment 3: Founder Content Test

### Hypothesis
Publishing 4 LinkedIn posts on the topic of VC institutional memory — without pitching Reidar — will generate inbound interest from GPs and validate that this is a resonant conversation topic in the community.

### Method

Write and publish one post per week for 4 weeks. Each post should be substantive, not promotional.

**Post 1: The problem framing**
> Title: "The most expensive thing in VC isn't the wrong investment. It's the right investment you evaluated twice."
> Content: 300-word post about the judgment-capture problem. No product mention. End with: "Curious how other emerging GPs handle this — DM me."

**Post 2: The data observation**
> Title: "40-50% of emerging fund GPs track deal flow in spreadsheets. Here's what that means."
> Content: Reference the market research data (from confidence-dashboard.md). Discuss what the industry loses when that data lives in spreadsheets. No product mention.

**Post 3: The case study framing**
> Title: "A company you passed on 18 months ago just raised their Series A. What would you need to remember about why you passed?"
> Content: Walk through a hypothetical scenario illustrating the judgment-loss problem. End with an observation about what tools don't exist.

**Post 4: Transparent product hint**
> Title: "We've been building something for 6 months. Here's the thesis."
> Content: First explicit mention of Reidar — brief, honest, focused on the problem not the feature set. Link to waitlist.

---

### Metrics

| Metric | Target | Red Flag |
|---|---|---|
| Average post impressions | > 1,000/post | < 300/post |
| Inbound DMs from GPs after Post 1–3 | > 5 total | 0 |
| Email captures from Post 4 | > 20 | < 5 |
| % of email captures who are identifiable GPs | > 50% | < 25% |
| Reposts from GPs with followings > 1K | ≥ 1 | 0 |

**Why this matters beyond the metrics:** Content creates warm context. If you've been writing about the problem for 4 weeks before sending a cold outreach email, GPs recognize your name. The response rate on outreach goes from sub-2% to 10–15%. The content is a trust-building precursor to GTM, not a lead channel by itself.

---

*Cross-references: validation-playbook.md (overview of all 5 experiments), assumptions-tracker.md (assumptions being tested), kill-criteria.md*
