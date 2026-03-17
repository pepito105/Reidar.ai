import json
import logging
from typing import Optional
from anthropic import AsyncAnthropic
from app.core.config import settings

logger = logging.getLogger(__name__)
client = AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
MODEL = "claude-haiku-4-5-20251001"

# Universal sector taxonomy — used across all firms
SECTOR_TAXONOMY = [
    "AI Infrastructure",
    "Developer Tools",
    "FinTech",
    "HealthTech",
    "LegalTech",
    "HRTech",
    "EdTech",
    "Enterprise SaaS",
    "Consumer AI",
    "CleanTech",
    "Cybersecurity",
    "E-commerce & Retail",
    "PropTech",
    "MarketingTech",
    "Supply Chain & Logistics",
    "Other",
]

SECTOR_TAXONOMY_STR = ", ".join(SECTOR_TAXONOMY)


def _has_meaningful_thesis(firm) -> bool:
    """Returns True if the firm has entered a substantive investment thesis."""
    if not firm or not firm.investment_thesis:
        return False
    thesis = firm.investment_thesis.strip()
    return len(thesis.split()) >= 8


def _build_firm_context(firm) -> str:
    if not firm:
        return "No firm profile configured."
    stages = ", ".join(firm.investment_stages) if firm.investment_stages else "Not specified"
    excluded = ", ".join(firm.excluded_sectors) if firm.excluded_sectors else "None"
    check = f"${firm.check_size_min:,}-${firm.check_size_max:,}" if firm.check_size_min and firm.check_size_max else "Not specified"
    geo = ", ".join(firm.geography_focus) if isinstance(firm.geography_focus, list) else str(firm.geography_focus or "Global")
    base = f"FIRM: {firm.firm_name}\nStages: {stages}\nGeography: {geo}\nCheck Size: {check}\nExcluded sectors: {excluded}"
    if _has_meaningful_thesis(firm):
        base += f"\nInvestment Thesis: {firm.investment_thesis}"
    return base


def _build_mandate_category_guide(firm) -> str:
    if not firm or not _has_meaningful_thesis(firm):
        return 'mandate_category: null  // No firm thesis defined'

    # Use stored buckets if available, otherwise fall back to free-form
    buckets = getattr(firm, 'mandate_buckets', None)
    if buckets and len(buckets) > 0:
        bucket_list = ", ".join(f'"{b}"' for b in buckets)
        return f"""mandate_category: You MUST assign exactly one category from this fixed list: [{bucket_list}]
Use "Other" if the company does not fit any specific bucket.
Do not invent new labels — only use the exact labels from the list above."""
    else:
        return f"""mandate_category: Map this company to the single most relevant bucket from the firm's thesis below.
Read the thesis and infer the firm's natural categories. Return a short label like "Health & Wellness" or "Consumer Marketplaces" — use the firm's own language.
If the company doesn't map cleanly, return "Other".
Firm thesis for reference: {firm.investment_thesis}"""


def _build_scoring_guide(firm) -> str:
    """Returns the appropriate scoring guide based on whether firm has a thesis."""
    if not firm or not _has_meaningful_thesis(firm):
        return """SCORING MODE: Quality-based (no thesis filter)
Score companies purely on objective quality signals:

fit_score (1-5) — overall company quality:
  5 = Exceptional — strong founder signal, large clear market, differentiated AI-native product, early traction
  4 = Strong — compelling product, good market, solid team indicators
  3 = Interesting — promising but early or incomplete signal
  2 = Weak — generic product, crowded market, low differentiation
  1 = Poor — no clear value proposition or outside any reasonable investment scope

ai_score (1-5) — how AI-native is this company:
  5 = AI is the core product, not a feature
  4 = AI is central and differentiating
  3 = AI used meaningfully
  2 = Some AI/ML elements
  1 = No meaningful AI

Score generously — use the full 1-5 range. A truly exceptional company should score 5."""
    else:
        return f"""SCORING MODE: Thesis-fit (firm has a defined mandate)
The firm thesis is: {firm.investment_thesis}

Score companies on how well they match this specific thesis AND their quality:

fit_score (1-5) — thesis fit + quality combined:
  5 = PERFECT MATCH — directly addresses the thesis, AI-native, strong founder story, compelling product. Give 5 freely to companies that clearly fit.
  4 = STRONG FIT — meets most thesis criteria, one element missing or unclear
  3 = POSSIBLE FIT — relevant sector or adjacent, worth monitoring
  2 = WEAK FIT — tangentially related but missing key thesis criteria
  1 = NO FIT — clearly outside thesis or in excluded sectors

ai_score (1-5) — how AI-native is this company:
  5 = AI is the core product
  4 = AI is central and differentiating
  3 = AI used meaningfully
  2 = Some AI/ML elements
  1 = No meaningful AI

IMPORTANT: Be generous. If a company is AI-native B2B SaaS automating any knowledge work, operational process, or the firm's target verticals — that is a 5. Do not anchor on 3 or 4. Use the full range."""


async def classify_startup(name: str, description: str, website: Optional[str], source: str, firm, custom_focus: str = None) -> dict:
    firm_context = _build_firm_context(firm)
    mandate_category_guide = _build_mandate_category_guide(firm)
    focus_line = f'ANALYST FOCUS: The analyst has a specific question — make sure your analysis directly addresses this: {custom_focus}\n\n' if custom_focus else ''

    prompt = f"""{firm_context}

When evaluating thesis fit, use April Dunford's positioning lens:
1. Competitive alternatives: What would this company's customers use if this didn't exist?
2. Unique attributes: What does this company have that alternatives don't — be specific, not 'better UX'
3. Value: What outcome does that enable for the customer?
4. Target customer: Who cares most about this value — define by characteristics not demographics
5. Market category: Is this (a) a better version of an existing category, (b) an existing category with a qualifier, or (c) a genuinely new category?

Use this analysis to inform fit_score and fit_reasoning. Do not output the framework explicitly — synthesize it into your reasoning.

IMPORTANT: The 'name' field must be the actual company name only — never a description, headline, or article title. If the input name looks like a headline (e.g. 'Chinese brain interface startup Gestala'), extract just the company name ('Gestala'). If the name contains words like 'startup', 'raises', 'launches', 'announces', 'funding', or descriptive phrases, clean it to just the brand/company name. If you cannot determine a clean company name, set name to null.

{focus_line}
COMPANY TO EVALUATE:
Name: {name}
Description: {description}
Website: {website or 'Unknown'}
Source: {source}

POSITIONING: Write one_liner strictly in this formula: "We help [customer] [solve problem] by [mechanism]". Never use a generic description; always fill in the three slots with concrete customer, problem, and mechanism.

SCORING GUIDE — use the full range, be generous not conservative:
fit_score 5 = AI-native B2B SaaS, knowledge work automation, strong product-first story — directly matches thesis
fit_score 4 = Strong fit, meets most criteria, compelling AI product
fit_score 3 = Possible fit, relevant sector, worth monitoring
fit_score 2 = Weak fit, tangentially related
fit_score 1 = No fit, outside thesis or excluded sector

ai_score 5 = AI is the core product
ai_score 4 = AI is central to the product
ai_score 3 = AI used meaningfully
ai_score 2 = Some AI elements
ai_score 1 = No meaningful AI

SECTOR: You must assign exactly one sector from this fixed list — do not invent new labels:
{SECTOR_TAXONOMY_STR}
Pick the single best match. If none fit well, use "Other".

MANDATE CATEGORY: {mandate_category_guide}

FIT REASONING: Structure as bullet points. Each point must end with a confidence level: "— High confidence" (multiple clear signals), "— Medium confidence" (some evidence), or "— Low confidence" (inferred). Format: "• [Thesis dimension]: [reasoning] — [High/Medium/Low confidence]"
Example: "• AI-native architecture: Product is built on LLMs with no legacy layer — High confidence. • Regulated vertical: Mentions healthcare but no specific compliance features evident — Medium confidence."

COMPARABLE COMPANIES: For each comparable, include: (a) how this company differentiates from it (differentiation), and (b) one reason an investor might prefer this company over that comparable (reason_investor_might_prefer).

RECOMMENDED_NEXT_STEP — choose exactly one format based on fit_score:
- If fit_score is 4 or 5: "Request intro via [most relevant investor name if mentioned in description/source, otherwise 'warm network']. Conviction: [one sentence why now]"
- If fit_score is 3: "Monitor for 60 days. Watch for: [2 specific signals that would upgrade this to Top Match]"
- If fit_score is 1 or 2: "Pass — [one specific reason tied to firm mandate]"

KEY_RISKS: Use the Risk Matrix framework. For each risk include Likelihood (High/Medium/Low) and Impact (Critical/Major/Moderate/Minor). Max 3 risks. Format each as: "[Risk description] — Likelihood: [H/M/L], Impact: [Critical/Major/Moderate/Minor]"

BULL_CASE: Structure each statement as "If [assumption] proves true, then [outcome] — making this a [market position] opportunity." Max 2 bull case statements.

IMPORTANT: AI-native B2B SaaS automating knowledge work or operations should score 4-5. Be generous with founder-led product-first companies. Use 1-2 only for companies clearly outside thesis.

Respond with ONLY a JSON object, no markdown:
{{
  "name": "actual company name only, or null if input is a headline/description and you cannot extract a clean name",
  "one_liner": "We help [customer] [solve problem] by [mechanism] — max 15 words",
  "ai_summary": "2-3 sentence investment overview",
  "ai_score": <integer 1-5>,
  "fit_score": <integer 1-5>,
  "fit_reasoning": "Bullet points with • [dimension]: [reasoning] — High/Medium/Low confidence",
  "business_model": "how they make money",
  "target_customer": "primary customer",
  "sector": "exactly one value from the fixed sector list above",
  "mandate_category": "firm's own thesis bucket label, or null",
  "thesis_tags": ["tag1", "tag2"],
  "recommended_next_step": "Use RECOMMENDED_NEXT_STEP format above based on fit_score",
  "funding_stage": "pre-seed or seed or series-a or series-b or unknown",
  "key_risks": "Up to 3 risks, each with Likelihood (High/Medium/Low) and Impact (Critical/Major/Moderate/Minor)",
  "bull_case": "Up to 2 statements: If [assumption] proves true, then [outcome] — making this a [market position] opportunity",
  "comparable_companies": [
    {{ "name": "Company name", "one_liner": "short description", "fit_score": <1-5>, "differentiation": "how this company differentiates from it", "reason_investor_might_prefer": "one reason an investor might prefer this company over this comparable" }}
  ]
}}"""
    try:
        response = await client.messages.create(
            model=MODEL,
            max_tokens=2000,
            messages=[{"role": "user", "content": prompt}]
        )
        raw = response.content[0].text.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        return json.loads(raw.strip())
    except Exception as e:
        logger.error(f"Classification error for {name}: {e}")
        return {
            "name": None,
            "one_liner": description[:100] if description else name,
            "ai_summary": description[:300] if description else "",
            "ai_score": None,
            "fit_score": None,
            "fit_reasoning": f"Classification failed: {str(e)}",
            "business_model": None,
            "target_customer": None,
            "sector": None,
            "mandate_category": None,
            "thesis_tags": [],
            "recommended_next_step": "Needs manual review",
            "funding_stage": "unknown",
            "key_risks": None,
            "bull_case": None,
            "comparable_companies": []
        }


async def research_startup(
    name: str,
    description: str,
    website: Optional[str],
    firm,
    custom_focus: str = None,
    db=None,
) -> dict:
    """
    Deep investment research using the VC Investment Research Skill framework.
    Uses Sonnet + web search. Called only on manual Deploy Research Agents click.
    Returns enriched structured data for all research fields.
    """
    from anthropic import AsyncAnthropic
    research_client = AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)

    firm_context = _build_firm_context(firm)
    mandate_category_guide = _build_mandate_category_guide(firm)

    # Build portfolio context if db available
    portfolio_context = ""
    pipeline_context = ""
    if db and firm:
        try:
            from sqlalchemy import select
            from app.models.startup import Startup
            # Portfolio companies
            port_result = await db.execute(
                select(Startup.name, Startup.sector, Startup.one_liner)
                .where(Startup.user_id == firm.user_id)
                .where(Startup.is_portfolio == True)
                .limit(20)
            )
            portfolio_cos = port_result.fetchall()
            if portfolio_cos:
                portfolio_context = "PORTFOLIO COMPANIES (check for conflicts):\n" + \
                    "\n".join([f"- {c.name}: {c.one_liner or c.sector}" for c in portfolio_cos])

            # Pipeline companies being tracked
            pipe_result = await db.execute(
                select(Startup.name, Startup.pipeline_status, Startup.fit_score)
                .where(Startup.user_id == firm.user_id)
                .where(Startup.pipeline_status.in_(["watching", "outreach", "diligence"]))
                .limit(15)
            )
            pipe_cos = pipe_result.fetchall()
            if pipe_cos:
                pipeline_context = "PIPELINE (currently tracking):\n" + \
                    "\n".join([f"- {c.name} ({c.pipeline_status}, fit {c.fit_score}/5)" for c in pipe_cos])
        except Exception as e:
            logger.warning(f"Could not load portfolio/pipeline context: {e}")

    focus_line = f"\nANALYST FOCUS: {custom_focus}\nMake sure your research directly addresses this question.\n" if custom_focus else ""

    prompt = f"""You are a senior investment analyst running deep research on a startup for a VC firm.

{firm_context}

{portfolio_context}

{pipeline_context}

{focus_line}

COMPANY TO RESEARCH:
Name: {name}
Description: {description}
Website: {website or "Unknown — search for it"}

Use web search to research this company thoroughly before scoring. Visit their website,
find recent news, funding announcements, team information, and competitive context.

Then produce a structured research brief following this framework:

PHASE 1 — WHAT THEY ACTUALLY DO
Cut through the pitch. Find the concrete reality.
- Visit their website and product pages
- Check job listings to understand what they're actually building
- Look for pricing pages, demos, customer case studies
- Produce a single positioning sentence: "We help [specific customer] [do specific thing] by [specific mechanism]"
- Flag if their positioning is unclear or aspirational without substance

PHASE 2 — MARKET TIMING
- What changed in the last 2-3 years that makes this possible now?
- Is this a vitamin or a painkiller?
- Specific regulatory, infrastructure, or behavioral tailwinds
- Red flag if: "market will be ready in 3 years" or technology dependency on unproven infra

PHASE 3 — MANDATE FIT
Score against this firm's specific thesis. Not generic quality — mandate fit.
Stage, sector, geography, AI-nativeness, excluded sectors, portfolio conflicts.
Fit score 1-5 where 5 = partner takes the call today.

PHASE 4 — TRACTION SIGNALS
Real evidence only. No "500 waitlist signups."
Revenue numbers, named customers, funding history with investors named, hiring velocity,
press coverage of product (not just funding), G2/app store reviews if relevant.

PHASE 5 — TEAM
Founder-market fit. Have they solved this problem before? Technical co-founder if needed?
Prior outcomes (acqui-hire ≠ success). Who invested (signals due diligence done).

PHASE 6 — COMPETITIVE LANDSCAPE
Top 3 direct competitors. Is differentiation durable or just a feature?
Incumbent response risk. Recent competitive funding.

PHASE 7 — KEY RISKS (max 4, by Likelihood x Impact)
Real risks, not PR risks. Each: description, Likelihood (H/M/L), Impact (Critical/Major/Moderate/Minor).

PHASE 8 — BULL CASE (max 2)
"If [specific assumption] proves true, then [specific outcome]."
No generic "if AI adoption continues."

RECOMMENDED NEXT STEP — one clear action:
- Fit 4-5: "Request intro via [specific path]. Conviction: [one sentence]."
- Fit 3: "Monitor 60 days. Watch for: [Signal 1] and [Signal 2]."
- Fit 1-2: "Pass — [one specific reason tied to mandate]."

SECTOR: Must be exactly one from: {SECTOR_TAXONOMY_STR}

MANDATE CATEGORY: {mandate_category_guide}

Respond with ONLY a JSON object, no markdown:
{{
  "name": "clean company name only",
  "one_liner": "We help [customer] [solve problem] by [mechanism] — max 15 words",
  "enriched_one_liner": "More detailed 2-sentence description from actual research",
  "ai_summary": "3-4 sentence investment overview with specific findings from research",
  "ai_score": <integer 1-5>,
  "fit_score": <integer 1-5>,
  "fit_reasoning": "Bullet points: • [dimension]: [finding from research] — [High/Medium/Low confidence]",
  "business_model": "how they make money — be specific from research",
  "target_customer": "primary customer — specific job title or company type",
  "sector": "exactly one from the fixed list",
  "mandate_category": "firm thesis bucket or null",
  "thesis_tags": ["tag1", "tag2", "tag3"],
  "traction_signals": "Specific traction evidence found during research with sources",
  "red_flags": "Specific concerns found during research, or null if none",
  "recommended_next_step": "Single clear action based on fit score",
  "funding_stage": "pre-seed or seed or series-a or series-b or unknown",
  "key_risks": "Up to 4 risks, each: [risk] — Likelihood: H/M/L, Impact: Critical/Major/Moderate/Minor",
  "bull_case": "Up to 2 statements: If [specific assumption], then [specific outcome]",
  "comparable_companies": [
    {{
      "name": "Company name",
      "one_liner": "what they do",
      "fit_score": <1-5>,
      "differentiation": "how this company differs",
      "reason_investor_might_prefer": "one reason to prefer this over the comparable"
    }}
  ],
  "sources_visited": ["url1", "url2"]
}}"""

    try:
        response = await research_client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=4000,
            tools=[{"type": "web_search_20250305", "name": "web_search", "max_uses": 6}],
            messages=[{"role": "user", "content": prompt}]
        )
        final_text = ""
        for block in response.content:
            if hasattr(block, "type") and block.type == "text":
                final_text = block.text
        if not final_text or not final_text.strip():
            logger.warning("research_startup: empty response")
            return {}
        raw = final_text.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        return json.loads(raw.strip())
    except Exception as e:
        logger.error(f"Research error for {name}: {e}", exc_info=True)
        return {}


async def detect_signals(company_name: str, one_liner: str, website: Optional[str], funding_stage: Optional[str]) -> list:
    prompt = f"""You are an AI analyst monitoring a startup portfolio.

COMPANY: {company_name}
DESCRIPTION: {one_liner or 'No description'}
WEBSITE: {website or 'Unknown'}
FUNDING STAGE: {funding_stage or 'Unknown'}

Identify 1-3 realistic recent signals an investor would care about.
Focus on: funding rounds, product launches, key hires, traction milestones, press coverage.

Respond with ONLY a JSON array:
[
  {{
    "signal_type": "funding_round or product_launch or news_mention or headcount_growth or leadership_change or traction_update",
    "title": "short headline max 80 chars",
    "summary": "1-2 sentence description"
  }}
]

If no meaningful signals exist, return an empty array: []"""
    try:
        response = await client.messages.create(
            model=MODEL,
            max_tokens=2000,
            messages=[{"role": "user", "content": prompt}]
        )
        raw = response.content[0].text.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        result = json.loads(raw.strip())
        return result if isinstance(result, list) else []
    except Exception as e:
        logger.error(f"Signal detection error for {company_name}: {e}")
        return []


async def classify_batch(companies: list[dict], firm) -> list[dict]:
    """Scoring-only batch: 20 companies per call. Returns id, fit_score, ai_score, one_liner, sector, mandate_category, thesis_tags, funding_stage, business_model, target_customer, name."""
    if not companies:
        return []
    firm_context = _build_firm_context(firm)
    scoring_guide = _build_scoring_guide(firm)
    mandate_category_guide = _build_mandate_category_guide(firm)

    companies_block = "\n\n".join(
        f"{i + 1}. ID: {c.get('id')}\n   Name: {c.get('name', '')}\n   Description: {c.get('description', '')}\n   Website: {c.get('website') or 'Unknown'}\n   Source: {c.get('source', '')}"
        for i, c in enumerate(companies)
    )

    prompt = f"""{firm_context}

When evaluating thesis fit, use April Dunford's positioning lens:
1. Competitive alternatives: What would this company's customers use if this didn't exist?
2. Unique attributes: What does this company have that alternatives don't — be specific, not 'better UX'
3. Value: What outcome does that enable for the customer?
4. Target customer: Who cares most about this value — define by characteristics not demographics
5. Market category: Is this (a) a better version of an existing category, (b) an existing category with a qualifier, or (c) a genuinely new category?

Use this analysis to inform fit_score. Do not output the framework explicitly — synthesize it into your scoring.

{scoring_guide}

IMPORTANT: The 'name' field must be the actual company name only — never a description, headline, or article title. If the input name looks like a headline (e.g. 'Chinese brain interface startup Gestala'), extract just the company name ('Gestala'). If the name contains words like 'startup', 'raises', 'launches', 'announces', 'funding', or descriptive phrases, clean it to just the brand/company name. If you cannot determine a clean company name, set name to null.

SECTOR: For every company, assign exactly one sector from this fixed list — do not invent new labels:
{SECTOR_TAXONOMY_STR}
Pick the single best match. If none fit well, use "Other".

MANDATE CATEGORY: {mandate_category_guide}

COMPANIES TO EVALUATE (score each one). Return ONLY these fields per company:

{companies_block}

Per company, output only:
- id (integer, must match the input ID)
- fit_score (1-5)
- ai_score (1-5)
- one_liner ("We help [customer] [solve problem] by [mechanism]" — max 15 words)
- sector (exactly one value from the fixed sector list above)
- mandate_category (firm's own thesis bucket label, or null)
- thesis_tags (array of strings, max 4)
- funding_stage (pre-seed | seed | series-a | series-b | unknown)
- business_model (one sentence)
- target_customer (one sentence)
- name (actual company name only, or null if input is a headline/description and you cannot extract a clean name)

Respond with ONLY a JSON array of objects, one per company, in the same order as the list above. No markdown.
Example:
[
  {{ "id": 1, "fit_score": 4, "ai_score": 5, "one_liner": "We help ...", "sector": "Enterprise SaaS", "mandate_category": "AI for Work", "thesis_tags": ["AI", "B2B"], "funding_stage": "seed", "business_model": "SaaS per seat.", "target_customer": "Mid-size law firms.", "name": "CompanyName" }},
  ...
]"""
    try:
        response = await client.messages.create(
            model=MODEL,
            max_tokens=4000,
            messages=[{"role": "user", "content": prompt}]
        )
        raw = response.content[0].text.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        result = json.loads(raw.strip())
        if not isinstance(result, list):
            logger.error("classify_batch: response was not a JSON array")
            return []
        return result
    except json.JSONDecodeError as e:
        logger.error(f"classify_batch JSON parse error: {e}")
        return []
    except Exception as e:
        logger.error(f"classify_batch error: {e}", exc_info=True)
        return []
