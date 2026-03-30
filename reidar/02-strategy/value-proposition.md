# Value Proposition: Reidar
Phase: 4 — Strategy
Project: reidar
Date: 2026-03-29
Framework: Value Proposition Canvas (Strategyzer)

---

## Customer Profile

### Jobs-to-be-Done

**Functional jobs** — what the GP is literally trying to accomplish:

- Find the right deals before competitors do, filtered through a specific investment thesis
- Evaluate companies quickly and with enough depth to make a confident yes/no decision
- Never miss a follow-up on a company already in the knowledge base with prior context
- Prepare for investor calls without committing hours of manual research beforehand
- Write investment memos without starting from a blank page every time
- Track what portfolio companies are doing between board meetings

**Social jobs** — how the GP wants to be perceived:

- Be seen as a sharp, thesis-driven investor who doesn't miss obvious deals
- Articulate a credible sourcing edge to LPs ("here is how we find companies")
- Be perceived as ahead of the curve on AI adoption in the fund management context

**Emotional jobs** — how the GP wants to feel:

- In control of a deal flow that is structurally chaotic and high-volume
- Confident walking into investor calls, not playing catch-up
- Like accumulated experience is actually compounding rather than evaporating
- Not like they are reinventing the wheel every time a company re-enters the pipeline

---

### Pains (Ranked by Frequency × Intensity)

**1. Judgment never captured (HAIR-ON-FIRE)**
The reasoning behind a pass — "too early stage," "founder dynamic felt off," "came back in 18 months" — lives only in someone's head. When a company returns for a second look, the GP evaluates cold, as if the first meeting never happened. This is the most frequent pain and carries the highest emotional weight because it represents the literal destruction of accumulated knowledge.

**2. Manual data entry collapses CRM adoption (HIGH frequency, HIGH intensity)**
"If it takes too many clicks, people won't do it... you end up with a partially-filled database nobody trusts." This is a structural failure: the tools that are supposed to preserve institutional memory require the discipline tax that kills adoption. The failure is compounding — every week of low-adoption increases the knowledge gap.

**3. Shared intelligence creates no edge (HIGH strategic relevance)**
Harmonic, Crunchbase, and similar tools deliver identical signals to every competitor simultaneously. The VC who acts on a Harmonic alert knows their top 10 direct competitors received the same alert. Sourcing from shared databases is a structural disadvantage dressed as a feature.

**4. 5–15 hours of manual research per opportunity (HIGH frequency, MEDIUM intensity)**
Before a first call with a promising company, a GP at a 1–2 person fund has no analyst to delegate to. Every background pull, every founder LinkedIn crawl, every competitive landscape read happens manually. At 10–20 new meetings per month, this is 50–300 hours of research annually that displaces portfolio support and LP relationship time.

**5. Memo writing from scratch at 11pm (MEDIUM-HIGH)**
There is no starting point. No template tied to this GP's actual investment lens. No prior evaluation context pulled in automatically. Every memo begins with a blank document and ends with an exhausted GP who can't remember what they thought three months ago.

**6. Missing deals the GP passed on early (MEDIUM frequency, VERY HIGH emotional intensity)**
Every GP has at least one war story: "We met them in their seed round. I liked it but thought it was too early. Never heard from them again. Eighteen months later they closed a $50M Series B and the lead investor was someone I introduced them to." The miss is survivable. The miss after having had prior context is a wound.

**7. No analyst to delegate to at 1–2 GP funds (structural, underlying all other pains)**
This is the root cause of pains 4, 5, and 6. The solo or duo GP is simultaneously deal sourcer, deal evaluator, portfolio manager, LP communicator, and firm administrator. Every hour of low-leverage work (research, data entry, memo drafting) is an hour not spent with founders, LPs, or co-investors.

---

### Gains (Required → Expected → Desired → Unexpected Delighters)

**Required (must exist for the product to be considered):**
- Automatic classification and triage of inbound pitches so the GP only opens relevant decks
- Instant access to full history with any company before a call — prior meetings, notes, what was said, what was decided

**Expected (assumed if the product is credible):**
- Investment memos that reflect how this specific GP thinks, not a generic VC template
- Alerts when pipeline companies hit meaningful milestones — funding rounds, press, team changes

**Desired (would meaningfully increase satisfaction):**
- A "second brain" that knows the GP's investment lens better than any junior analyst could after six months on the job
- Sourcing recommendations filtered through the GP's actual track record and thesis, not a generic mandate configuration screen

**Unexpected delighters (would create genuine surprise and loyalty):**
- LP reporting that includes the provenance of decisions: "We evaluated Company X in March 2024, passed at seed due to market size concerns, resurfaced in October 2025 when they announced enterprise traction, invested at Series A." This turns Reidar's memory into a due diligence artifact and an LP communication tool simultaneously.

---

## Value Map

### Products and Services

Reidar is an AI investment associate that passively captures every interaction a GP has with a company — emails, calendar invites, meeting notes, Loom transcripts — and builds a continuously updated, private intelligence layer on top of that workflow. Core capabilities:

- **Passive workflow capture**: Gmail and calendar integration with zero required data entry
- **Inbound pitch classification**: Every pitch email scored against the GP's thesis automatically
- **Pre-meeting briefs**: Auto-generated before every scheduled investor call
- **Pass reason capture**: Structured note-taking at the moment of decision, stored permanently
- **Company history retrieval**: Full interaction timeline for any company, surfaced on demand
- **Temporal resurfacing**: Companies re-enter the GP's attention when conditions that previously prevented investment have changed
- **Memo drafting**: First-draft memos informed by the GP's own historical evaluations

---

### Pain Relievers (Mapped to Specific Pains)

| Pain | Reidar's Specific Relief |
|---|---|
| Judgment never captured | Pass reason capture at the moment of decision; structured notes stored and retrievable by company forever |
| Manual CRM failure | Zero-input passive capture from Gmail and calendar; no discipline required |
| Shared intelligence = no edge | Personal investor profile built from this GP's actual interactions, not generic mandate configuration |
| 5–15 hours research per deal | Pre-meeting brief auto-generated before every scheduled call; preparation in 2 minutes, not 2 hours |
| Memo writing from scratch | Memo drafting informed by GP's own evaluation history and investment lens |
| Missing companies | Temporal resurfacing when conditions change — same company, full prior context, right moment |
| No analyst to delegate to | AI associate absorbs the low-leverage research and documentation work that currently falls to the GP |

---

### Gain Creators (Mapped to Specific Gains)

| Gain Desired | How Reidar Creates It |
|---|---|
| Automatic inbound triage | Classification engine scores every inbound pitch against the GP's thesis; irrelevant pitches filtered before the GP's attention is spent |
| Instant company history | Any company in the system surfaces its full interaction timeline — meetings, notes, decisions, pass reasons — before any call |
| Memos that reflect how this GP thinks | Drafts pull from prior evaluations by this GP, not from a generic VC template library |
| Pipeline milestone alerts | Signal detection layer monitors pipeline companies for funding announcements, press, team changes |
| "Second brain" with real context | Continuous learning from actual workflow means the system's understanding of the GP's thesis deepens over time |
| LP-ready decision provenance | Full audit trail of why each investment was made, what prior context existed, and when the conditions changed |

---

## Fit Assessment

**Strongest fit:**
The fit between "judgment never captured" and Reidar's pass reason capture + company history is near-perfect. This is both the highest-intensity pain and the most technically concrete solution in the value map. There is no credible workaround for this pain at the solo GP level — the existing solutions (Notion docs, sticky notes, CRM text fields) all require the discipline tax that kills adoption. Reidar's passive capture architecture attacks this at the root.

The fit between "no analyst" and the pre-meeting brief is also strong. The pain is structural and universal at the 1–2 GP fund level. The gain is immediate, visible, and measurable in hours saved per week. This is likely the hook that gets a GP to try the product in the first 30 days.

**Weakest fit:**
Memo drafting is a medium-fit claim. The pain is real, but Reidar's ability to generate memos that genuinely reflect how a specific GP thinks — not just generic VC memos — depends on sufficient interaction history having been captured first. In the first 60–90 days, before enough history exists, memo quality will be marginal. This is a compounding value play, not an immediate one, and the product needs to be honest about that timeline with early users.

Temporal resurfacing is conceptually compelling but depends entirely on the GP having used Reidar at the time of the original evaluation. For the first 12 months of a customer's tenure, there may be limited history to resurface from. This feature grows in value over years, not weeks.

**Untested assumptions about fit:**
- That GPs will trust an AI-generated pre-meeting brief enough to actually use it, not just re-check everything manually
- That passive capture accuracy is high enough that the GP doesn't spend time correcting misclassified emails (if error rate is high, the "zero discipline" claim collapses)
- That pass reason capture actually happens passively, or whether some minimal GP action is still required at the moment of decision
- That the "personal, non-shared" framing is a decisive advantage versus a tool that offers shared deal flow with opt-in privacy controls

---

## One-Sentence Value Proposition

**For the GP buyer:**
"Reidar captures every reason you've ever passed, every company you've ever evaluated, and every signal worth your attention — automatically, from your existing workflow — so your judgment compounds instead of evaporates."

**For the LP reference check:**
"Reidar gives our GPs the same institutional memory and research leverage that multi-partner firms have built over decades, without requiring a full analyst hire."

**For the seed investor:**
"Reidar is the AI-native system of record for solo and emerging fund GPs — the first product that makes passive workflow capture the default, turning individual judgment into a durable, compounding asset."

---

## Proof Points Needed

**To make "passive capture with zero discipline" credible:**
Within 90 days, a design partner should be able to demonstrate a specific instance where Reidar surfaced a prior evaluation that the GP had forgotten about, with accurate notes, before a second meeting. One concrete example with a real GP is more credible than any demo environment.

**To make "pre-meeting brief saves 5+ hours per week" credible:**
Track actual time-to-prepare before and after Reidar adoption across 5 design partners. A before/after comparison showing 90-minute research sessions reduced to 10-minute brief reviews is a publishable proof point and a sales asset.

**To make "your judgment compounds" credible:**
A design partner who has used Reidar for 6+ months should be able to show one concrete example of temporal resurfacing — a company that was passed on early and resurfaced at the right moment with full context intact. This becomes the anchor case study for all marketing materials.

**To make LP reporting credible:**
Export one real LP update that includes decision provenance ("We evaluated X in Q1 2025, passed due to Y, re-engaged in Q3 2025 when Z changed, invested at Series A"). This has to be a real LP update, not a mockup, to carry weight.

**What can be built in the first 90 days:**
The Gmail and calendar integration, inbound classification, and pass reason capture are the minimum credible product for design partner validation. Pre-meeting briefs follow as soon as sufficient company history exists. Memo drafting and temporal resurfacing require 90–180 days of accumulated data before they become demonstrably useful.

---

## Strategic Connections

- The personal, non-shared intelligence model is both the core value proposition and the primary moat. It also creates a structural tension with any future network-effect play (warm intro connections across users). This tension should be designed explicitly rather than discovered late.
- The compounding nature of Reidar's value — better over 12 months than at day 30 — has direct implications for the pricing model (see Business Model document) and the churn risk window (the first 60 days, before compounding begins, are the highest churn risk).
- The "no analyst" structural pain is the reason the beachhead is 1–2 GP emerging funds, not multi-partner institutional funds. At the institutional level, the analyst exists and the pain is distributional rather than structural. The product should not try to serve both segments simultaneously in year one.
