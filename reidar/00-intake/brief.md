# Intake Brief

**Phase:** 1 — Intake
**Project:** reidar
**Date:** 2026-03-29
**Confidence:** High (direct founder conversation)

---

## The Idea

**Product name:** Reidar

**One-line positioning:** The AI investment associate that makes sure nothing you've ever learned gets lost.

**Core thesis:** It's not that deals are hard to find. The problem is that judgment — the accumulated pattern recognition that makes a great investor — never gets captured. It lives in a GP's head, in half-finished Notion docs, in Slack threads that scroll away. When a company comes back around 18 months later, slightly different, slightly better timed, the institutional memory of why you passed, what you liked, who you spoke to is gone. You're evaluating it cold again. Reidar fixes this not by adding another tool to the stack, but by watching how you already work.

**The moat:** The intelligence isn't shared — it's yours. The more you use Reidar, the less replicable your edge becomes, because it's built from your decisions, your instincts, your history. That's not a feature. That's the product.

*(Positioning refined by founder, 2026-03-29, post-Phase 3 research gate)*

---

## The Problem

Judgment never gets captured. Every GP has accumulated pattern recognition — what excites them, what makes them pass, which founders left an impression, which companies they dismissed too early. But none of it lives anywhere searchable. When a company comes back around 18 months later, slightly different, slightly better timed, the GP evaluates it cold. No context. No memory. No institutional knowledge.

**The specific pain:**
- Pass on a company → forget you saw it → evaluate it cold when it returns 18 months later
- "Why we passed" lives only in someone's head — not in the CRM, not in the notes
- CRMs track who you know; nothing tracks how you think
- Signal platforms (Harmonic, Crunchbase) give everyone the same alerts — shared intelligence = diminishing alpha
- Every new tool = more information to manually log, not less workflow

---

## The Solution

Reidar connects to how you already work — Gmail, calendar, meeting notes app — and starts learning immediately. No manual logging.

**Immediate value (Day 1–30):**
- Every inbound pitch classified against your mandate before you open it
- Pre-meeting brief delivered before every call
- Every meeting note ingested, structured, and attached to the company record
- Every pass reason captured

**Compounding value (Month 3–6+):**
- Reidar resurfaces companies you've already seen when conditions change: "You passed because they had no GTM motion. They just hired four enterprise AEs."
- Connects new inbound to portfolio founders who know the CEO
- Flags before a call that a competitor just raised, and who backed them
- After 6 months: Reidar knows what excites you, what makes you pass, which founders left an impression, which companies you dismissed too early — no database can replicate this

**Three layers of context (what gets built):**
1. **Global knowledge base** — company data (thin layer, assembled from existing sources, not the moat)
2. **Firm context** — mandate, portfolio, IC patterns, decision history, pass reasons
3. **Investor profile** — personal pattern recognition, domain expertise, evaluation biases per GP

The moat is the accumulated context of how a specific investor at a specific firm thinks. This data only exists because someone uses Reidar daily. It can't be scraped. It can't be bought. It compounds.

---

## The Founder

**Name:** Remi Balassanian

**Background:**
- Economics, Duke University
- Founded and scaled **Strings** — a consumer tech platform: 0 to tens of thousands of users, $600K+ GMV, 30,000+ transactions
- Started Reidar while trying to break into VC after Strings — personal pain point: found the tooling broken and the data undifferentiated

**Relevant strengths:**
- Proven 0→1 operator: built and scaled a transactional platform from scratch
- Knows how to recruit and rally people around an idea
- Product and go-to-market instincts demonstrated through Strings

**Gaps to address:**
- No prior VC experience (trying to break into the industry, not a former investor) [Yellow Flag]
- Consumer tech background ≠ B2B SaaS / VC tooling sales motion

**Co-founder:**
- Duke friend, CS + math double major
- Currently employed at a startup
- Verbally committed to quit and join [Assumption — not yet formalized]
- Technical lead

---

## The Market

**Beachhead:** Emerging VC funds — small teams, 1-5 GPs, pre-seed to seed stage, typically managing $10M–$150M funds

**Broader market:** Any VC or investment firm, up to large established funds

**First beta customer:** Friend at Insight Partners (large, established fund) — useful for product feedback but misaligned with the emerging GP beachhead [Yellow Flag — see notes]

**Geography:** US-first assumed

---

## Current State

**Product:** Working prototype (React + FastAPI + Anthropic API)
- Deal sourcing (nightly AI-powered web search)
- Company scoring against mandate
- Pipeline management (Kanban)
- Investment memos
- AI associate chat
- Notification system
- Signal detection

**Customers:** None paying. One warm beta contact (Insight Partners).

**Revenue:** $0

---

## Business Model

**Not yet defined.** [Assumption: SaaS subscription, per-seat or per-firm]

**Pricing:** No current pricing.

**Founder goal:** Raise funding. This is explicitly the primary objective — not near-term revenue.

---

## Hard Questions — Founder's Own Answers

**Strongest argument against Reidar:**
1. A large incumbent (Crunchbase, Affinity, PitchBook) could build this feature set
2. Capturing "gut feel" is extremely hard — how do you actually capture what a VC analyst is thinking day-to-day in a way that provides real value?

**My read on these objections:**
- The incumbent threat is real but the moat answer is defensible: accumulated firm-specific context is a switching cost that grows with usage. Incumbents would need to rebuild the data layer from scratch per firm.
- The "gut feel" problem is the core product risk. Reidar captures *artifacts* of gut feel (notes, pass reasons, decisions, patterns) — not gut feel itself. Whether that's valuable enough is unproven. [Red Flag — see below]

---

## Flags

**Red Flags:**
- The core product promise (capturing investor judgment) is unproven. No customer validation yet that the passive capture approach actually surfaces valuable signal vs. noise.
- No paying customers, no evidence of willingness to pay.

**Yellow Flags:**
- Founder has no VC experience — selling into VC requires credibility. The Strings story helps but the domain gap is real.
- Co-founder commitment is verbal, not formalized.
- Beta customer (Insight Partners) doesn't match beachhead (emerging GPs) — risk of building for the wrong customer.
- Business model completely undefined.

## Sources
- Direct founder interview, 2026-03-29
