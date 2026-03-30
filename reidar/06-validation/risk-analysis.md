# Risk Analysis

**Phase:** 8 — Validation
**Project:** reidar
**Date:** 2026-03-29
**Confidence:** High (risks are grounded in research findings and directly tied to identified assumptions)

---

## Risk Matrix

Likelihood and impact rated 1–5. Priority = Likelihood × Impact.

| # | Risk | Likelihood (1–5) | Impact (1–5) | Priority | Category |
|---|---|---|---|---|---|
| R1 | GPs refuse to grant Gmail/calendar access to an unknown founder | 4 | 5 | **20** | Trust / GTM |
| R2 | Core product promise (passive capture → valuable signal) doesn't deliver in practice | 3 | 5 | **15** | Product |
| R3 | Sales cycle too long — GPs slow to commit, round closes slowly | 4 | 3 | **12** | GTM |
| R4 | Affinity or Notion announces an AI-native judgment-capture feature | 2 | 5 | **10** | Competitive |
| R5 | Co-founder doesn't formally quit current job before runway starts | 3 | 3 | **9** | Team |
| R6 | SAM is narrower than modeled — fewer than 500 emerging GPs are reachable beachhead customers | 3 | 3 | **9** | Market |
| R7 | Raise takes 3–4 months instead of 3 weeks | 4 | 2 | **8** | Financial |
| R8 | Design partner churn at Month 4 — free-to-paid conversion fails | 3 | 3 | **9** | Revenue |
| R9 | EU AI Act or CCPA creates data handling compliance cost before revenue | 2 | 3 | **6** | Regulatory |
| R10 | Founder lacks VC credibility to close enterprise or upmarket accounts | 3 | 2 | **6** | Founder |

---

## High-Priority Risk Analysis

### R1 — GPs Won't Connect Their Email [Priority: 20]

**Why it's the highest-ranked risk:**
The entire product premise depends on passive capture — watching how a GP already works, not asking them to log anything manually. Passive capture requires OAuth access to Gmail and Google Calendar. VCs are notoriously protective of deal flow data, LP relationships, and investment thesis. An unknown founder asking to ingest their work email is asking for something competitors have spent years building trust to receive.

**Evidence from research:**
> "VCs are highly sensitive about their deal flow data, LP relationships, and investment thesis being seen by competitors." — geographic.md

**What makes it worse:**
- Founder has no VC track record (no prior GP relationship to borrow trust from)
- No SOC 2 certification in Year 1
- The first cohort of GPs will be asked to make this decision based entirely on the founder's credibility

**Mitigation strategy:**
1. **Lead with privacy architecture, not features.** Before asking for OAuth, show GPs a single-page data handling document: what's stored, what's not, where, and who can access it. Make it readable by a non-lawyer.
2. **Start with calendar only.** Google Calendar reveals meeting times and attendees — not email content. This is a much lower-stakes first step. Prove value with calendar alone, then introduce Gmail as an upgrade.
3. **Get one named GP to vouch publicly.** Even one quote from a trusted name in the NYC emerging manager community ("I gave Reidar access to my calendar and here's what happened") changes the conversion dynamic for subsequent GPs.
4. **Use warm intros exclusively for the first 10 customers.** Cold outreach asking for email access has near-zero chance of success. Every first conversation should be preceded by a "you should talk to Remi" from a mutual connection.

**Early warning signal:** If fewer than 2 of 5 Experiment 4 participants complete OAuth, activate the "calendar-only first" fallback immediately. Don't wait for the full design partner cohort to confirm the problem.

---

### R2 — Passive Capture Doesn't Deliver Valuable Signal [Priority: 15]

**Why it matters:**
The product's defensibility rests entirely on the claim that accumulated context creates a compounding intelligence advantage. If the signals surfaced by Reidar are noisy, obvious, or arrive too late to be useful, the product delivers no competitive advantage — it's just a prettier CRM.

**Evidence from research:**
> "The 'gut feel' problem is the core product risk. Reidar captures *artifacts* of gut feel — not gut feel itself. Whether that's valuable enough is unproven." — intake/brief.md (Red Flag)

**What makes it worse:**
- The value compounds slowly — GPs won't see the full moat for 6+ months
- The Day 1 value (pre-meeting briefs) is already available from generic tools (Perplexity, manual Google)
- If the resurfacing alerts feel like obvious noise ("they just hired" is barely a signal), GPs will disengage before the moat forms

**Mitigation strategy:**
1. **Make resurfacing alerts very precise, not comprehensive.** Better to surface 2 high-quality alerts per month than 20 generic ones. Tune the signal detection to the GP's stated pass reasons, not generic company signals.
2. **Design the 6-month value revelation.** Build a "your Year 1 intelligence report" — a quarterly summary of what Reidar has learned about how this GP evaluates companies. Make the compounding visible, don't assume they'll notice it.
3. **Test signal quality in the concierge MVP** before automating. If the manually-curated briefs aren't useful, the automated version won't be either.

**Early warning signal:** If Concierge MVP (Experiment 3) pass reason capture rate is < 20%, or if GPs rate fewer than 40% of briefs as useful, the signal quality hypothesis is in trouble.

---

### R3 — Long Sales Cycles [Priority: 12]

**Why it matters:**
Small VC funds have minimal ops infrastructure. GPs are the decision-makers and they're time-constrained. Software buying decisions get deprioritized constantly. A product that requires 3 touchpoints, a security review, and a GP team discussion before a $500/month commitment becomes a 3-month sales cycle at a company that can only afford 6-week cycles.

**Mitigation strategy:**
1. **Price to stay below the "needs approval" threshold.** $500/month is calibrated to be a GP's individual credit card decision. Validate this assumption in customer discovery (Experiment 1, Q11–12).
2. **Monthly billing only (no annual contract in Year 1).** An annual commitment at any price requires more deliberation. Monthly eliminates the "what if we don't use it" objection.
3. **Lead with the free tier or trial conversation.** "30 days free, no credit card" removes the buying decision entirely for the first month. Convert after they've built history.

---

### R4 — Incumbent Competitive Response [Priority: 10]

**Why it matters:**
Affinity ($200M+ raised, deeply embedded in enterprise VC), Notion (200M+ users), or a well-funded new entrant could announce an "AI investment memory" feature. If the feature ships before Reidar has established its brand and customer base, the product is commoditized before it has traction.

**Evidence from research:**
Rowspace raised $50M from Sequoia for the exact institutional tier above Reidar's target. Meridian AI is moving from enterprise into the emerging manager space. The competitive window is real but not guaranteed.

**Mitigation strategy:**
1. **The moat is history, not features.** Affinity can announce the feature but can't replicate 6 months of accumulated decision history per GP. Focus messaging on this: "the longer you use Reidar, the harder it is to switch — because Reidar's value lives in your history, not in the feature set."
2. **Win the community before the incumbents notice the market.** If 10 NYC GPs are publicly endorsing Reidar, the trust and switching cost are established before a competitor can enter.
3. **Speed is the actual moat right now.** Get to 5 paying customers before any competitor ships anything into the sub-$1,000/month emerging manager tier.

---

### R5 — Co-Founder Commitment [Priority: 9]

**Why it matters:**
The co-founder is verbally committed but hasn't yet quit their current job. If the current employer makes a retention offer, the fundraise timeline shifts, or a personal circumstance delays the transition, Reidar launches without its technical lead. The investor story also weakens substantially — "one full-time founder and one advisor-level co-founder" is a much harder pre-seed raise.

**Mitigation strategy:**
1. **Formalize the commitment before the raise.** IP assignment agreement, co-founder agreement, and SAFE terms should be signed before investor conversations start. This makes the commitment real and creates mutual accountability.
2. **Set a departure date.** The co-founder should know the specific date they intend to resign from their current job — not "when we raise." Anchor it to an event (raise closes / X date).
3. **Frame honestly to investors.** "My co-founder is transitioning from their current role and will be full-time by [date]" is a straightforward answer. Trying to hide it creates trust problems if discovered.

**Early warning signal:** If the co-founder hasn't signed the co-founder agreement before the first investor meeting, the risk is unmitigated.

---

## Lower-Priority Risk Notes

**R6 (SAM too narrow):** The beachhead SAM of $37–62M is confirmed narrow. It's a calculated bet — win the beachhead first and use that proof to expand to the broader $930M+ TAM. This is a positioning risk, not an existential one, as long as Reidar doesn't mistake the beachhead for the full market.

**R7 (Raise takes longer than 3 weeks):** Almost certain. Pre-seed rounds on SAFEs at small check sizes ($25K–$100K) close in weeks; single checks from micro-VCs close in 4–8 weeks. Plan the 30-day action plan around "raise closes in 6–8 weeks" not 3.

**R9 (Regulatory):** CCPA ADMT rules (automated decision-making transparency) apply to Reidar if it's used to make investment decisions about people (founders). The risk is real but manageable: implement a data deletion endpoint, publish a clear privacy policy, and consult a startup lawyer before launch. SOC 2 is deferred.

**R10 (Founder credibility gap):** Real but partially mitigable through content, design partners, and the personal origin story (started Reidar while trying to break into VC — the authenticity of the pain point). The credibility gap matters most for enterprise accounts and marquee investors. For early-stage emerging GPs who are themselves trying to punch above their weight, a founder who built the product because they felt the pain is often a trust-builder, not a liability.

---

*Cross-references: assumptions-tracker.md (risks map to assumptions A1–C6), kill-criteria.md (risk triggers that should stop the company)*
