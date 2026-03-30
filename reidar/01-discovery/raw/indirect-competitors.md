# Indirect Competitors & Substitutes for Reidar

Research conducted: 2026-03-29
Searches performed: 11 (4 rounds per protocol)

---

## Status Quo Solutions (what VCs do today without dedicated tools)

### 1. Excel / Google Sheets

**What it is:** Simple spreadsheets for tracking company name, stage, contact, status, and notes. Often one tab per fund or per stage gate.

**How common:** Extremely common. A survey cited by Affinity found a large portion of VC professionals still use spreadsheets and email-based workflows as their system of record. Qualitative estimate: ~40-50% of micro/emerging funds use spreadsheets as their primary deal log.

**Why VCs stick with it:**
- Zero cost
- No learning curve
- Full flexibility — add any column you want
- Shareable via Google Drive
- Works offline

**Where it breaks down (Reidar's opportunity):**
- No relationship context or communication history attached to rows
- Cannot capture the reasoning behind a pass — "why we said no" lives in someone's head
- Zero passive capture — everything must be manually entered
- No cross-deal pattern learning ("we keep passing on B2B SaaS with <$1M ARR at Seed — why?")
- Doesn't survive a partner departure; institutional memory walks out the door
- No signal monitoring or alerting on pipeline companies
- Memo writing is completely external and disconnected from the pipeline

---

### 2. Notion / Notion Templates

**What it is:** Flexible wiki/database hybrid used for deal notes, thesis documentation, investment memos, IC prep, and portfolio tracking. Widely adopted across early-stage funds via templates like NotionVC, FundMate, VC Decision Hub, and VentureScope.

**How common:** High and growing. NotionVC (dedicated Notion-for-VC marketplace) has a substantial catalog. Notion's own marketplace lists 9+ free VC template collections. Estimated 30-40% of emerging funds ($25M-$150M) use Notion as a core operational layer.

**Why VCs stick with it:**
- Extremely flexible — can mirror any workflow
- Free or low cost (~$16/mo Business plan)
- Strong template ecosystem (notionvc.com, VCStack, etc.)
- Notion AI (May 2025) now includes meeting notes capture, autonomous agents, and cross-tool search (Slack, Google Drive, GitHub)
- Investment Committee prep templates purpose-built for VC

**Where it breaks down:**
- Requires manual data entry discipline — garbage in, garbage out
- No automatic relationship capture from email/calendar
- No deal sourcing or outbound discovery
- Notion AI is generic — it doesn't know your specific investment thesis or what deals you've passed on and why
- No signal monitoring on portfolio companies
- Memo templates are blank canvases, not personalized to your judgment
- No network intelligence or warm intro mapping

---

### 3. Airtable

**What it is:** Relational spreadsheet-database hybrid. Popular for deal flow CRM, portfolio tracking, and automations. Airtable's official Investor Deal Flow template includes contacts, valuations, notes, and Crunchbase/LinkedIn integrations.

**How common:** High adoption. Five purpose-built VC templates on Airtable's official marketplace. Multiple VCs have published their custom builds publicly (Confluence VC documented several). One solo GP built automated intro/tearsheet/sourcing workflows entirely in Airtable.

**Why VCs stick with it:**
- More powerful than spreadsheets without full CRM complexity
- Free tier available; $20/seat for Pro
- Automation layer (Zapier, Make integrations) allows bespoke workflows
- Crunchbase and LinkedIn integrations available
- Can do multiple views (Kanban, Gallery, Calendar) on same data

**Where it breaks down:**
- Still fundamentally a database that requires manual logging
- Automations require significant setup time and technical skill
- No passive capture of email/meeting intelligence
- No AI memo drafting tied to deal data
- No investment thesis filtering or personalized scoring
- Community workarounds (scraping templates from others) are time-intensive and not maintained

---

### 4. Email + Linear/Slack Threading

**What it is:** Many small VC funds (especially 1-2 GP shops) run entirely on email threads and shared Slack channels. A company gets a Gmail label; team discussion happens in a Slack thread; the decision is a reply-all.

**How common:** Very common for sub-$50M funds. Estimated 20-30% of micro-funds never advance beyond this.

**Why VCs stick with it:**
- Zero marginal cost
- No workflow change required
- Works within existing communication habits

**Where it breaks down:**
- Completely unsearchable and unstructured
- Pattern recognition across deals is impossible
- No audit trail for IC decisions
- Completely siloed per deal — no comparative analytics
- Partner onboarding takes months because there's no documented reasoning

---

## Adjacent Products

### 1. Affinity CRM

**Primary purpose:** Relationship intelligence CRM purpose-built for private capital. Automatically captures communication data from email/calendar; scores relationship strength; surfaces warm intro paths.

**How it partially solves the VC intelligence problem:**
- Automated data capture eliminates manual CRM logging (the #1 VC complaint)
- Relationship strength scoring (1-10) helps prioritize warm inbound
- Network mapping shows who knows whom across the firm's collective graph
- Deal Assist (Oct 2024): conversational AI for querying deals, decks, transcripts
- Affinity Notetaker: auto-joins Zoom/Meet/Teams, generates summaries synced to CRM
- Industry Insights: competitive landscape snapshots on target companies
- 18% penetration in VC market per 6sense data

**What it's missing (Reidar's wedge):**
- Does not capture *investment judgment* — the reasoning behind a pass, a thesis nuance, a pattern only one GP notices
- Relationship intelligence ≠ investment intelligence; Affinity knows you talked to someone, not what you thought of them
- No deal sourcing or autonomous outbound discovery
- No personalized thesis-filtered scoring of inbound companies
- No investment memo drafting tied to a GP's specific view
- Shared network data is a commodity; it's the same graph for everyone using Affinity

**Risk level: HIGH** — Affinity is the most direct platform risk. It has the data infrastructure, the VC relationships, and the product velocity to move toward judgment capture.

**Timeline:** Affinity's "Next-Gen Relationship Intelligence" roadmap (2025-2026) is mapping implicit/explicit connection graphs and adding agentic capabilities. However, their product strategy is explicitly network-centric, not judgment-centric. Moving from "who do you know" to "how do you think" requires a fundamental product re-architecture. Estimate: 2-3 years before they could plausibly compete on Reidar's core, assuming they prioritize it.

---

### 2. Granola

**Primary purpose:** AI meeting notepad. Runs locally on device (no bot), captures system audio, enhances human-written notes with AI context. Raised $125M Series C at $1.5B valuation (March 2026). Pivoting to "enterprise AI context" layer.

**How it partially solves the VC intelligence problem:**
- VCs are Granola's highest-profile early adopter cohort (all Series A term sheet recipients were Granola users)
- Captures the verbatim conversation from every founder meeting
- No awkward bot-join — preserves the intimacy of deal meetings
- Searchable archive of every founder conversation

**What it's missing:**
- Notes exist in isolation — no connection to deal pipeline, thesis, or prior decisions
- Does not learn investment preferences or patterns across meetings
- Cannot source companies or score inbound
- No memo drafting tied to meeting content
- Granola's pivot is toward *enterprise* workflows (sales, product, legal), not VC-specific

**Risk level: MEDIUM** — Granola's $1.5B valuation and enterprise pivot suggest they are building a horizontal context layer, not a vertical VC tool. However, if they ship deep CRM integrations (Affinity, Salesforce) with VC-specific meeting templates, they capture the note-taking layer. Reidar should view Granola as infrastructure to potentially integrate with, not compete against directly.

**Timeline:** 18-24 months before enterprise features could meaningfully address VC-specific workflows at depth.

---

### 3. Harmonic

**Primary purpose:** AI startup discovery and intelligence database. Indexes 30M+ companies, tracks founder movements, hiring signals, funding signals, and stealth-stage companies before they appear on mainstream databases. Reached $1.45B valuation in 2025.

**How it partially solves the VC intelligence problem:**
- Surfaces pre-seed and stealth companies before they hit Crunchbase/PitchBook
- Signals-based discovery (hiring velocity, founder background, product launches)
- Used by most top-tier VC firms for proactive sourcing

**What it's missing:**
- Shared intelligence — every VC on Harmonic is seeing the same signals
- Cannot filter through a *specific GP's* thesis or judgment
- Does not capture what a GP already knows, has seen, or has decided
- No pipeline management, memo drafting, or relationship capture
- Sells the same data to competing funds (alpha commoditization thesis confirmed)

**Risk level: LOW** — Harmonic is infrastructure. They are not building toward personal investment intelligence. They sell data, not judgment. Reidar can position itself as the judgment layer on top of Harmonic's signal layer.

---

### 4. Decile Hub

**Primary purpose:** All-in-one VC operating system. Trained AI on 30,000+ VC questions. In 2025, launched AI Deal Memos (auto-aggregates company info, drafts structured analysis) and AI Fundraising (LP identification via network analysis). Positioned as "AI VC Copilot."

**How it partially solves the VC intelligence problem:**
- AI Deal Memos reduce memo drafting time significantly
- Structured deal analysis with consistency across the firm
- LP profiling and fundraising intelligence built in
- Agentic capabilities to run firm operations

**What it's missing:**
- Memos are data-aggregation-driven, not judgment-capture-driven
- Does not passively learn from the GP's decisions and refine over time
- Primarily serves emerging/micro fund formation (Decile's fund-launch product is the core)
- Judgment layer is templated, not personalized to how a specific GP thinks

**Risk level: MEDIUM** — Decile is moving fastest in the "AI runs your VC firm" direction and has explicitly positioned as a VC copilot. They are a more direct product competitor than Affinity in terms of stated mission. However, their core business is fund formation/operations (launching funds in 24 hours), not deep investment intelligence.

**Timeline:** Active competitor now in memo drafting and deal sourcing. But the passive judgment-capture and personal-lens filtering is not currently in their product.

---

### 5. Notion AI

**Primary purpose:** AI-augmented workspace. As of May 2025, includes meeting notes (no bot), autonomous multi-step agents, enterprise cross-tool search (Slack, Google Drive, GitHub, Gmail, SharePoint).

**How it partially solves the VC intelligence problem:**
- VCs already use Notion for deal tracking and thesis documentation
- Meeting notes now auto-captured from Zoom/Meet/Teams
- AI can query across all historical deal notes and memos
- Agent layer (Notion 3.0) can perform multi-step research tasks
- Database AI properties enable smart autofill

**What it's missing:**
- No domain specificity for VC — it's a horizontal tool
- Does not understand investment thesis, scoring frameworks, or deal stage logic
- No relationship intelligence or network mapping
- No passive email/calendar capture
- Cannot source companies or surface unseen deals
- Agent capabilities are generic, not trained on investment reasoning

**Risk level: MEDIUM** — Notion is building fast (AI meeting notes, agents, enterprise search are all 2025 releases). For technically sophisticated VCs who deeply customize Notion, a "Reidar" workflow may be DIY-able within Notion + AI in 2-3 years. However, this requires significant setup and won't have the personalized judgment layer.

**Timeline:** Notion becomes a meaningful substitute in 2-3 years for DIY-oriented GPs, not mainstream adoption.

---

### 6. Zapflow

**Primary purpose:** Purpose-built VC deal flow management platform. Centralized deal sourcing, pipeline tracking, and collaboration for VC and PE firms.

**How it partially solves the VC intelligence problem:**
- Built specifically for the non-linear VC deal lifecycle
- Centralizes deal-related communication
- Supports sourcing, screening, and follow-up workflows

**What it's missing:**
- No AI memo drafting or personalized scoring
- No passive capture from email/meetings
- No investment thesis intelligence layer
- Positioned as a workflow tool, not an intelligence tool

**Risk level: LOW** — Zapflow is a workflow CRM, not an AI intelligence platform. They are unlikely to build the judgment-capture layer.

---

### 7. Salesforce / HubSpot / Microsoft Dynamics (via Navatar)

**Primary purpose:** Enterprise CRM platforms. Navatar is the Salesforce vertical layer purpose-built for PE/VC. Microsoft Dynamics + Copilot is the Microsoft equivalent.

**How it partially solves the VC intelligence problem:**
- Navatar combines Salesforce Agentforce AI and Microsoft Copilot for deal intelligence delivered natively inside Outlook and Slack
- Enterprise-grade data security and compliance
- Existing relationship data for firms already on Salesforce

**What it's missing:**
- Extremely high implementation cost and complexity — not viable for emerging funds
- Not built for VC-specific workflows; adapted from enterprise sales
- No passive learning of investment judgment
- Overkill for 1-5 GP shops

**Risk level: LOW for emerging funds** — Enterprise CRM complexity is a feature anti-pattern for Reidar's target customer (sub-$150M AUM). The implementation overhead alone filters these platforms out. Firms graduating to $500M+ AUM may eventually adopt Salesforce/Navatar, creating a natural ceiling for Reidar's expansion upmarket.

---

## Platform Risk Assessment

### Priority Threats (Ranked)

**1. Affinity — HIGH RISK, 2-3 year horizon**

Affinity has 18% VC market penetration, deep integrations with how VCs work (email, calendar, meetings), and an active AI roadmap. Their "Next-Gen Relationship Intelligence" is explicitly about capturing implicit connections and automating relationship insights. They have the data moat (years of communication graphs per firm), the customer relationships, and the distribution. The realistic scenario: Affinity ships "Investment Thesis AI" — a feature that asks each GP to input their thesis, then uses their past deal decisions and notes to score inbound and auto-generate memo drafts. This is ~18-24 months from becoming a real Affinity product. To make Reidar irrelevant, Affinity would need to: (a) add passive judgment capture from deal decisions/passes, (b) ship GP-personalized scoring, (c) integrate autonomous sourcing. That's a 3-feature build. Mitigation: establish deep customer intimacy and switching costs before Affinity gets there; build the judgment model that Affinity can't replicate without starting from scratch per GP.

**2. Granola — MEDIUM RISK, 18-24 month horizon**

Granola owns the most intimate moment in VC — the founder meeting. At $1.5B valuation and "enterprise AI context" positioning, they are building toward making meeting content actionable across systems. If Granola ships a VC-specific vertical (deal CRM sync, thesis tagging of meetings, memo generation from transcripts), they capture a critical wedge. Mitigation: Reidar should consider building a Granola integration rather than competing on note-taking. Alternatively, Reidar's passive capture from email + calendar (not just meetings) creates complementary coverage.

**3. Decile Hub — MEDIUM RISK, active competitor**

Decile is already shipping AI deal memos and agentic firm operations. They are not yet doing passive judgment capture or personalized scoring, but their stated direction ("AI to run firm operations as a cofounder") is closest to Reidar's vision. Risk is higher than it appears because Decile has VC Lab distribution (large network of emerging fund managers). Mitigation: Reidar needs to be demonstrably better on the *personal lens* dimension — Decile's memos are template-driven, not GP-specific.

**4. Notion AI — MEDIUM RISK, 2-3 year DIY horizon**

Notion's autonomous agents + meeting notes + enterprise search create a credible DIY substitute for technically inclined GPs. Mitigation: Reidar wins on out-of-the-box VC specificity; no setup required, judgment learned automatically without manual configuration.

**5. Microsoft Copilot / Salesforce Agentforce — LOW RISK for target segment**

Enterprise complexity is a moat against Reidar's target customer. Emerging funds cannot practically deploy these platforms.

---

## Open Source & Free Alternatives

### What Exists

- **EspoCRM** (open source, self-hosted): PHP-based CRM with VC-adapted templates. Free to self-host. Requires technical setup and maintenance. No AI layer, no deal sourcing, no memo drafting.

- **Twenty CRM** (open source, developer-first): Modern open-source CRM with GPL license, auto-generated APIs, self-hosting. No VC specificity. Would require significant custom development.

- **Krayin** (open source, Laravel/MIT): Modular CRM. No VC-specific functionality out of the box.

- **Spreadsheet.com**: Free for teams up to 5 people (1,500 rows). Upgraded spreadsheet with relational features. No AI.

- **DIY Notion + AI**: VCs building their own Notion workspaces augmented with Notion AI, Claude/ChatGPT for memo drafting, and Zapier automations. Effectively free if on Notion Business plan.

- **Flybridge open-source memo generator**: Flybridge VC open-sourced their AI investment memo generator. Available for any firm to adapt.

### Why Someone Would Pay for Reidar Instead

1. **Setup time**: DIY solutions (Notion, Airtable, EspoCRM) require weeks of setup and ongoing maintenance. Reidar is out-of-the-box.
2. **Passive capture**: Free tools require manual data entry. Reidar learns from workflow without extra effort.
3. **Judgment specificity**: Generic AI (ChatGPT, Claude, Notion AI) produces generic memos. Reidar's memos reflect *this GP's* specific lens, developed over time from their actual decisions.
4. **No IT overhead**: Self-hosted open source requires devops. 1-5 GP emerging funds have no engineering staff.
5. **Signal monitoring**: No free tool actively monitors pipeline companies for signals and alerts the GP.
6. **Network memory**: Free tools don't remember that you met this founder at a conference two years ago and passed on version 1 of their company.

---

## Switching Cost Analysis

### What Keeps VCs on Current Solutions

- **Affinity**: 2-3 years of relationship graph data that cannot be meaningfully exported and reconstructed elsewhere. Communication history is locked in. High switching cost.
- **Notion/Airtable**: Lower lock-in technically, but workflow muscle memory is strong. Templates represent weeks of setup. The bigger barrier is behavior change, not data migration.
- **Spreadsheets/Email**: Paradoxically low switching cost (data is portable) but highest inertia because the "why bother" threshold is high. GPs at this stage have survived without a tool; the pain must become acute before they change.

### What Triggers a Switch to Something New

Per Blue Future Partners survey: the #1 trigger is **desire to improve ability to find and close deals** (59%). Secondary triggers:
- Partner departure exposes the lack of institutional memory
- Fund II raise requires LP reporting/diligence on process rigor
- Missing a deal that was in the pipeline and dropped
- New hire joins who champions better tooling
- Seeing a competitor fund make a deal they sourced first

### How Hard Is It to Migrate to Reidar

- **Data migration**: Moderate. Pipeline data in Airtable/Notion/spreadsheet can be imported via CSV. Historical email/calendar is typically accessible via OAuth.
- **Workflow change**: Low to moderate. Reidar's value proposition is *passive* capture — VCs don't need to change how they work.
- **Behavior change**: Low. If Reidar runs in the background and surfaces intelligence proactively, the GP is not asked to do anything differently.
- **The hard part**: Getting a GP to trust AI-generated investment intelligence enough to act on it. This is a credibility and calibration problem, not a UX problem.

### Average Buying Cycle for VC Tooling

- **Affinity reports**: Firms evaluate new tools primarily to improve deal finding/closing (59%). Evaluation is usually GP-level, not committee-driven.
- **Cycle length**: Estimated 2-6 weeks for emerging funds. Shorter than enterprise (no procurement process). Trial-driven — VCs want to use the product on real deals before committing.
- **Decision maker**: The managing GP or COO/CFO of the fund. Solo GPs decide in days.
- **Price sensitivity**: Emerging funds are cost-conscious but will pay for tools that demonstrably improve deal flow. Affinity at $3,000-$5,000+/year is common. Reidar at similar or slightly higher price point is realistic.

---

## Data Gaps

- **Affinity pricing**: Exact current pricing not available publicly (enterprise quote-based). Estimates only.
- **Affinity market share quantification**: 18% VC penetration per 6sense; not independently verified.
- **Decile Hub pricing**: Not found in search results.
- **Granola VC-specific feature adoption**: Anecdotal evidence that VCs love it; no usage statistics specific to VC.
- **Zapflow, Edda, Visible market share data**: Customer counts and revenue not publicly available.
- **Specific emerging fund (<$150M AUM) tool preference data**: Most surveys mix all VC fund sizes; emerging fund-specific breakdown not found.
- **Switching cost quantification**: No published data on VC CRM churn rates or time-to-switch.
- **HumCapital, Hive.vc, Base**: Insufficient results to assess current product status or funding.
- **Obsidian for investors**: No significant results found; appears to be a niche personal use case, not widespread in VC.

---

## Sources

- [Affinity VC Tech Stack Guide 2025](https://www.affinity.co/guides/the-vc-tech-stack-tools-to-streamline-automate-venture-deals)
- [Affinity AI Product Page](https://www.affinity.co/product/artificial-intelligence)
- [Affinity 2025 Investment Benchmark Report](https://www.affinity.co/report/the-2025-investment-benchmark-report)
- [Affinity: 10 AI Tools for Venture Capital Firms 2026](https://www.affinity.co/guides/vc-ai-tools)
- [Confluence VC: 5 Ways VCs Manage Deal Flow with Airtable](https://confluence.vc/deal-flow-pipeline-with-airtable/)
- [Airtable VC Templates](https://www.airtable.com/templates/venture-capital)
- [NotionVC Templates](https://www.notionvc.com/)
- [Notion Marketplace: Venture Capital Templates](https://www.notion.com/templates/category/venture-capital)
- [Notion May 2025 Release: AI Meeting Notes, Enterprise Search](https://www.notion.com/releases/2025-05-13)
- [TechCrunch: Granola raises $20M — VCs love it](https://techcrunch.com/2024/10/23/vcs-love-using-the-ai-meeting-notepad-granola-so-they-gave-it-20m/)
- [TechCrunch: Granola raises $125M at $1.5B valuation](https://techcrunch.com/2026/03/25/granola-raises-125m-hits-1-5b-valuation-as-it-expands-from-meeting-notetaker-to-enterprise-ai-app/)
- [Harmonic: AI Startup Database](https://harmonic.ai/)
- [Decile Hub: AI VC Copilot](https://www.decilehub.com/)
- [Decile Group: AI for VC Copilot](https://decilegroup.com/ai)
- [Flybridge: AI-Powered Investment Memo Generator](https://www.flybridge.com/ideas/the-bow/behind-the-curtain-unveiling-our-ai-powered-investment-memo-generator)
- [Visible.vc: Investment Memo Guide](https://visible.vc/blog/investment-memo/)
- [Visible.vc: Deal Flow Software Guide](https://visible.vc/blog/venture-capital-deal-flow-software/)
- [EspoCRM for Venture Capital](https://www.espocrm.com/solutions/crm-for-venture-capital/)
- [Navatar: AI CRM for Salesforce (PE/VC)](https://www.globenewswire.com/news-release/2025/09/16/3150493/0/en/As-Private-Equity-Secondaries-Market-Surges-Firms-Turn-to-Navatar-s-AI-Powered-CRM-For-Salesforce-to-Master-Global-Deal-Flow.html)
- [Zapflow: Deal Flow Management](https://www.zapflow.com/)
- [VC Lab: AI for Venture Capital](https://govclab.com/2025/04/12/ai-for-vc/)
- [Affinity: Unlocking the Power of AI in Venture Capital](https://www.affinity.co/blog/ai-in-venture-capital)
