# Regulatory Landscape: VC Intelligence Software in the United States

**Research date:** March 2026
**Rounds completed:** 4 (9 searches total)
**Subject:** Reidar — AI investment associate for VC firms that passively captures investor judgment from email, calendar, Slack, and CRM data to personalize deal sourcing, memo writing, and decision support.

---

## Framing: What Kind of Company Is Reidar?

Reidar is a **B2B SaaS tool** sold to VC firms. It does not manage money, hold assets, or make investment decisions on behalf of clients. It passively captures workflow data (emails, calendar, Slack, CRM) and generates AI-assisted outputs (memos, ranked deal lists, decision support).

The central regulatory question is: is Reidar a **software vendor** or an **investment adviser**? The answer materially changes the compliance burden.

**Preliminary conclusion:** Reidar is almost certainly a software vendor, not an investment adviser, provided it is careful about how it describes its outputs. The product should be positioned as "decision support" and "productivity tooling" — not as "investment recommendations." This positioning is not merely cosmetic; it needs to be reflected in product architecture, marketing, and terms of service.

---

## Current Regulations

### 1. Investment Advisers Act of 1940 (Federal)

**Jurisdiction:** SEC / Federal
**What it requires:** Any person who provides investment advice for compensation — including advice about securities — must register with the SEC as a Registered Investment Adviser (RIA) or qualify for an exemption.

**Does it apply to Reidar?**
Almost certainly **no**, with caveats. Reidar is a tool provider, not an adviser. Courts and the SEC use a multi-factor test: (a) does the entity provide advice about specific securities, (b) is that advice the primary business, (c) is compensation tied to the advice? Reidar provides workflow automation and pattern matching, not specific securities recommendations. The SEC has not historically treated software vendors as investment advisers purely because their outputs inform investment decisions.

The **critical carve-out to maintain:** Reidar's outputs should read as "here is deal information and context" not "you should invest in this company." If Reidar ever generates content like "we recommend you invest in [Startup X] based on your portfolio strategy," it begins to look like advice about specific securities transactions, which could trigger the Act.

**Exemptions relevant to Reidar's VC customers** (not Reidar itself): VC fund managers qualify for an Exempt Reporting Adviser (ERA) exemption under the Advisers Act if they manage only venture capital funds. The SEC recently (December 2025) proposed raising AUM registration thresholds from $150M to $175M via the INVEST Act of 2025. This is relevant background: Reidar's customers are likely ERAs or registered RIAs.

**Compliance cost if registration were required:** $50,000–$200,000 initial (legal fees, compliance infrastructure); $25,000–$75,000/year ongoing. This cost does not currently apply.

**Source quality:** High (SEC.gov, Carta, Kirkland & Ellis)

---

### 2. Gramm-Leach-Bliley Act (GLBA) — Financial Privacy

**Jurisdiction:** Federal (FTC enforcement for non-bank financial institutions)
**What it requires:** Financial institutions must provide privacy notices explaining data collection and sharing practices, implement data security programs, and not share nonpublic personal information (NPI) without customer consent.

**Does it apply to Reidar?**
**Indirectly.** GLBA applies to "financial institutions" — primarily to Reidar's customers (the VC firms), not to Reidar itself. However, when Reidar processes data on behalf of a VC firm (deal memos, investor communications, portfolio company data), Reidar functions as a **service provider** to a financial institution. GLBA's Safeguards Rule (as strengthened by the FTC in 2023, fully effective 2024) requires that financial institutions impose contractual data security obligations on their service providers.

**Practical implication:** VC firms signing up for Reidar will require Reidar to execute a **Data Processing Agreement (DPA)** that includes: encryption requirements, incident notification timelines (usually 72 hours), audit rights, sub-processor restrictions, and data deletion on contract termination. Without a mature DPA template and a SOC 2 report to back it up, Reidar will not close deals with serious firms.

**Compliance cost:** Embedded in DPA/legal work and SOC 2 (see below). Incremental direct cost is low if SOC 2 is already in progress.

**Source quality:** High (FTC, NYDFS)

---

### 3. FinCEN AML Rules — Bank Secrecy Act Extension to Investment Advisers

**Jurisdiction:** FinCEN (Treasury)
**What it requires:** As of January 1, 2026, a final rule expands the definition of "financial institution" under the Bank Secrecy Act to include SEC-registered RIAs and Exempt Reporting Advisers (ERAs). VC fund managers are now directly subject to formal Anti-Money Laundering (AML) programs, including KYC verification of investors, suspicious activity reporting (SARs), and record maintenance.

**Does it apply to Reidar?**
**No — directly.** Reidar is a software vendor, not a fund manager. However, this creates a **product opportunity**: Reidar's VC customers now have new compliance obligations. Any workflow tooling that helps them manage AML/KYC compliance (flagging investor provenance, maintaining records of LP communications) could be a valuable add-on or differentiator.

**Source quality:** High (Alter Domus, Kirkland & Ellis)

---

### 4. SEC Regulation S-P — Safeguarding Customer Information

**Jurisdiction:** SEC
**What it requires:** RIAs and broker-dealers must have written policies to protect customer records, including incident response programs for data breaches. Updated requirements (effective 2024) mandate notification to affected customers within 30 days of a breach.

**Does it apply to Reidar?**
Applies to Reidar's customers. For Reidar itself: the SEC's 2026 examination priorities specifically called out **Regulation S-P incident response programs** as a focus. VC firms will scrutinize whether their vendors (including Reidar) have incident response plans. Reidar needs a documented breach response plan and should include breach notification obligations in its DPA.

**Source quality:** High (Goodwin Law, SEC.gov)

---

## Data & Privacy

### 5. California Consumer Privacy Act / CPRA (CCPA)

**Jurisdiction:** California
**What it requires:** Businesses that process personal data of California residents must: provide a privacy notice at collection, honor consumer rights (access, deletion, correction, opt-out of sale/sharing), maintain data processing agreements with service providers, and — as of January 1, 2026 — conduct cybersecurity audits and risk assessments before processing high-risk data, plus make algorithmic decision-making disclosures (ADMT).

**Does it apply to Reidar?**
**Yes, at moderate scale.** CCPA applies to companies that (a) have $25M+ annual revenue, OR (b) process personal data of 100,000+ California residents per year, OR (c) derive 50%+ of revenue from selling/sharing personal data. At launch, Reidar likely does not meet these thresholds. However:

- The **B2B exemption expired January 1, 2023.** Employee data, contractor data, and business contact data (the kind Reidar processes — VC partner emails, calendar attendees, etc.) are now fully in-scope as "personal information" under CCPA.
- Even before Reidar hits thresholds, **enterprise customers will contractually require CCPA-compliant DPAs.**
- The **new ADMT disclosure requirement (effective January 1, 2026)** is highly relevant: if Reidar uses algorithms to materially influence decisions about individuals (e.g., scoring founders or surfacing ranked deal candidates), California residents affected by those decisions have new rights — including the right to know that automated decision-making is occurring and to opt out. This is a product design consideration.

**Impact on product architecture:**
- Build data minimization from day one — only capture what's needed for the stated purpose.
- Implement data deletion APIs so customers can purge a founder's data on request.
- Log what data was used to generate any ranked output (audit trail for ADMT compliance).
- Include CCPA-required provisions in your standard DPA/MSA template.

**Source quality:** High (White & Case, California OAG)

---

### 6. State Privacy Laws — Expanding Patchwork

**Jurisdiction:** ~20 states as of 2026
**Key states:** California (CCPA/CPRA), Virginia (VCDPA), Colorado (CPA), Connecticut (CTDPA), Texas (TDPSA), New York (pending SHIELD Act + proposed NYPPA), Indiana, Kentucky, Rhode Island (all effective 2026).

**Does it apply to Reidar?**
As Reidar operates nationally, it will process data of residents from multiple states. The practical approach is to treat **CCPA as the compliance floor** — it is the strictest and most broadly enforced. A CCPA-compliant privacy program will cover the majority of state law obligations.

**NY-specific note:** The **NY SHIELD Act** is already in effect and requires "reasonable" data security for NY residents' private information. NYDFS Cybersecurity Requirements (expanded in 2023, fully effective 2025) apply to covered financial services entities in NY — likely Reidar's customers, not Reidar itself, but again creates DPA pressure.

**Source quality:** Medium-High (White & Case, Sidley)

---

### 7. GDPR — European Union

**Jurisdiction:** EU (applies to US companies processing EU residents' data)
**What it requires:** Lawful basis for processing, data minimization, subject access rights, 72-hour breach notification, cross-border transfer mechanisms (SCCs), DPO appointment for large-scale processing of sensitive data.

**Does it apply to Reidar at launch?**
**Not immediately** if Reidar launches US-only. Becomes relevant if any EU-based VC firms onboard (e.g., US funds with EU partners, or EU expansion). GDPR penalties are severe: up to 4% of global annual turnover or €20M, whichever is greater.

**Recommendation:** Build GDPR-compatible data architecture from day one (it is largely a superset of CCPA technical requirements). Add Standard Contractual Clauses (SCCs) to the DPA template before entering any EU market.

**Source quality:** High

---

### 8. Email and Communications Data — Wiretapping / ECPA Considerations

**Jurisdiction:** Federal (ECPA), state wiretapping laws
**What it requires:** The Electronic Communications Privacy Act (ECPA) prohibits intercepting electronic communications without consent. Most states have one-party consent (the VC firm itself consents), but some states (California, Illinois, Maryland, etc.) require **all-party consent**.

**Does it apply to Reidar?**
Reidar's Gmail/Slack integrations operate with the VC firm's explicit OAuth consent — the firm is a party to the communications being captured. This is generally sufficient for one-party consent states. For all-party consent states:

- If a **founder** sends an email to a VC, and Reidar captures that email without the founder's knowledge, this is a potential ECPA/state wiretapping issue.
- Mitigation: Reidar's terms of service should clearly state that by using the product, the firm agrees only to capture communications to which the firm's employees are a party; Reidar should not capture communications between third parties where none of the firm's users are participants.

**The informed consent angle:** Even where legally permissible, there is a reputational and relationship risk if founders discover their communications are being passively captured and fed into an AI system. Consider a policy where captured emails are used only for the VC's internal analysis, not shared with Reidar for model training, and where founders can request deletion.

**Source quality:** Medium (general legal practice; specific ECPA caselaw not directly searched in this research round)

---

## AI in Financial Services — Regulatory Considerations

### 9. SEC Position on AI Investment Tools (Current)

**Current status:** No AI-specific regulations are in effect for investment advisers as of March 2026. The SEC, CFTC, and FINRA have confirmed they have not issued new AI-specific regulations. However:

**What already applies (via existing rules):**

- **Anti-fraud provisions (Section 206, Advisers Act):** Applies to RIAs. Reidar's customers cannot misrepresent AI capabilities to their LPs. Reidar should ensure its marketing language does not lead customers to make representations to their own investors that overstate what the AI does.
- **Compliance programs (Rule 206(4)-7):** RIA customers must have written compliance policies covering AI tools they use. Reidar should provide documentation of how its AI works, what data it uses, and what its outputs mean — to support customers' own compliance programs.
- **Recordkeeping rules:** RIAs must maintain records of advisory activities. If Reidar-generated memos or AI outputs inform investment decisions, those outputs may need to be retained as records. Reidar should offer data export/retention features.
- **Regulation BI (for broker-dealers):** Less directly relevant for VC (which is generally not broker-dealer territory), but note that any Reidar customer that is also a registered broker-dealer must ensure AI tools do not create conflicts under Reg BI.

**"AI washing" enforcement:** The SEC's first AI-washing enforcement actions came in March 2024, fining Delphia ($225,000) and Global Predictions ($175,000) for falsely claiming AI capabilities they did not have. In 2025, enforcement expanded to public companies (Presto Automation) and resulted in criminal charges (Nate Inc., $42M fraud). For Reidar: be scrupulously accurate in marketing claims about what the AI does and does not do.

**Source quality:** High (SEC.gov, Sidley Austin, Morrison Foerster)

---

### 10. Does Reidar Need to Register as an Investment Adviser?

**Short answer: No, with important caveats.**

The Investment Advisers Act registration requirement hinges on whether an entity provides "investment advice" about securities "as part of a regular business." The SEC has historically applied a "solely incidental" standard — technology tools used by advisers do not themselves become advisers.

**Safe harbor behavior for Reidar:**
- Describe outputs as "deal intelligence," "research summaries," or "sourcing filters" — not "investment recommendations"
- Do not rate or rank startups using language like "we recommend" or "buy/sell/hold"
- Do not claim that following Reidar's outputs will produce superior investment returns
- Make clear in terms of service that investment decisions remain with the human GP

**Risk scenario:** If Reidar adds a feature that generates portfolio optimization outputs ("based on your thesis, you are overweight consumer and underweight deep tech — rebalance by investing in X"), this begins to look like portfolio advice about securities. Avoid this feature framing.

**Source quality:** High (Morse Law, Katten, Carta)

---

### 11. FINRA Guidance on AI (Applies to Broker-Dealers, Not Directly to VC)

**Current status:** FINRA's 2026 Annual Regulatory Oversight Report dedicates a full section to generative AI. FINRA's position (Regulatory Notice 24-09): existing rules are technology-neutral; AI tools must be supervised like any other communication or decision-making system. Key areas of focus: recordkeeping, customer information protection, Reg BI conflicts.

**Relevance to Reidar:** Reidar's primary customers are VC fund managers, not FINRA-registered broker-dealers. However, some larger multi-strategy firms may be both. For those customers, Reidar should support their FINRA compliance by offering audit logs, data provenance, and documentation of AI methodology.

**Source quality:** High (FINRA.org)

---

### 12. EU AI Act — Medium-Term Consideration

**Timeline:** Fully in effect August 2026 for high-risk AI systems.

**Classification for Reidar:** The EU AI Act classifies AI systems used in financial services — including credit scoring, investment optimization, and asset management decisioning — as **high-risk**. Robo-advisors are explicitly mentioned.

**If Reidar expands to EU markets:**
- Reidar's deal scoring / investment optimization features would likely be classified as **high-risk AI**
- Requirements include: technical documentation, risk management system, quality datasets, human oversight design, conformity assessment, registration in EU AI database, and CE marking
- Penalties: up to €15M or 3% of worldwide turnover for non-conforming high-risk AI

**Is Reidar a "provider" or "deployer" under the Act?**
- If Reidar builds the AI system and sells it to VC firms: Reidar is the **provider** and bears most compliance obligations
- If Reidar provides infrastructure and VC firms configure the AI for their own use: the VC firm may be the deployer, with shared obligations

**Recommendation:** Do not expand to EU markets without dedicated EU AI Act compliance work. The August 2026 deadline for high-risk systems is already imminent. Plan this as a 6-12 month pre-launch workstream for EU.

**Source quality:** High (Goodwin Law, Fenergo, EU Commission)

---

## Upcoming Changes

### A. SEC Predictive Data Analytics Rule — Withdrawn (June 2025)

The SEC under Chair Gensler proposed rules in July 2023 that would have required broker-dealers and investment advisers to identify and eliminate conflicts of interest in their use of predictive data analytics and AI. The proposal was **withdrawn in June 2025** under the current administration. The SEC stated it "does not currently intend to issue final rules" on these proposals.

**Impact on Reidar:** Net positive — these rules would have imposed significant disclosure and conflict-of-interest obligations on tools like Reidar that inform investment adviser decisions. The withdrawal reduces near-term compliance risk. However, the SEC's Investor Advisory Committee voted in December 2025 to advance new AI disclosure recommendations, suggesting this topic is not fully dormant.

### B. INVEST Act of 2025

Passed the House December 2025. Increases AUM thresholds for mandatory SEC registration (from $150M to $175M). Expands definition of "qualifying investment" for the venture capital fund exemption. This benefits Reidar's customers more than Reidar itself — makes it easier for emerging managers to remain exempt, broadening the pool of VC firms who could be Reidar customers.

### C. State Privacy Law Expansion (2026)

Indiana, Kentucky, and Rhode Island privacy laws take effect in 2026. CCPA gains mandatory cybersecurity audit and ADMT disclosure requirements effective January 1, 2026. Arkansas introduces new privacy law effective July 2026. The trajectory is toward nationwide de facto CCPA-level compliance requirements.

### D. FinCEN AML for Investment Advisers (Effective January 1, 2026)

Already effective as of this writing. Creates a new compliance burden for Reidar's customers (VC fund managers) and a corresponding product opportunity for Reidar.

### E. Potential Federal Privacy Law

Congress has failed to pass a comprehensive federal privacy law for over a decade. The American Privacy Rights Act (APRA) was proposed in 2024 and stalled. No significant forward movement is expected in 2025-2026 under the current administration. The state patchwork continues.

---

## Compliance Cost Estimate

### Minimum Viable Compliance (Launch — Year 1)

| Item | Cost |
|------|------|
| Privacy policy + terms of service + DPA (attorney-drafted) | $5,000–$15,000 |
| Internal data mapping and classification | $2,000–$5,000 (staff time) |
| Incident response plan (documented) | $1,000–$3,000 (staff time + counsel review) |
| Basic security controls (encryption at rest/in transit, access controls, audit logs) | Engineering time; $0–$10,000 tooling |
| SOC 2 Type 1 (initial audit) | $10,000–$20,000 |
| Compliance platform (Vanta or Drata) | $7,000–$12,000/year |
| **Total Year 1 minimum** | **$25,000–$65,000** |

**What this buys:** Ability to pass basic enterprise security reviews; defensible privacy posture; clean DPA template for VC firm customers; legal basis for email/calendar data processing.

### Full Compliance (Scale — Year 2–3)

| Item | Cost |
|------|------|
| SOC 2 Type 2 (observation period + audit) | $20,000–$40,000 |
| Annual SOC 2 renewal | $15,000–$25,000/year |
| Penetration testing (annual) | $10,000–$20,000 |
| Legal retainer (ongoing privacy + securities counsel) | $24,000–$60,000/year |
| GDPR readiness (for EU expansion) | $20,000–$50,000 one-time |
| EU AI Act compliance workstream | $30,000–$80,000 one-time |
| ISO 27001 (optional, large enterprise requirement) | $30,000–$60,000 |
| **Total Year 2–3 (US-only)** | **$100,000–$220,000 cumulative** |
| **Total with EU expansion** | **$150,000–$350,000 cumulative** |

### Certifications Timeline

| Certification | When Needed | Timeline to Obtain |
|---------------|-------------|-------------------|
| SOC 2 Type 1 | Pre-enterprise sales (Year 1) | 3–6 months |
| SOC 2 Type 2 | Enterprise contracts, Series A (Year 2) | 9–12 months from Type 1 |
| ISO 27001 | Large financial institution clients (Year 3+) | 6–12 months |
| EU AI Act conformity assessment | EU launch | 6–12 months pre-launch |

---

## Risk Assessment

**Overall regulatory risk level for Reidar: LOW TO MEDIUM**

### Risk Breakdown

| Risk | Level | Notes |
|------|-------|-------|
| Investment Adviser Act registration | Low | Reidar is a tool vendor; avoid "recommendation" language |
| "AI washing" SEC enforcement | Low-Medium | Applies to Reidar's customers; but Reidar's own marketing must be accurate |
| Data privacy (CCPA/state laws) | Medium | Processing personal data of CA residents; ADMT disclosure likely required at scale |
| GLBA service provider obligations | Medium | Will be required in VC firm contracts; SOC 2 is the mitigation |
| ECPA / wiretapping (email capture) | Low-Medium | Mitigated by OAuth consent architecture; all-party consent states require care |
| EU AI Act (high-risk classification) | High (if EU) | Only relevant if Reidar expands to EU; investment AI is explicitly high-risk |
| FinCEN AML | Low | Applies to customers, not Reidar |
| FINRA | Low | VC firms are generally not FINRA members |

### Key Reidar-Specific Risks

1. **Product language risk:** If Reidar's UI or marketing uses phrases like "recommended investment," "we advise," or "portfolio recommendation," it creates investment adviser registration exposure. This risk is entirely controllable through product design.

2. **Email capture scope creep:** If Reidar expands beyond capturing communications the VC firm is party to (e.g., capturing third-party founder-to-founder emails somehow routed through the system), ECPA risk rises sharply.

3. **AI output provenance:** CCPA's new ADMT rules (January 2026) require disclosure when algorithms materially influence decisions about individuals. Reidar's founder scoring features will need audit trails and opt-out mechanisms as California enforcement matures.

4. **Customer breach liability:** If Reidar stores VC firms' emails and deal data and suffers a breach, Reidar faces liability under its DPAs and reputational harm. This is the primary security risk, not SEC enforcement.

5. **AI washing exposure:** If Reidar claims capabilities it does not have (e.g., "our AI learns your exact investment style" when the model is generic), it exposes both Reidar and its VC customers to SEC anti-fraud scrutiny.

### Mitigation Strategies

1. Engage a securities attorney before launch to review product language and terms of service specifically for investment adviser Act triggers. Cost: $5,000–$10,000 one-time review.
2. Start SOC 2 Type 1 process in first 6 months; this is the single highest-ROI compliance investment for B2B sales.
3. Build data deletion and audit-trail features into the core product architecture — not as an afterthought.
4. Create a clear, accurate AI methodology document that explains what the system does and does not do — this protects against both AI washing allegations and customer misrepresentation to their LPs.
5. Implement explicit OAuth-based consent flows and document them; do not capture communications beyond the authenticated user's scope.

---

## Data Gaps

The following areas were not fully resolved in this research and would benefit from targeted legal counsel:

1. **ECPA / state wiretapping caselaw specific to AI SaaS email capture:** The research surfaced the general framework but not specific cases involving passive email capture by third-party tools. A securities attorney should review the Gmail integration architecture specifically.

2. **Broker-dealer registration risk for Reidar at scale:** If Reidar ever facilitates introductions between startups and investors (not currently in scope), it could trigger broker-dealer registration requirements (15% finder's fee rule). This should be monitored as product scope evolves.

3. **Specific Gramm-Leach-Bliley "service provider" definition:** Whether Reidar unambiguously qualifies as a "service provider" vs. a "third party" under GLBA (the distinction affects obligations) was not resolved. Counsel review recommended.

4. **Treatment of deal memo content as "investment advice" vs. "research":** The line between these categories matters for Advisers Act purposes and is unsettled for AI-generated outputs. No specific SEC guidance was found addressing AI-generated due diligence memos produced by software vendors.

5. **Data residency requirements:** Some financial sector customers (particularly those with government fund LPs) may have data residency requirements (US-only infrastructure). Reidar should confirm its cloud infrastructure region defaults and the feasibility of US-only data residency commitments.

6. **Specific state laws beyond California:** New York, Texas, and Illinois have distinct data protection regimes. NYDFS cybersecurity requirements may apply if Reidar's customers are NYDFS-licensed entities. Not fully researched here.

---

## Sources

- [Venture Capital Compliance Requirements Explained — Alter Domus](https://alterdomus.com/insight/venture-capital-compliance-requirements/)
- [Venture Capital Regulations — Carta](https://carta.com/learn/private-funds/regulations/)
- [Private Fund Manager SEC/CFTC Compliance: 2025 Key Dates — Kirkland & Ellis](https://www.kirkland.com/publications/kirkland-aim/2025/01/private-fund-manager-us-sec-cftc-compliance-2025-key-dates)
- [2026 SEC Exam Priorities for Registered Investment Advisers — Goodwin Law](https://www.goodwinlaw.com/en/insights/publications/2025/12/alerts-privateequity-pif-2026-sec-exam-priorities-for-registered-investment-advisers)
- [AI Compliance: Applying Existing SEC Regulatory Frameworks — Kitces](https://www.kitces.com/blog/artificial-intelligence-compliance-considerations-investment-advisers-sec-securities-exchange-commission-legal-regulation-framework/)
- [AI Compliance Tips for Investment Advisers — Morrison Foerster](https://www.mofo.com/resources/insights/251015-ai-compliance-tips-for-advisers)
- [Artificial Intelligence: US Financial Regulator Guidelines for Responsible Use — Sidley Austin](https://www.sidley.com/en/insights/newsupdates/2025/02/artificial-intelligence-us-financial-regulator-guidelines-for-responsible-use)
- [US Data Privacy Laws in 2025 — Smarsh](https://www.smarsh.com/blog/thought-leadership/us-data-privacy-laws-2025-new-regulations/)
- [2025 State Privacy Laws: What Businesses Need to Know — White & Case](https://www.whitecase.com/insight-alert/2025-state-privacy-laws-what-businesses-need-know-compliance)
- [CCPA and CPRA: What SaaS Companies Need to Know — Concerto Compliance](https://www.concertocompliance.com/blog/ccpa-what-saas-companies-need-to-know/)
- [SaaS Privacy Compliance Requirements: Complete 2025 Guide — SecurePrivacy](https://secureprivacy.ai/blog/saas-privacy-compliance-requirements-2025-guide)
- [GenAI: Continuing and Emerging Trends — FINRA 2026 Annual Regulatory Oversight Report](https://www.finra.org/rules-guidance/guidance/reports/2026-finra-annual-regulatory-oversight-report/gen-ai)
- [AI Governance in Financial Services: FINRA & SEC Guidance — Smarsh](https://www.smarsh.com/blog/thought-leadership/ai-governance-expectations-are-rising-even-without-rules)
- [Generative AI in Financial Services: Practical Compliance Playbook 2026 — Shumaker](https://www.shumaker.com/insight/client-alert-generative-artificial-intelligence-in-financial-services-a-practical-compliance-playbook-for-2026/)
- [SEC Charges Two Investment Advisers for AI Washing — SEC.gov](https://www.sec.gov/newsroom/press-releases/2024-36)
- [SEC Fines Two Investment Advisers for "AI Washing" — Harvard Law School Forum on Corporate Governance](https://corpgov.law.harvard.edu/2024/04/09/sec-fines-two-investment-advisers-for-ai-washing/)
- [SEC Continues to Target "AI Washing" — Hedge Fund Law Report](https://www.hflawreport.com/21165256/sec-continues-to-target-ai-washing.thtml)
- [EU AI Act: Key Points for Financial Services Businesses — Goodwin Law](https://www.goodwinlaw.com/en/insights/publications/2024/08/alerts-practices-pif-key-points-for-financial-services-businesses)
- [EU AI Act Compliance for Financial Services: Complete 2026 Guide — Matproof](https://matproof.com/blog/blog/eu-ai-act-compliance-financial-services)
- [SEC Withdraws Numerous Proposed Rules — Vedder Price](https://www.vedderprice.com/sec-withdraws-numerous-proposed-rules)
- [SEC Predictive Data Analytics Rule S7-12-23 — SEC.gov](https://www.sec.gov/rules-regulations/2025/06/s7-12-23)
- [SOC 2 Compliance Cost in 2025 — Complyjet](https://www.complyjet.com/blog/soc-2-compliance-cost)
- [The Real Cost of SOC 2 for Startups — SecureLeap](https://secureleap.tech/blog/cost-of-soc-2-compliance-in-2025)
- [Registration Exemptions for Investment Advisers — Morse Law](https://www.morse.law/news/registration-exemptions-for-investment-advisers/)
- [House Passes INVEST Act of 2025 — MSK](https://www.msk.com/newsroom-alerts-invest-act-of-2025)
