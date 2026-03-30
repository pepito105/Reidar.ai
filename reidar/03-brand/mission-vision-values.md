# Mission, Vision & Values: Reidar
**Phase:** 5 — Brand
**Project:** reidar
**Date:** 2026-03-29

---

## Mission

**Option A** — Precise
Every judgment call you make as an investor becomes more valuable the second time — Reidar makes sure it does.

**Option B** — Provocative
Shared intelligence is a commodity. Reidar builds the kind that can't be copied.

**Option C** — Aspirational
Make the accumulated judgment of every serious investor impossible to lose and impossible to replicate.

*Option A is the most concrete and customer-facing — it names the specific pain (repeating yourself, starting from zero) and promises a specific outcome. Option B is the sharpest for a seed pitch room where the investor audience already understands the thesis on alpha compression. Option C works if you want the mission to feel movement-scale — it could live on a website header or an investor deck cover slide, but it risks feeling slightly abstract next to Options A and B.*

---

## Vision

**Option A** — Category-Defining
A world where the best investors aren't the best resourced — they're the ones whose judgment has compounded the longest.

**Option B** — Structural Shift
Every GP operates with the full institutional memory of a senior analyst they've never had to hire.

**Option C** — Market Reframe
Investment alpha stops being a function of what you know and starts being a function of what you remember.

*Option A pairs best with Mission Option C — both speak to structural change in who wins in VC, and together they make a coherent founding story. Option B pairs best with Mission Option A — both are grounded and practical, translating the vision into something a GP can picture on Monday morning. Option C is the most intellectually sharp and pairs well with Mission Option B, but it risks feeling slightly abstract for a customer conversation.*

---

## Values

### Precision Over Coverage
**What it means in practice:** Reidar only surfaces something when there is enough signal to act on — not to fill a dashboard, not to look busy, not to demonstrate that the system is running.
**What it rules out:** Reidar would say no to features that surface low-confidence alerts, noisy digests, or activity feeds that generate engagement without generating insight. More information is not the product; better judgment is.

---

### Personal Before Shared
**What it means in practice:** Every model, every inference, every resurfaced memory belongs to the individual GP — it is built from their workflow, calibrated to their thesis, and never pooled with another user's data to improve the aggregate.
**What it rules out:** Reidar would say no to any feature that trades individual accuracy for network-level intelligence. No benchmarking against peer GPs. No "investors like you also passed on." The product's value is precisely that it is not a market signal.

---

### Earn Trust Before Asking For It
**What it means in practice:** Reidar operates passively by default — learning from what GPs already do rather than requiring new workflows, new inputs, or new habits. It proves it knows how you think before it asks you to rely on what it says.
**What it rules out:** Reidar would say no to onboarding flows that require manual data entry, integrations that demand upfront configuration, or AI outputs that make confident claims before the system has enough context to back them. Trust is demonstrated, not declared.

---

### Compounding Over Features
**What it means in practice:** Every product decision is evaluated against one question: does this make Reidar more valuable the longer you use it? The product should be measurably harder to replace after 12 months than after 12 days.
**What it rules out:** Reidar would say no to features that are useful once but don't accumulate — one-time enrichment pulls, static reports, anything that delivers a fixed payload rather than building a persistent layer of learned context. Novelty is not a product strategy.

---

### Serious, Not Serious-Looking
**What it means in practice:** The product and the brand are legible to people who evaluate judgment for a living. The design is spare. The copy is exact. The AI outputs are qualified when uncertainty is real. Nothing about Reidar performs credibility — it earns it.
**What it rules out:** Reidar would say no to AI-generated outputs that are fluent but vague, to UI elements that look impressive but carry no information, and to any language that overstates what the system knows. VCs read pitch decks for a living. They notice when something is dressed up.

---

## Recommended Combination

**Mission Option A + Vision Option B**

For the dual audience of GPs and seed investors, this pairing does the most work. Mission Option A is the most customer-specific — it names the exact failure mode a founding GP has lived (evaluating a company cold the second time around, re-reading old notes that don't exist, reconstructing a take they already had). It makes the product real without requiring explanation of the category. Vision Option B then lifts it to the structural level: every GP operating with the memory of a senior analyst they never had to hire. That framing answers the seed investor's question — "what does the world look like when this works?" — without requiring the founder to oversell. Together they move from pain (A) to structural resolution (B), which is the arc of a good pitch.

---

## Notes for Phase 6 (Product)

The values above have direct product implications:

- **Precision Over Coverage** means the resurfacing engine should have a configurable confidence threshold and should default to silence over noise. A deal that comes back around should only surface if Reidar has enough prior context to say something specific — not just "you looked at this 18 months ago."

- **Personal Before Shared** means the data model must enforce user-level isolation at the architecture layer, not just at the query layer. This is also a product marketing point: Reidar should make it visible to GPs that their judgment model is private and non-exportable — not as a legal disclaimer but as a feature.

- **Earn Trust Before Asking For It** means the first-session experience cannot start with a blank slate that asks the GP to configure their thesis. The onboarding must demonstrate inference before requesting input. Show the GP what Reidar already inferred from their connected calendar and inbox before asking them to confirm or correct it.

- **Compounding Over Features** means the product roadmap should be evaluated by a single test: does this feature make the product harder to leave after 12 months? Features that fail this test belong in a later phase or not at all.

- **Serious, Not Serious-Looking** means AI-generated summaries and resurfacing alerts must include a confidence signal or qualifying clause when the inference is based on limited prior context. "Based on your notes from your first call in April 2024, you flagged customer concentration as the main concern" is better than a confident-sounding synthesis that smooths over what was actually a thin signal.
