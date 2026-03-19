import logging
import asyncio
import json
import re
import uuid as _uuid_mod
from datetime import datetime
from typing import List, Optional, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from anthropic import AsyncAnthropic
from app.core.config import settings
from app.models.company import Company
from app.models.firm_company_score import FirmCompanyScore
from app.models.firm_profile import FirmProfile
from app.models.sourcing_history import SourcingHistory

logger = logging.getLogger(__name__)
client = AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)


# ── Slug helpers ─────────────────────────────────────────────────────────────

def _slugify(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", (name or "").lower()).strip("-")[:80]


def _make_global_slug(name: str) -> str:
    """Global (company-level) slug — no user_id suffix. Falls back to UUID suffix on collision."""
    return _slugify(name)


def _normalize_domain(url: str) -> Optional[str]:
    try:
        from urllib.parse import urlparse
        domain = urlparse(url).netloc.lower().replace("www.", "")
        return domain if domain else None
    except Exception:
        return None


def _normalize_name(s: str) -> str:
    if not s:
        return ""
    s = s.lower().strip()
    s = re.sub(r"\b(inc|llc|ltd|corp|co|technologies|labs|ai|hq)\b", "", s)
    s = re.sub(r"\s+", " ", s).strip()
    return s


# Domains that should never appear as a company's own website
_NEWS_SAVE_DOMAINS = {
    'techcrunch.com', 'venturebeat.com', 'forbes.com', 'wired.com',
    'businessinsider.com', 'reuters.com', 'bloomberg.com', 'wsj.com',
    'ft.com', 'axios.com', 'theinformation.com', 'crunchbase.com',
    'linkedin.com', 'twitter.com', 'x.com', 'youtube.com',
    'medium.com', 'substack.com', 'pitchbook.com', 'tracxn.com',
    'producthunt.com', 'ycombinator.com', 'news.ycombinator.com',
    'github.com', 'angellist.com', 'wellfound.com',
}


def _is_news_domain(url: str) -> bool:
    try:
        from urllib.parse import urlparse
        domain = urlparse(url).netloc.lower().replace("www.", "")
        return any(domain == nd or domain.endswith('.' + nd) for nd in _NEWS_SAVE_DOMAINS)
    except Exception:
        return False


# ── Two-layer deduplication helpers ─────────────────────────────────────────

async def _find_global_company(website: str, name: str, db: AsyncSession) -> Optional[Company]:
    """
    Check the global companies table.
    Returns the existing Company if found by domain or normalized name, else None.
    """
    if website:
        domain = _normalize_domain(website)
        if domain:
            result = await db.execute(
                select(Company).where(Company.website.ilike(f"%{domain}%")).limit(1)
            )
            existing = result.scalar_one_or_none()
            if existing:
                logger.debug(f"_find_global_company: domain match for '{name}' → {existing.id}")
                return existing

    if name:
        norm = _normalize_name(name)
        if len(norm) < 3:
            return None
        # Scoped name search instead of full table scan
        result = await db.execute(
            select(Company).where(Company.name.ilike(f"%{norm}%")).limit(20)
        )
        for company in result.scalars().all():
            if company.name and _normalize_name(company.name) == norm:
                logger.debug(f"_find_global_company: name match for '{name}' → {company.id}")
                return company

    return None


async def _firm_already_scored(company_id, user_id: str, db: AsyncSession) -> bool:
    """Return True if this firm already has a FirmCompanyScore row for this company."""
    result = await db.execute(
        select(FirmCompanyScore)
        .where(FirmCompanyScore.company_id == company_id)
        .where(FirmCompanyScore.user_id == user_id)
        .limit(1)
    )
    return result.scalar_one_or_none() is not None


async def is_duplicate(website: str, name: str, db: AsyncSession, user_id: Optional[str] = None) -> bool:
    """
    Legacy compatibility shim used by signals.py route.
    Checks the global companies table for website/name match,
    then (if user_id given) checks whether this firm has already scored it.
    Returns True if this firm should skip the company entirely.
    """
    company = await _find_global_company(website, name, db)
    if company is None:
        return False
    if user_id is None:
        return True
    return await _firm_already_scored(company.id, user_id, db)


# ── Query generation (unchanged prompts) ─────────────────────────────────────

async def generate_search_queries(thesis: str, firm_name: str, firm_website: str = None, firm_context: dict = None, custom_brief: str = None, count: int = 3) -> List[str]:
    website_line = f"FIRM WEBSITE: {firm_website}" if firm_website else ""
    portfolio_line = f'PORTFOLIO COMPANIES (already invested — do not source these): {", ".join(firm_context.get("portfolio_companies") or [])}' if firm_context and firm_context.get("portfolio_companies") else ""
    themes_line = f'INVESTMENT THEMES: {", ".join(firm_context.get("investment_themes") or [])}' if firm_context and firm_context.get("investment_themes") else ""
    custom_line = f"CUSTOM SEARCH BRIEF: {custom_brief}" if custom_brief else ""
    optional_lines = "\n".join(line for line in [website_line, portfolio_line, themes_line, custom_line] if line)

    prompt = f"""You are searching Brave for startup homepages. Generate {count} short, specific search queries.

FIRM: {firm_name}
INVESTMENT THESIS: {thesis}
{optional_lines}

RULES — read carefully:
1. Each query must be 3-6 words maximum. No exceptions.
2. Think like someone typing into a search bar to find ONE specific startup's website — not summarizing a thesis.
3. Each query must target a DIFFERENT niche, product type, or customer from the thesis. Do not repeat similar angles.
4. Use words that would appear on a startup's own homepage (product terms, customer terms), not investor language.
5. Never include: "best", "top", "leading", "innovative", "platform", "solution", "technology"

GOOD queries (short, specific, varied angles):
- "AI contract review law firms"
- "HR workflow copilot seed 2025"
- "field service operations AI"
- "legal due diligence automation"
- "vertical SaaS compliance pre-seed"

BAD queries (too long, thesis-summary style):
- "AI workflow automation B2B software legal finance seed stage startup"
- "startup automating enterprise knowledge work for legal and finance teams"
- "LegalTech AI automation compliance workflow management funding 2025"

Return ONLY a valid JSON array of exactly {count} strings, nothing else.
Example: ["AI contract review law firms", "HR copilot seed 2025", "field ops automation startup"]"""

    try:
        response = await client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=500,
            messages=[{"role": "user", "content": prompt}]
        )
        raw = response.content[0].text.strip()
        raw = re.sub(r'^```(?:json)?\s*', '', raw)
        raw = re.sub(r'\s*```$', '', raw)
        queries = json.loads(raw.strip())
        logger.info(f"Generated {len(queries)} search queries for {firm_name}")
        return queries[:count]
    except Exception as e:
        logger.error(f"Failed to generate search queries: {e}")
        if thesis and len(thesis.strip().split()) >= 4:
            snippet = thesis.strip()[:60]
            return [
                f"{snippet} startup 2025",
                f"{snippet} seed stage founders",
                f"{snippet} startup funding 2026",
            ]
        return [
            "early stage startup seed 2025",
            "new startup founder pre-seed 2025",
            "startup funding announcement 2026",
        ]


async def _build_sourcing_context(
    db: AsyncSession,
    user_id: str,
    profile: FirmProfile,
) -> dict:
    """
    Gather rich platform context for nightly query generation.
    Returns a dict with pipeline state, coverage gaps, history quality,
    and anonymised market signals from across all tenants.
    """
    from sqlalchemy import select as sa_select, func
    from datetime import datetime as _dt, timedelta as _td

    now = _dt.utcnow()
    fourteen_days_ago = now - _td(days=14)
    seven_days_ago = now - _td(days=7)
    thirty_days_ago = now - _td(days=30)

    # Pipeline summary: count per status
    pipeline_result = await db.execute(
        sa_select(FirmCompanyScore.pipeline_status, func.count(FirmCompanyScore.id).label("cnt"))
        .where(FirmCompanyScore.user_id == user_id)
        .group_by(FirmCompanyScore.pipeline_status)
    )
    pipeline_summary = {row.pipeline_status: row.cnt for row in pipeline_result.all()}

    # Top 5 sectors by company count (most-covered, high to low)
    sector_result = await db.execute(
        sa_select(Company.sector, func.count(Company.id).label("cnt"))
        .join(FirmCompanyScore, FirmCompanyScore.company_id == Company.id)
        .where(FirmCompanyScore.user_id == user_id)
        .where(Company.sector.isnot(None))
        .group_by(Company.sector)
        .order_by(func.count(Company.id).desc())
        .limit(5)
    )
    top_sectors = [(row.sector, row.cnt) for row in sector_result.all()]

    # Mandate category coverage (ascending = thinnest areas first)
    mandate_result = await db.execute(
        sa_select(FirmCompanyScore.mandate_category, func.count(FirmCompanyScore.id).label("cnt"))
        .where(FirmCompanyScore.user_id == user_id)
        .where(FirmCompanyScore.mandate_category.isnot(None))
        .where(FirmCompanyScore.mandate_category != "")
        .group_by(FirmCompanyScore.mandate_category)
        .order_by(func.count(FirmCompanyScore.id).asc())
    )
    mandate_coverage = [(row.mandate_category, row.cnt) for row in mandate_result.all()]

    # Recent high-fit companies (last 14 days, fit >= 4) — "what good looks like"
    recent_hf_result = await db.execute(
        sa_select(Company.name, Company.one_liner, FirmCompanyScore.fit_score)
        .join(FirmCompanyScore, FirmCompanyScore.company_id == Company.id)
        .where(FirmCompanyScore.user_id == user_id)
        .where(FirmCompanyScore.fit_score >= 4)
        .where(FirmCompanyScore.created_at >= fourteen_days_ago)
        .order_by(FirmCompanyScore.fit_score.desc())
        .limit(10)
    )
    recent_high_fit = [
        {"name": row.name, "one_liner": row.one_liner or "", "fit_score": row.fit_score}
        for row in recent_hf_result.all()
    ]

    # Portfolio names to exclude from sourcing
    portfolio_result = await db.execute(
        sa_select(Company.name)
        .join(FirmCompanyScore, FirmCompanyScore.company_id == Company.id)
        .where(FirmCompanyScore.user_id == user_id)
        .where(FirmCompanyScore.is_portfolio == True)
        .limit(100)
    )
    portfolio_names = [row[0] for row in portfolio_result.all() if row[0]]

    # Sourcing history quality — last 30 days
    history_result = await db.execute(
        sa_select(
            SourcingHistory.query,
            SourcingHistory.quality_score,
            SourcingHistory.results_count,
            SourcingHistory.ran_at,
        )
        .where(SourcingHistory.user_id == user_id)
        .where(SourcingHistory.ran_at >= thirty_days_ago)
        .order_by(SourcingHistory.ran_at.desc())
        .limit(60)
    )
    history_rows = history_result.all()

    high_performing_queries = [
        row.query for row in history_rows
        if row.quality_score is not None and row.quality_score >= 0.6
    ][:10]
    low_performing_queries = [
        row.query for row in history_rows
        if row.quality_score is not None and row.quality_score < 0.2 and (row.results_count or 0) > 0
    ][:10]
    recent_queries = [
        row.query for row in history_rows
        if row.ran_at >= seven_days_ago
    ][:20]

    # Trending sectors globally — sectors moving to diligence most in last 14 days
    # (anonymised: no firm or company identifiers returned)
    trending_result = await db.execute(
        sa_select(Company.sector, func.count(FirmCompanyScore.id).label("cnt"))
        .join(FirmCompanyScore, FirmCompanyScore.company_id == Company.id)
        .where(FirmCompanyScore.pipeline_status == "diligence")
        .where(FirmCompanyScore.updated_at >= fourteen_days_ago)
        .where(Company.sector.isnot(None))
        .group_by(Company.sector)
        .order_by(func.count(FirmCompanyScore.id).desc())
        .limit(5)
    )
    trending_sectors = [row.sector for row in trending_result.all()]

    return {
        "pipeline_summary": pipeline_summary,
        "top_sectors": top_sectors,
        "mandate_coverage": mandate_coverage,
        "recent_high_fit": recent_high_fit,
        "portfolio_names": portfolio_names,
        "high_performing_queries": high_performing_queries,
        "low_performing_queries": low_performing_queries,
        "recent_queries": recent_queries,
        "trending_sectors": trending_sectors,
    }


async def generate_contextual_queries(
    thesis: str, firm_name: str, profile: FirmProfile, db: AsyncSession,
    user_id: Optional[str], firm_website: str = None, count: int = 8
) -> List[str]:
    """
    Nightly query generator. Uses full platform context to generate short,
    specific, non-repetitive queries that cover thin mandate areas first.
    """
    ctx = await _build_sourcing_context(db, user_id, profile)

    # ── Format context blocks ────────────────────────────────────────────────
    firm_themes = (profile.firm_context or {}).get("investment_themes") or []

    recent_block = "\n".join(f"  - {q}" for q in ctx["recent_queries"]) or "  (none yet)"

    top_sectors_block = (
        "\n".join(f"  - {s}: {c} companies" for s, c in ctx["top_sectors"])
        or "  (none yet)"
    )

    thin_mandates = [cat for cat, cnt in ctx["mandate_coverage"] if cnt <= 2]
    thin_block = ", ".join(thin_mandates[:8]) if thin_mandates else "(all covered or no data yet)"

    good_query_block = (
        "\n".join(f"  ✓ {q}" for q in ctx["high_performing_queries"])
        or "  (no history yet)"
    )
    bad_query_block = (
        "\n".join(f"  ✗ {q}" for q in ctx["low_performing_queries"])
        or "  (none)"
    )

    high_fit_block = (
        "\n".join(
            f"  - {c['name']} ({c['fit_score']}/5): {c['one_liner'][:80]}"
            for c in ctx["recent_high_fit"]
        )
        or "  (none yet — we're just getting started)"
    )

    trending_block = ", ".join(ctx["trending_sectors"]) if ctx["trending_sectors"] else "(no data)"

    portfolio_line = (
        f"PORTFOLIO — never source these: {', '.join(ctx['portfolio_names'][:30])}"
        if ctx["portfolio_names"] else ""
    )
    themes_line = (
        f"FIRM INVESTMENT THEMES (from their website): {', '.join(firm_themes)}"
        if firm_themes else ""
    )
    website_line = f"FIRM WEBSITE: {firm_website}" if firm_website else ""

    optional_lines = "\n".join(line for line in [website_line, themes_line, portfolio_line] if line)

    prompt = f"""You are searching Brave for startup homepages. Generate {count} short, specific search queries.

FIRM: {firm_name}
INVESTMENT THESIS: {thesis}
{optional_lines}

═══ PLATFORM CONTEXT ════════════════════════════════════════════════

RECENT QUERIES — last 7 days (do NOT repeat these angles):
{recent_block}

TOP SECTORS ALREADY COVERED (well-represented — explore elsewhere):
{top_sectors_block}

THIN MANDATE AREAS (few matches so far — prioritise these):
{thin_block}

WHAT GOOD LOOKS LIKE — recent high-fit companies found (study these to understand the style):
{high_fit_block}

QUERY STYLES THAT WORKED (high quality score — emulate the format, not the exact topic):
{good_query_block}

QUERY STYLES THAT FLOPPED (low quality score — avoid these patterns):
{bad_query_block}

MARKET MOMENTUM — sectors moving to diligence across all firms (signals of deal flow):
{trending_block}

═══ RULES ══════════════════════════════════════════════════════════

1. KEEP IT SHORT: 3-6 words per query. No exceptions. Think search bar, not thesis.
2. VARY ANGLES: Each of the {count} queries must target a DIFFERENT niche, vertical, or customer type. No two queries should cover the same angle.
3. COVER GAPS: Thin mandate areas and untapped sectors take priority over well-covered ones.
4. LEARN FROM HISTORY: Emulate the format of high-quality queries. Avoid the structure of low-quality ones.
5. STAY FRESH: Do not repeat any angle from the recent queries list above.
6. USE FOUNDER LANGUAGE: Words that appear on a startup's homepage — not investor or analyst jargon.
7. ADD YEAR: Include "2025" or "2026" in at least 2 queries.
8. BANNED WORDS: best, top, leading, innovative, platform, solution, technology, enterprise, B2B, startup (as a suffix)

QUERY FORMAT EXAMPLES:
  BAD  → "AI workflow automation B2B software legal finance HR startup"  (too long, thesis summary)
  BAD  → "AI paralegal document review startup seed stage 2025"          (too long, 8 words)
  GOOD → "AI paralegal document review seed"                              (5 words, specific)
  GOOD → "HR onboarding automation Series A"                             (5 words, specific stage)
  GOOD → "field service AI copilot 2025"                                 (5 words, specific niche)
  GOOD → "accounts payable AI pre-seed"                                  (4 words, specific function)

Return ONLY a valid JSON array of exactly {count} strings, nothing else."""

    try:
        response = await client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=800,
            messages=[{"role": "user", "content": prompt}]
        )
        raw = response.content[0].text.strip()
        raw = re.sub(r'^```(?:json)?\s*', '', raw)
        raw = re.sub(r'\s*```$', '', raw)
        queries = json.loads(raw.strip())
        logger.info(f"Generated {len(queries)} contextual queries for {firm_name}")
        return queries[:count]
    except Exception as e:
        logger.error(f"Failed to generate contextual queries, falling back: {e}")
        return await generate_search_queries(thesis, firm_name, firm_website=firm_website, firm_context=profile.firm_context, count=count)


# ── Web search + extraction (unchanged) ──────────────────────────────────────

async def search_and_extract_companies(query: str, thesis: str, firm_name: str) -> Tuple[List[dict], int, int]:
    """
    Three-step pipeline: Brave Search finds URLs, Firecrawl scrapes
    company homepages, Claude extracts structured company data.
    Falls back to Claude web search if Brave is not configured.
    """
    from app.services.research_service import brave_search, firecrawl_scrape

    # Fallback to Claude web search if no Brave key
    if not settings.BRAVE_API_KEY:
        logger.info("No BRAVE_API_KEY — falling back to Claude web search")
        return await _search_and_extract_claude_fallback(query, thesis, firm_name)

    # Step 1 — Brave Search: find relevant URLs
    results = await brave_search(query, count=8)
    if not results:
        logger.info(f"Brave returned no results for: {query[:60]}")
        return [], 0, 0

    # Step 2 — Filter for company homepages, not news/directories
    NEWS_DOMAINS = {
        'techcrunch.com', 'venturebeat.com', 'forbes.com', 'wired.com',
        'businessinsider.com', 'reuters.com', 'bloomberg.com', 'wsj.com',
        'ft.com', 'axios.com', 'theinformation.com', 'crunchbase.com',
        'linkedin.com', 'twitter.com', 'x.com', 'youtube.com',
        'medium.com', 'substack.com', 'pitchbook.com', 'tracxn.com',
        'producthunt.com', 'ycombinator.com', 'news.ycombinator.com',
        'github.com', 'angellist.com', 'wellfound.com',
    }

    def is_company_url(url: str) -> bool:
        try:
            from urllib.parse import urlparse
            domain = urlparse(url).netloc.lower().replace('www.', '')
            if any(domain == nd or domain.endswith('.' + nd) for nd in NEWS_DOMAINS):
                return False
            path = urlparse(url).path.rstrip('/')
            path_parts = [p for p in path.split('/') if p]
            if len(path_parts) > 2:
                return False
            return True
        except Exception:
            return False

    company_urls = [r for r in results if is_company_url(r['url'])]
    _urls_found = len(company_urls)
    _brave_count = len(results)
    logger.info(f"Query '{query[:50]}' → {_brave_count} results, {_urls_found} company URLs")

    if not company_urls:
        logger.info(f"No company URLs found for: {query[:60]}")
        return [], 0, _brave_count

    # Step 3 — Firecrawl: scrape up to 4 company homepages
    scraped_companies = []
    for result in company_urls[:4]:
        url = result['url']
        content = await firecrawl_scrape(url, max_length=3000)
        if content and len(content.strip()) > 100:
            scraped_companies.append({
                'url': url,
                'title': result.get('title', ''),
                'snippet': result.get('description', ''),
                'content': content,
            })
        else:
            # Use snippet as fallback if scrape fails
            snippet = result.get('description', '')
            if snippet and len(snippet) > 30:
                scraped_companies.append({
                    'url': url,
                    'title': result.get('title', ''),
                    'snippet': snippet,
                    'content': snippet,
                })

    if not scraped_companies:
        return [], _urls_found, _brave_count

    # Step 4 — Claude: extract structured company data from scraped content
    companies_text = ""
    for i, c in enumerate(scraped_companies, 1):
        companies_text += f"""
COMPANY {i}:
URL: {c['url']}
Title: {c['title']}
Content:
{c['content'][:1500]}
---
"""

    prompt = f"""You are a VC analyst at {firm_name} evaluating potential investments.

INVESTMENT THESIS: {thesis}

SEARCH QUERY USED: "{query}"

SCRAPED COMPANY WEBSITES:
{companies_text}

For each company above, extract structured data IF it appears to be a
real startup relevant to the thesis. Skip companies that are:
- News sites, directories, or aggregators
- Large established companies (not startups)
- Not relevant to the investment thesis
- Job boards, consulting firms, agencies

For each relevant startup found, extract:
- name: company name
- website: the company's own homepage URL. IMPORTANT: Only fill this if the URL IS the company's actual homepage (e.g. acme.ai, getacme.com). If the URL is a news article, blog post, press release, or any third-party site about the company, set website to "" (empty string) — never store a news or media URL here.
- source_url: the URL where you found this company (always fill with the "URL:" value from the COMPANY block above)
- one_liner: "We help [customer] [do X] by [mechanism]" — max 20 words
- funding_stage: pre-seed, seed, series-a, series-b, or unknown
- sector: the specific industry vertical
- is_relevant: true if matches thesis, false if not

Respond with ONLY a valid JSON array. If no relevant startups found, return [].

Examples:
Direct homepage: [{{"name": "Acme AI", "website": "https://acme.ai", "source_url": "https://acme.ai", "one_liner": "We help law firms automate contract review with AI", "funding_stage": "seed", "sector": "LegalTech", "is_relevant": true}}]
Found via article: [{{"name": "Acme AI", "website": "", "source_url": "https://techcrunch.com/2025/acme-raises", "one_liner": "We help law firms automate contract review with AI", "funding_stage": "seed", "sector": "LegalTech", "is_relevant": true}}]"""

    try:
        response = await client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=1500,
            messages=[{"role": "user", "content": prompt}]
        )
        raw = response.content[0].text.strip()
        raw = re.sub(r'^```(?:json)?\s*', '', raw)
        raw = re.sub(r'\s*```$', '', raw)
        raw = raw.strip()

        array_match = re.search(r'\[.*\]', raw, re.DOTALL)
        if array_match:
            raw = array_match.group(0)

        companies = json.loads(raw)
        if not isinstance(companies, list):
            return [], _urls_found, _brave_count

        relevant = [c for c in companies if c.get("name") and c.get("is_relevant", True)]
        logger.info(f"Query '{query[:50]}' → {len(relevant)} relevant companies extracted")
        return relevant, _urls_found, _brave_count

    except json.JSONDecodeError as e:
        logger.warning(f"JSON parse error for '{query[:40]}': {e}")
        return [], _urls_found, _brave_count
    except Exception as e:
        logger.error(f"Search error for '{query[:40]}': {e}")
        return [], _urls_found, _brave_count


async def _search_and_extract_claude_fallback(query: str, thesis: str, firm_name: str) -> Tuple[List[dict], int, int]:
    """
    Fallback when Brave API key is not configured.
    Uses Claude's built-in web search tool.
    """
    prompt = f"""You are a VC analyst at {firm_name} finding early-stage startups.

INVESTMENT THESIS: {thesis}

Search the web for: "{query}"

Find real startups (not news articles, job boards, directories, or aggregators).
For each relevant startup found, extract its information.

You MUST respond with ONLY a valid JSON array. No explanation, no markdown, no preamble.
If no startups found, respond with exactly: []

Each item must have these exact fields:
{{"name": "string", "website": "string", "one_liner": "string", "funding_stage": "pre-seed or seed or series-a or unknown", "sector": "string", "is_relevant": true}}"""

    try:
        response = await client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=1500,
            tools=[{"type": "web_search_20250305", "name": "web_search", "max_uses": 2}],
            messages=[{"role": "user", "content": prompt}]
        )
        final_text = ""
        for block in response.content:
            if hasattr(block, 'type') and block.type == "text":
                final_text = block.text
        if not final_text or not final_text.strip():
            return [], 0, 0
        raw = final_text.strip()
        raw = re.sub(r'^```(?:json)?\s*', '', raw)
        raw = re.sub(r'\s*```$', '', raw)
        array_match = re.search(r'\[.*\]', raw, re.DOTALL)
        if array_match:
            raw = array_match.group(0)
        companies = json.loads(raw)
        if not isinstance(companies, list):
            return [], 0, 0
        return [c for c in companies if c.get("name") and c.get("is_relevant", True)], 0, 0
    except Exception as e:
        logger.error(f"Claude fallback search error for '{query[:40]}': {e}")
        return [], 0, 0


# ── Main sourcing entry point ─────────────────────────────────────────────────

async def run_autonomous_sourcing(
    db: AsyncSession,
    custom_brief: str = None,
    limit_per_source: int = 10,
    user_id: Optional[str] = None,
    nightly: bool = False,
) -> dict:
    if user_id is not None:
        profile_result = await db.execute(
            select(FirmProfile).where(FirmProfile.is_active == True).where(FirmProfile.user_id == user_id)
        )
    else:
        profile_result = await db.execute(select(FirmProfile).where(FirmProfile.is_active == True))
    profile = profile_result.scalar_one_or_none()
    if not profile:
        return {"error": "No firm profile configured"}

    firm_name = profile.firm_name
    thesis = custom_brief or profile.investment_thesis
    logger.info(f"Starting autonomous sourcing for {firm_name}")

    query_count = 8 if nightly else 3
    if nightly and not custom_brief:
        queries = await generate_contextual_queries(
            thesis, firm_name, profile, db, user_id,
            firm_website=profile.firm_website, count=query_count
        )
    else:
        queries = await generate_search_queries(
            thesis, firm_name, firm_website=profile.firm_website,
            firm_context=profile.firm_context, custom_brief=custom_brief, count=query_count
        )
    logger.info(f"Search queries: {queries}")

    all_companies = []
    seen_names = set()
    # Per-query stats — written to SourcingHistory after batch scoring
    _query_stats: List[dict] = []

    for i, query in enumerate(queries):
        logger.info(f"Searching {i+1}/{len(queries)}: {query[:60]}")
        companies, urls_found, brave_count = await search_and_extract_companies(query, thesis, firm_name)
        new_names_this_query: List[str] = []
        _src = "brave_search" if settings.BRAVE_API_KEY else "claude_web_search"
        for company in companies:
            name = company.get("name", "").strip()
            if name and name.lower() not in seen_names:
                company["_search_source"] = _src
                seen_names.add(name.lower())
                all_companies.append(company)
                new_names_this_query.append(name.lower())

        _query_stats.append({
            "query": query,
            "results_count": brave_count,
            "urls_found": urls_found,
            "companies_extracted": len(companies),
            "new_names": new_names_this_query,
            "high_fit_count": 0,   # filled after batch scoring
        })
        logger.info(
            f"[sourcing] query='{query[:50]}' brave={brave_count} urls={urls_found} "
            f"extracted={len(companies)} new={len(new_names_this_query)}"
        )

        if i < len(queries) - 1:
            logger.info("Waiting 30s between searches to respect rate limits...")
            await asyncio.sleep(30)

    logger.info(f"Total unique companies from web search: {len(all_companies)}")

    added = 0
    skipped = 0
    # Pairs of (Company, FirmCompanyScore) for batch scoring after commit
    newly_created: List[Tuple[Company, FirmCompanyScore]] = []

    for company_data in all_companies:
        name = company_data.get("name")
        website = company_data.get("website") or None   # empty string → None
        source_url = company_data.get("source_url") or website

        # Defense in depth: never store a news/media URL as the company's website
        if website and _is_news_domain(website):
            logger.info(f"[sourcing] Clearing news URL from website for '{name}': {website}")
            website = None

        if not name:
            skipped += 1
            continue

        logger.info(f"[sourcing] Processing company: '{name}' website={website!r} source_url={source_url!r}")

        # Each company is wrapped in a savepoint so a failure for one company
        # does NOT roll back all the others already flushed in this transaction.
        try:
            async with db.begin_nested() as savepoint:

                # ── STEP 1: Find or create global Company record ──────────────
                existing_company = await _find_global_company(website, name, db)

                if existing_company is not None:
                    company = existing_company
                    logger.info(f"[sourcing] '{name}' already in companies table id={company.id}")
                    if company.research_status == "complete":
                        logger.info(f"[sourcing] Research cache hit for '{name}'")
                else:
                    # New company — assign UUID explicitly so it's available before flush
                    slug = _make_global_slug(name)
                    slug_result = await db.execute(
                        select(Company).where(Company.slug == slug).limit(1)
                    )
                    if slug_result.scalar_one_or_none():
                        slug = f"{slug}-{str(_uuid_mod.uuid4())[:4]}"

                    new_company_id = _uuid_mod.uuid4()
                    company = Company(
                        id=new_company_id,
                        name=name,
                        website=website,
                        slug=slug,
                        one_liner=company_data.get("one_liner"),
                        funding_stage=company_data.get("funding_stage", "unknown"),
                        sector=company_data.get("sector"),
                        source="autonomous_sourcing",
                        source_url=source_url,
                        research_status="pending",
                        scraped_at=datetime.utcnow(),
                    )
                    db.add(company)
                    logger.info(f"[sourcing] db.add(Company) '{name}' id={new_company_id} slug={slug!r}")
                    await db.flush()
                    logger.info(f"[sourcing] db.flush(Company) OK → id={company.id}")

                # ── STEP 2: Check if this firm has already scored this company ─
                if await _firm_already_scored(company.id, user_id, db):
                    logger.info(f"[sourcing] Skipping '{name}' — firm already has a score")
                    skipped += 1
                    continue

                # ── STEP 3: Create FirmCompanyScore ───────────────────────────
                score = FirmCompanyScore(
                    company_id=company.id,
                    user_id=user_id,
                    pipeline_status="none",
                    has_unseen_signals=False,
                    source=company_data.get("_search_source", "autonomous_sourcing"),
                    source_url=source_url,
                )
                db.add(score)
                logger.info(f"[sourcing] db.add(FirmCompanyScore) '{name}' company_id={company.id} user_id={user_id!r}")
                await db.flush()
                logger.info(f"[sourcing] db.flush(FirmCompanyScore) OK → id={score.id}")

                newly_created.append((company, score))
                added += 1
                logger.info(f"[sourcing] '{name}' staged OK — running total added={added}")

        except Exception as e:
            logger.error(f"[sourcing] Failed to stage '{name}': {e}", exc_info=True)
            skipped += 1
            continue

    logger.info(f"[sourcing] Loop complete — calling db.commit() with {added} new companies")
    await db.commit()
    logger.info(f"[sourcing] db.commit() OK — {added} companies+scores committed")

    # ── Batch scoring: fit_score + mandate fields → FirmCompanyScore only ────
    if newly_created:
        from app.services.classifier import classify_batch

        # Use sequential integer indices so Claude echoes them back cleanly
        companies_input = [
            {
                "id": i,
                "name": company.name,
                "description": company.one_liner or company.name,
                "website": company.website,
                "source": company.source,
                "website_content": company.website_content,
            }
            for i, (company, _score) in enumerate(newly_created)
        ]

        try:
            results = await classify_batch(companies_input, profile)
            result_map = {r.get("id"): r for r in results if r.get("id") is not None}

            for i, (company, score) in enumerate(newly_created):
                result = result_map.get(i)
                if not result:
                    continue

                # Global company fields — factual data that benefits all tenants
                if result.get("one_liner"):
                    company.one_liner = result["one_liner"][:499]
                if result.get("sector"):
                    company.sector = result["sector"][:99]
                if result.get("business_model"):
                    company.business_model = result["business_model"]
                if result.get("target_customer"):
                    company.target_customer = result["target_customer"]
                if (company.funding_stage or "unknown") == "unknown" and result.get("funding_stage"):
                    company.funding_stage = result["funding_stage"][:49]
                if result.get("name"):
                    company.name = result["name"][:254]

                # Mandate-specific fields → FirmCompanyScore only
                score.fit_score = result.get("fit_score")
                score.thesis_tags = result.get("thesis_tags", [])
                score.mandate_category = (result.get("mandate_category") or "")[:99]
                score.recommended_next_step = result.get("recommended_next_step")

                # Notify for high-fit companies
                if (score.fit_score or 0) >= 4:
                    try:
                        from app.services.notification_writer import write_new_company_notification
                        await write_new_company_notification(db, score, user_id=user_id, company_name=company.name)
                        logger.info(f"[sourcing] Notification written for '{company.name}' fit_score={score.fit_score}")
                    except Exception as notify_err:
                        logger.warning(f"Failed to write notification for {company.name}: {notify_err}", exc_info=True)

            # ── Update per-query high_fit_count using post-scoring results ─────
            company_name_to_fit: dict = {
                company.name.lower(): (score.fit_score or 0)
                for company, score in newly_created
            }
            for qs in _query_stats:
                hf = sum(1 for n in qs["new_names"] if company_name_to_fit.get(n, 0) >= 4)
                qs["high_fit_count"] = hf

            logger.info(f"[sourcing] Batch scoring complete — calling db.commit()")
            await db.commit()
            logger.info(f"[sourcing] db.commit() after batch scoring OK")
        except Exception as e:
            logger.error(f"Batch classification failed in nightly sourcing: {e}", exc_info=True)

    # ── Write sourcing history (one row per query, after scoring) ────────────
    try:
        for qs in _query_stats:
            hf = qs["high_fit_count"]
            rc = qs["results_count"]
            db.add(SourcingHistory(
                user_id=user_id,
                query=qs["query"],
                ran_at=datetime.utcnow(),
                results_count=rc,
                urls_found=qs["urls_found"],
                companies_extracted=qs["companies_extracted"],
                new_companies_added=len(qs["new_names"]),
                high_fit_count=hf,
                quality_score=round(hf / max(rc, 1), 3),
            ))
        await db.commit()
        logger.info(f"[sourcing] Sourcing history written for {len(_query_stats)} queries")
    except Exception as hist_err:
        logger.error(f"[sourcing] Failed to write sourcing history: {hist_err}", exc_info=True)

    logger.info(f"Sourcing complete: {added} added, {skipped} skipped")

    return {
        "queries_generated": len(queries),
        "companies_found": len(all_companies),
        "added_to_database": added,
        "skipped_duplicates": skipped,
    }
