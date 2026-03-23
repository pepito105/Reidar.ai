import json
import logging
from typing import Optional
from anthropic import AsyncAnthropic
from openai import AsyncOpenAI
from app.core.config import settings

logger = logging.getLogger(__name__)
client = AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
openai_client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)


async def generate_embedding(text: str) -> list[float] | None:
    """Generate a 1536-dim embedding using text-embedding-3-small."""
    try:
        text = text.strip().replace("\n", " ")[:8000]
        response = await openai_client.embeddings.create(
            model="text-embedding-3-small",
            input=text,
        )
        return response.data[0].embedding
    except Exception as e:
        logger.warning(f"Embedding generation failed: {e}")
        return None


MODEL = "claude-haiku-4-5-20251001"

# Fields that belong on the global Company record — factual, mandate-agnostic.
# Callers use these to split classifier output when writing to the two-layer schema.
GLOBAL_FIELDS = [
    "one_liner", "enriched_one_liner", "ai_summary", "founding_year",
    "funding_stage", "funding_amount_usd", "top_investors", "team_size",
    "sector", "business_model", "target_customer", "notable_traction",
    "traction_signals", "website_content", "sources_visited",
]

# Fields that belong on FirmCompanyScore — mandate-specific, per-tenant.
FIRM_FIELDS = [
    "fit_score", "fit_reasoning", "thesis_tags", "mandate_category",
    "recommended_next_step", "comparable_companies", "key_risks",
    "bull_case", "red_flags",
]

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


def _build_scoring_guide_deep(firm) -> str:
    """Scoring guide for classify_startup (deep research — full data available)."""
    if not firm or not _has_meaningful_thesis(firm):
        return """SCORING MODE: Quality-based (no thesis filter)
Score companies purely on objective quality signals:

fit_score (1-5) — overall company quality:
  5 = Exceptional — strong founder signal, large clear market, differentiated product with evidence of early traction
  4 = Strong — compelling product, good market, solid team indicators
  3 = Interesting — promising but early or incomplete signal
  2 = Weak — generic product, crowded market, low differentiation
  1 = Poor — no clear value proposition or outside any reasonable investment scope

Score generously — use the full 1-5 range. A truly exceptional company should score 5."""
    else:
        return f"""SCORING MODE: Thesis-fit (firm has a defined mandate)
The firm thesis is: {firm.investment_thesis}

Score companies on how well they match this specific thesis AND their quality:

fit_score (1-5) — thesis fit + quality combined:
  5 = PERFECT MATCH — directly addresses the thesis, strong founder story, compelling product. Give 5 freely to companies that clearly fit.
  4 = STRONG FIT — meets most thesis criteria, one element missing or unclear
  3 = POSSIBLE FIT — relevant sector or adjacent, worth monitoring
  2 = WEAK FIT — tangentially related but missing key thesis criteria
  1 = NO FIT — clearly outside thesis or in excluded sectors

IMPORTANT: Be generous. If a company clearly addresses the firm's thesis with strong founder signal and market evidence — that is a 5. Do not anchor on 3 or 4. Use the full range."""


def _build_scoring_guide_batch(firm) -> str:
    """Scoring guide for classify_batch (surface data only — description and homepage excerpt)."""
    if not firm or not _has_meaningful_thesis(firm):
        return """SCORING MODE: Quality-based (no thesis filter)
Score companies purely on objective quality signals:

fit_score (1-5) — overall company quality:
  5 = Exceptional — strong founder signal, large clear market, differentiated product with evidence of early traction
  4 = Strong — compelling product, good market, solid team indicators
  3 = Interesting — promising but early or incomplete signal
  2 = Weak — generic product, crowded market, low differentiation
  1 = Poor — no clear value proposition or outside any reasonable investment scope

Score generously — use the full 1-5 range. A truly exceptional company should score 5."""
    else:
        return f"""SCORING MODE: Thesis-fit (firm has a defined mandate)
The firm thesis is: {firm.investment_thesis}

Score companies on how well they match this specific thesis AND their quality:

fit_score (1-5) — thesis fit + quality combined:
  5 = PERFECT MATCH — directly addresses every element of the thesis, clear technical founder, specific wedge, evidence of early traction. Reserve for genuinely exceptional fits.
  4 = STRONG FIT — meets most thesis criteria, one element missing or unclear
  3 = POSSIBLE FIT — relevant sector or adjacent, worth monitoring
  2 = WEAK FIT — tangentially related but missing key thesis criteria
  1 = NO FIT — clearly outside thesis or in excluded sectors

IMPORTANT: You are scoring from limited surface data — a description and homepage excerpt only. When in doubt, score conservatively. A 4 means this company looks strong enough to warrant deep research. A 5 should be rare — only when every thesis criterion is clearly met from surface data alone. Most companies should score 2 or 3."""


async def classify_startup(name: str, description: str, website: Optional[str], source: str, firm, custom_focus: str = None) -> dict:
    firm_context = _build_firm_context(firm)
    mandate_category_guide = _build_mandate_category_guide(firm)
    scoring_guide = _build_scoring_guide_deep(firm)
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

{scoring_guide}

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

Respond with ONLY a JSON object, no markdown:
{{
  "name": "actual company name only, or null if input is a headline/description and you cannot extract a clean name",
  "one_liner": "We help [customer] [solve problem] by [mechanism]",
  "ai_summary": "2-3 sentence investment overview",
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
    progress_callback=None,
) -> dict:
    """
    Deep investment research using two-step approach:
    Step 1 — Claude + web search: research freely, return prose findings.
    Step 2 — Claude (no tools): structure findings into JSON.
    """
    from anthropic import AsyncAnthropic
    research_client = AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)

    firm_context = _build_firm_context(firm)
    mandate_category_guide = _build_mandate_category_guide(firm)

    # Build portfolio/pipeline context
    portfolio_context = ""
    pipeline_context = ""
    if db and firm:
        try:
            from sqlalchemy import select
            from app.models.company import Company
            from app.models.firm_company_score import FirmCompanyScore
            port_result = await db.execute(
                select(Company.name, Company.sector, Company.one_liner)
                .join(FirmCompanyScore, FirmCompanyScore.company_id == Company.id)
                .where(FirmCompanyScore.user_id == firm.user_id)
                .where(FirmCompanyScore.is_portfolio == True)
                .limit(20)
            )
            portfolio_cos = port_result.fetchall()
            if portfolio_cos:
                portfolio_context = "PORTFOLIO COMPANIES (check for conflicts):\n" + \
                    "\n".join([f"- {c[0]}: {c[2] or c[1]}" for c in portfolio_cos])

            pipe_result = await db.execute(
                select(Company.name, FirmCompanyScore.pipeline_status, FirmCompanyScore.fit_score)
                .join(FirmCompanyScore, FirmCompanyScore.company_id == Company.id)
                .where(FirmCompanyScore.user_id == firm.user_id)
                .where(FirmCompanyScore.pipeline_status.in_(["watching", "outreach", "diligence"]))
                .limit(15)
            )
            pipe_cos = pipe_result.fetchall()
            if pipe_cos:
                pipeline_context = "PIPELINE (currently tracking):\n" + \
                    "\n".join([f"- {c[0]} ({c[1]}, fit {c[2]}/5)" for c in pipe_cos])
        except Exception as e:
            logger.warning(f"Could not load portfolio/pipeline context: {e}")

    focus_line = f"\nANALYST FOCUS: {custom_focus}\nMake sure your research directly addresses this question.\n" if custom_focus else ""

    # ── STEP 1: Research ─────────────────────────────────────────────────────────
    research_findings = ""
    sources_visited = []
    homepage_content = None

    if progress_callback:
        await progress_callback(f"🌐 Visiting {website or name} and searching the web...")

    if settings.BRAVE_API_KEY:
        # Use Brave Search + Firecrawl pipeline (real URLs, full page content)
        from app.services.research_service import research_with_brave_and_firecrawl

        # Generate search queries with Claude
        query_prompt = f"""Generate 5 search queries to research this startup for a VC investment decision.
Company: {name}
Description: {description}
Website: {website or 'unknown'}

Return ONLY a JSON array of 5 strings. Example: ["query1", "query2", "query3", "query4", "query5"]
Cover: product/market fit, traction/revenue, team background, funding history, competition."""

        query_response = await research_client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=500,
            messages=[{"role": "user", "content": query_prompt}]
        )
        raw_queries = query_response.content[0].text.strip()
        if raw_queries.startswith("```"):
            raw_queries = raw_queries.split("```")[1]
            if raw_queries.startswith("json"):
                raw_queries = raw_queries[4:]
        try:
            queries = json.loads(raw_queries.strip())
        except Exception:
            queries = [f"{name} startup", f"{name} funding", f"{name} revenue customers"]

        research_findings, sources_visited, homepage_content = await research_with_brave_and_firecrawl(
            name=name,
            description=description,
            website=website,
            queries=queries,
            progress_callback=progress_callback,
        )
        logger.info(f"Brave+Firecrawl research complete for {name}. Sources: {len(sources_visited)}")

    else:
        # Fallback: use Anthropic web_search tool
        research_prompt = f"""You are a senior investment analyst. Research this startup thoroughly for a VC firm.
{firm_context}
{portfolio_context}
{pipeline_context}
{focus_line}
COMPANY: {name}
Description: {description}
Website: {website or "Unknown — search for it"}
Write your findings as a detailed research report. End with all URLs visited."""

        try:
            step1_response = await research_client.messages.create(
                model="claude-sonnet-4-6",
                max_tokens=4000,
                tools=[{"type": "web_search_20250305", "name": "web_search", "max_uses": 6}],
                messages=[{"role": "user", "content": research_prompt}]
            )
            text_parts = []
            for block in step1_response.content:
                if hasattr(block, "text") and block.text and block.text.strip():
                    text_parts.append(block.text.strip())
                if hasattr(block, "type") and block.type == "tool_use" and hasattr(block, "input"):
                    query = block.input.get("query", "")
                    if query:
                        sources_visited.append(f"search: {query}")
            research_findings = "\n\n".join(text_parts)
            logger.info(f"Fallback web search complete for {name}. Found {len(text_parts)} text blocks")
            if progress_callback:
                await progress_callback(f"📰 Web research complete. Structuring investment brief...")
        except Exception as e:
            logger.error(f"Step 1 research error for {name}: {e}", exc_info=True)
            research_findings = f"Web research failed. Known info: {description}"

    if not research_findings.strip():
        research_findings = f"Could not retrieve additional research. Known info: {description}"

    # ── STEP 2: Structure findings into JSON ──────────────────────────────────
    structure_prompt = f"""You are a senior investment analyst. Based on research findings below, produce a structured investment brief.

{firm_context}

COMPANY: {name}
RESEARCH FINDINGS:
{research_findings}

{focus_line}

Now structure these findings into a JSON investment brief.

SCORING GUIDE:
fit_score (1-5) — thesis fit + quality:
  5 = Perfect match — directly addresses the thesis, AI-native, strong founder story
  4 = Strong fit — meets most thesis criteria
  3 = Possible fit — relevant sector, worth monitoring
  2 = Weak fit — tangentially related
  1 = No fit — clearly outside thesis or excluded sector

SECTOR: Must be exactly one from: {SECTOR_TAXONOMY_STR}

MANDATE CATEGORY: {mandate_category_guide}

FIT REASONING: Structure fit_reasoning as a JSON object with five keys: team, traction, market, stage_and_check, thesis_fit. Each key maps to an array of {{point, confidence}} objects. Each point should be one specific finding. Confidence is High, Medium, or Low.

RECOMMENDED NEXT STEP:
- fit 4-5: "Request intro via [path]. Conviction: [one sentence]."
- fit 3: "Monitor 60 days. Watch for: [Signal 1] and [Signal 2]."
- fit 1-2: "Pass — [specific reason tied to mandate]."

KEY RISKS: Max 4. Each: "[risk] — Likelihood: H/M/L, Impact: Critical/Major/Moderate/Minor"

BULL CASE: Max 2. Each: "If [specific assumption] proves true, then [specific outcome]."

Respond with ONLY a JSON object, no markdown, no backticks:
{{
  "name": "clean company name only",
  "one_liner": "We help [customer] [solve problem] by [mechanism]",
  "enriched_one_liner": "2-sentence description from actual research",
  "ai_summary": "3-4 sentence investment overview with specific findings",
  "fit_score": <integer 1-5>,
  "fit_reasoning": {{
    "team": [{{"point": "finding about founders, team background, founder-market fit", "confidence": "High|Medium|Low"}}],
    "traction": [{{"point": "finding about revenue, growth, customers, retention", "confidence": "High|Medium|Low"}}],
    "market": [{{"point": "finding about market size, timing, vitamin vs painkiller", "confidence": "High|Medium|Low"}}],
    "stage_and_check": [{{"point": "finding about funding stage, round size, entry window", "confidence": "High|Medium|Low"}}],
    "thesis_fit": [{{"point": "finding about mandate alignment, sector, geography, excluded sectors", "confidence": "High|Medium|Low"}}]
  }},
  "business_model": "how they make money — specific from research",
  "target_customer": "specific job title or company type",
  "sector": "exactly one from the fixed list",
  "mandate_category": "firm thesis bucket or null",
  "thesis_tags": ["tag1", "tag2", "tag3"],
  "traction_signals": "specific traction evidence with sources",
  "notable_traction": "single most concrete traction signal found: a revenue number, ARR, user count, named customer, LOI, or waitlist size with source. One sentence max. Null if nothing concrete found.",
  "red_flags": "specific concerns found, or null if none",
  "recommended_next_step": "single clear action",
  "funding_stage": "pre-seed or seed or series-a or series-b or unknown",
  "founding_year": <integer e.g. 2021, or null — extract from About page, Crunchbase snippets, press mentions, or copyright dates>,
  "funding_amount_usd": <total funding raised in USD as integer e.g. 5000000, or null — extract from funding announcements, Crunchbase, or press; convert M/K shorthand to full integer>,
  "top_investors": ["investor or fund name", ...] — extract named investors and funds from funding announcements, press, or About page; empty array if none found,
  "team_size": <approximate employee count as integer e.g. 12, or null — extract from LinkedIn mentions, About page headcount statements, or press; null if not found>,
  "key_risks": "up to 4 risks with likelihood and impact",
  "bull_case": "up to 2 if/then statements",
  "comparable_companies": [
    {{
      "name": "Company name",
      "one_liner": "what they do",
      "fit_score": <1-5>,
      "differentiation": "how this company differs",
      "reason_investor_might_prefer": "one reason to prefer this over the comparable"
    }}
  ],
  "sources_visited": {json.dumps(sources_visited)}
}}"""

    try:
        step2_response = await research_client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=6000,
            messages=[{"role": "user", "content": structure_prompt}]
        )

        raw = step2_response.content[0].text.strip()
        # Strip markdown fences if present
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        raw = raw.strip()

        if not raw:
            raise ValueError(f"Step 2 returned empty response for {name}")

        result = json.loads(raw)
        result["research_status"] = "complete"

        if progress_callback:
            await progress_callback(f"✅ Research complete — fit score: {result.get('fit_score')}/5")

        # Merge in sources from step 1 if Claude didn't include them
        if not result.get("sources_visited") and sources_visited:
            result["sources_visited"] = sources_visited

        if homepage_content and not result.get("website_content"):
            result["website_content"] = homepage_content[:10000]

        logger.info(f"Research complete for {name}. fit_score={result.get('fit_score')}")
        return result

    except Exception as e:
        logger.error(f"Step 2 structuring error for {name}: {e}", exc_info=True)
        return {}


async def detect_signals(
    company_name: str,
    one_liner: str,
    website: Optional[str],
    funding_stage: Optional[str],
    company_id=None,
    db=None,
) -> list:
    """
    Detect real signals for a pipeline company using Brave Search +
    Firecrawl. Falls back to empty list if Brave is not configured.
    Never fabricates signals.
    """
    from app.services.research_service import brave_search, firecrawl_scrape
    from urllib.parse import urlparse

    if not settings.BRAVE_API_KEY:
        logger.warning(f"No BRAVE_API_KEY — skipping signal detection for {company_name}")
        return []

    # Extract bare domain for post-fetch filtering (e.g. "dianaHR.com")
    domain = ""
    if website:
        try:
            domain = urlparse(website).netloc.lower().lstrip("www.")
        except Exception:
            pass

    # Search for recent news — exact company name match via quotes
    queries = [
        f'"{company_name}" funding round 2025 2026',
        f'"{company_name}" product launch news',
        f'"{company_name}" startup announcement',
    ]

    all_results = []
    for query in queries:
        results = await brave_search(query, count=3, freshness="pw")
        all_results.extend(results)

    if not all_results:
        logger.info(f"No search results for {company_name} — no signals generated")
        return []

    # Deduplicate URLs within this run
    seen_urls = set()
    unique_results = []
    for r in all_results:
        if r["url"] not in seen_urls:
            seen_urls.add(r["url"])
            unique_results.append(r)

    # Relevance filter: drop results that don't mention the company
    name_lower = company_name.lower()
    relevant_results = []
    for r in unique_results:
        url_matches = domain and domain in r["url"].lower()
        text_matches = (
            name_lower in r.get("title", "").lower()
            or name_lower in r.get("description", "").lower()
        )
        if url_matches or text_matches:
            relevant_results.append(r)
        else:
            logger.info(
                f"Dropping signal result — does not match company {company_name}: {r['url']}"
            )
    unique_results = relevant_results

    # URL dedup against DB: skip URLs already saved for this company
    if db is not None and company_id is not None:
        from sqlalchemy import select
        from app.models.signal import CompanySignal
        filtered_results = []
        for r in unique_results:
            try:
                existing = await db.execute(
                    select(CompanySignal.id)
                    .where(CompanySignal.source_url == r["url"])
                    .where(CompanySignal.company_id == company_id)
                    .limit(1)
                )
                if existing.scalars().first() is not None:
                    logger.info(
                        f"Skipping signal — URL already saved for {company_name}: {r['url']}"
                    )
                else:
                    filtered_results.append(r)
            except Exception as e:
                logger.warning(f"URL dedup check failed for {company_name}: {e}")
                filtered_results.append(r)
        unique_results = filtered_results

    # Scrape top 3 results for full content
    scraped = []
    for r in unique_results[:3]:
        content = await firecrawl_scrape(r["url"], max_length=2000)
        if content:
            scraped.append(f"URL: {r['url']}\nTITLE: {r['title']}\n{content}")
        else:
            # Fall back to search snippet if scrape fails
            scraped.append(f"URL: {r['url']}\nTITLE: {r['title']}\n{r['description']}")

    if not scraped:
        return []

    # Ask Claude to extract real signal events from the content
    combined = "\n\n---\n\n".join(scraped)
    prompt = f"""You are a VC analyst reviewing recent news about a portfolio company.

COMPANY: {company_name}
DESCRIPTION: {one_liner or 'No description'}
FUNDING STAGE: {funding_stage or 'Unknown'}

RECENT WEB CONTENT:
{combined}

Extract real signal events from the content above. Only include events
that actually appear in the content — do not invent or infer signals.

Signal types:
- funding_round: raised money, closed round, new investors
- product_launch: new product, feature, or major update shipped
- headcount_growth: hiring, team expansion, new office
- news_mention: press coverage, awards, partnerships
- leadership_change: new executives, founders leaving/joining
- traction_update: revenue milestone, customer announcement, growth metric

For each real signal found, include the source_url where it was found.

Respond with ONLY a JSON array. If no real signals are found, return [].

[
  {{
    "signal_type": "one of the types above",
    "title": "short headline max 80 chars — use the actual news headline",
    "summary": "1-2 sentences describing what happened, grounded in the content",
    "source_url": "the URL where this signal was found"
  }}
]"""

    try:
        response = await client.messages.create(
            model=MODEL,
            max_tokens=1000,
            messages=[{"role": "user", "content": prompt}]
        )
        raw = response.content[0].text.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        result = json.loads(raw.strip())
        signals = result if isinstance(result, list) else []
        logger.info(f"Signal detection for {company_name}: {len(signals)} real signals found")

        if not signals:
            return []

        # Deduplicate against existing signals in the database
        if db is not None:
            try:
                from sqlalchemy import select
                from app.models.firm_company_score import FirmCompanyScore as Startup
                from app.models.signal import CompanySignal

                from app.models.company import Company
                existing_result = await db.execute(
                    select(CompanySignal.title)
                    .join(Company, CompanySignal.company_id == Company.id)
                    .where(Company.name == company_name)
                )
                existing_titles = {row[0].lower() for row in existing_result.fetchall()}

                signals = [
                    s for s in signals
                    if s.get("title", "").lower() not in existing_titles
                ]
                logger.info(
                    f"After deduplication: {len(signals)} new signals for {company_name}"
                )
            except Exception as e:
                logger.warning(f"Deduplication check failed for {company_name}: {e}")

        return signals
    except Exception as e:
        logger.error(f"Signal detection error for {company_name}: {e}")
        return []


async def classify_batch(companies: list[dict], firm) -> list[dict]:
    """Scoring-only batch: 20 companies per call. Returns id, fit_score, one_liner, sector, mandate_category, thesis_tags, funding_stage, business_model, target_customer, name."""
    if not companies:
        return []
    firm_context = _build_firm_context(firm)
    scoring_guide = _build_scoring_guide_batch(firm)
    mandate_category_guide = _build_mandate_category_guide(firm)

    def _company_block(i: int, c: dict) -> str:
        parts = [
            f"{i + 1}. ID: {c.get('id')}",
            f"   Name: {c.get('name', '')}",
            f"   Description: {c.get('description', '')}",
            f"   Website: {c.get('website') or 'Unknown'}",
            f"   Source: {c.get('source', '')}",
        ]
        wc = c.get("website_content")
        if wc:
            parts.append(f"   Website Content (excerpt): {wc[:1000]}")
        return "\n".join(parts)

    companies_block = "\n\n".join(
        _company_block(i, c) for i, c in enumerate(companies)
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
  {{ "id": 1, "fit_score": 4, "one_liner": "We help ...", "sector": "Enterprise SaaS", "mandate_category": "AI for Work", "thesis_tags": ["AI", "B2B"], "funding_stage": "seed", "business_model": "SaaS per seat.", "target_customer": "Mid-size law firms.", "name": "CompanyName" }},
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
