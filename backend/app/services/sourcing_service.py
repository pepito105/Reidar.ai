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
                return existing

    if name:
        norm = _normalize_name(name)
        if len(norm) < 3:
            return None
        result = await db.execute(select(Company))
        for company in result.scalars().all():
            if company.name and _normalize_name(company.name) == norm:
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

    prompt = f"""You are a VC analyst generating search queries to find real early-stage startups.
FIRM: {firm_name}
INVESTMENT THESIS: {thesis}
{optional_lines}

Generate exactly {count} search queries to find startups that match this thesis.

Rules:
- Be highly specific to the thesis — target the exact verticals, problems, and customer types mentioned
- Use language founders actually use to describe their product, not investor jargon
- Each query should target a different angle: (1) product category, (2) problem being solved, (3) recent funding/launch
- Always include 2025 or 2026 in at least one query
- Never use words like "best", "top", "leading", "innovative"
- Queries should find startup websites and founder coverage, not news articles or directories

Good examples for a legal AI thesis:
- "AI contract review software law firms seed 2025"
- "startup automating legal due diligence founders"
- "LegalTech AI compliance automation funding 2026"

Bad examples (too generic):
- "AI startup 2025"
- "best legal technology companies"
- "top AI software startups"

Return ONLY a valid JSON array of exactly 3 strings, nothing else.
Example: ["query one", "query two", "query three"]"""

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


async def generate_contextual_queries(
    thesis: str, firm_name: str, profile: FirmProfile, db: AsyncSession,
    user_id: Optional[str], firm_website: str = None, count: int = 8
) -> List[str]:
    """
    Smarter nightly query generator. Pulls sourcing history, sector coverage,
    pipeline themes, and recent signals to avoid repetition and fill gaps.
    """
    from sqlalchemy import select as sa_select, func

    # Recent queries (last 30 days) to avoid repeating
    recent_queries_result = await db.execute(
        sa_select(SourcingHistory.query)
        .where(SourcingHistory.user_id == user_id)
        .order_by(SourcingHistory.ran_at.desc())
        .limit(30)
    )
    recent_queries = [r[0] for r in recent_queries_result.all()]

    # Sector coverage — join Company → FirmCompanyScore scoped to this firm
    sector_result = await db.execute(
        sa_select(Company.sector, func.count(Company.id).label("cnt"))
        .join(FirmCompanyScore, FirmCompanyScore.company_id == Company.id)
        .where(FirmCompanyScore.user_id == user_id)
        .where(Company.sector.isnot(None))
        .group_by(Company.sector)
        .order_by(func.count(Company.id).desc())
        .limit(10)
    )
    sector_coverage = {row.sector: row.cnt for row in sector_result.all()}

    # Pipeline themes — from FirmCompanyScore (thesis_tags) for active pipeline
    pipeline_result = await db.execute(
        sa_select(FirmCompanyScore.thesis_tags, Company.sector)
        .join(Company, Company.id == FirmCompanyScore.company_id)
        .where(FirmCompanyScore.user_id == user_id)
        .where(FirmCompanyScore.pipeline_status.in_(["watching", "outreach", "diligence"]))
        .limit(20)
    )
    pipeline_rows = pipeline_result.all()
    pipeline_themes = []
    for row in pipeline_rows:
        if row.thesis_tags:
            pipeline_themes.extend(row.thesis_tags)

    portfolio_companies = (profile.firm_context or {}).get("portfolio_companies", [])
    themes_line = f'INVESTMENT THEMES: {", ".join((profile.firm_context or {}).get("investment_themes") or [])}' if (profile.firm_context or {}).get("investment_themes") else ""
    portfolio_line = f'PORTFOLIO (skip these): {", ".join(portfolio_companies)}' if portfolio_companies else ""
    website_line = f"FIRM WEBSITE: {firm_website}" if firm_website else ""

    recent_block = "\n".join(f"  - {q}" for q in recent_queries[:15]) if recent_queries else "  (none yet)"
    sector_block = "\n".join(f"  - {s}: {c} companies" for s, c in list(sector_coverage.items())[:8]) if sector_coverage else "  (none yet)"
    pipeline_block = ", ".join(set(pipeline_themes[:20])) if pipeline_themes else "(none yet)"

    optional_lines = "\n".join(line for line in [website_line, portfolio_line, themes_line] if line)

    prompt = f"""You are a VC analyst generating search queries for nightly deal sourcing.
FIRM: {firm_name}
INVESTMENT THESIS: {thesis}
{optional_lines}

CONTEXT — use this to generate smarter, non-repetitive queries:

RECENT QUERIES (avoid repeating these angles):
{recent_block}

SECTOR COVERAGE (sectors already well-represented — consider underexplored areas):
{sector_block}

PIPELINE THEMES (themes in active deals — look for adjacent opportunities):
{pipeline_block}

Generate exactly {count} search queries to find real early-stage startups that match the thesis.

Rules:
- Do NOT repeat angles from recent queries above
- Prioritize sectors with thin coverage or not yet seen
- Target adjacent themes to pipeline deals — what else would this firm want?
- Use language founders use, not investor jargon
- Include 2025 or 2026 in at least 2 queries
- Mix angles: product category, problem being solved, recent funding/launch, geography
- Never use "best", "top", "leading", "innovative"
- Include at least one query targeting YC W25 or S25 batches if relevant to thesis

Return ONLY a valid JSON array of exactly {count} strings, nothing else.
Example: ["query one", "query two", "query three"]"""

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

async def search_and_extract_companies(query: str, thesis: str, firm_name: str) -> List[dict]:
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
        return []

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
    logger.info(f"Query '{query[:50]}' → {len(results)} results, {len(company_urls)} company URLs")

    if not company_urls:
        logger.info(f"No company URLs found for: {query[:60]}")
        return []

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
        return []

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
- website: the URL
- one_liner: "We help [customer] [do X] by [mechanism]" — max 20 words
- funding_stage: pre-seed, seed, series-a, series-b, or unknown
- sector: the specific industry vertical
- is_relevant: true if matches thesis, false if not

Respond with ONLY a valid JSON array. If no relevant startups found, return [].

Example:
[{{"name": "Acme AI", "website": "https://acme.ai", "one_liner": "We help law firms automate contract review with AI", "funding_stage": "seed", "sector": "LegalTech", "is_relevant": true}}]"""

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
            return []

        relevant = [c for c in companies if c.get("name") and c.get("is_relevant", True)]
        logger.info(f"Query '{query[:50]}' → {len(relevant)} relevant companies extracted")
        return relevant

    except json.JSONDecodeError as e:
        logger.warning(f"JSON parse error for '{query[:40]}': {e}")
        return []
    except Exception as e:
        logger.error(f"Search error for '{query[:40]}': {e}")
        return []


async def _search_and_extract_claude_fallback(query: str, thesis: str, firm_name: str) -> List[dict]:
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
            return []
        raw = final_text.strip()
        raw = re.sub(r'^```(?:json)?\s*', '', raw)
        raw = re.sub(r'\s*```$', '', raw)
        array_match = re.search(r'\[.*\]', raw, re.DOTALL)
        if array_match:
            raw = array_match.group(0)
        companies = json.loads(raw)
        if not isinstance(companies, list):
            return []
        return [c for c in companies if c.get("name") and c.get("is_relevant", True)]
    except Exception as e:
        logger.error(f"Claude fallback search error for '{query[:40]}': {e}")
        return []


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

    for i, query in enumerate(queries):
        logger.info(f"Searching {i+1}/{len(queries)}: {query[:60]}")
        companies = await search_and_extract_companies(query, thesis, firm_name)
        new_from_query = 0
        for company in companies:
            name = company.get("name", "").strip()
            if name and name.lower() not in seen_names:
                seen_names.add(name.lower())
                all_companies.append(company)
                new_from_query += 1

        # Write sourcing history entry
        try:
            history_entry = SourcingHistory(
                user_id=user_id,
                query=query,
                ran_at=datetime.utcnow(),
                results_count=len(companies),
                new_companies_added=new_from_query,
            )
            db.add(history_entry)
            await db.flush()
        except Exception as hist_err:
            logger.warning(f"Failed to write sourcing history for query '{query[:40]}': {hist_err}")

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
        website = company_data.get("website")
        if not name:
            skipped += 1
            continue

        # ── STEP 1: Find or create global Company record ─────────────────────
        existing_company = await _find_global_company(website, name, db)

        if existing_company is not None:
            company = existing_company
            # ── STEP 4: Research cache — if research is complete, no re-scrape needed
            if company.research_status == "complete":
                logger.debug(f"Research cache hit for {name} — will score from cached data")
        else:
            # New company — create global record with factual fields only
            slug = _make_global_slug(name)
            # Ensure slug uniqueness within this session
            slug_result = await db.execute(
                select(Company).where(Company.slug == slug).limit(1)
            )
            if slug_result.scalar_one_or_none():
                slug = f"{slug}-{str(_uuid_mod.uuid4())[:4]}"
            try:
                company = Company(
                    name=name,
                    website=website,
                    slug=slug,
                    one_liner=company_data.get("one_liner"),
                    funding_stage=company_data.get("funding_stage", "unknown"),
                    sector=company_data.get("sector"),
                    source="autonomous_sourcing",
                    source_url=website,
                    research_status="pending",
                    scraped_at=datetime.utcnow(),
                )
                db.add(company)
                await db.flush()  # populate company.id
            except Exception as e:
                logger.error(f"Failed to create Company for {name}: {e}")
                await db.rollback()
                skipped += 1
                continue

        # ── STEP 2: Check if this firm has already scored this company ────────
        if await _firm_already_scored(company.id, user_id, db):
            logger.debug(f"Skipping {name} — firm {user_id} already has a score")
            skipped += 1
            continue

        # ── STEP 3: Create FirmCompanyScore (mandate scoring done in batch below)
        try:
            score = FirmCompanyScore(
                company_id=company.id,
                user_id=user_id,
                pipeline_status="none",
                has_unseen_signals=False,
            )
            db.add(score)
            await db.flush()
            newly_created.append((company, score))
            added += 1
        except Exception as e:
            logger.error(f"Failed to create FirmCompanyScore for {name}: {e}")
            await db.rollback()
            skipped += 1
            continue

    await db.commit()

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
                    except Exception as notify_err:
                        logger.warning(f"Failed to write notification for {company.name}: {notify_err}")

            await db.commit()
        except Exception as e:
            logger.error(f"Batch classification failed in nightly sourcing: {e}")

    logger.info(f"Sourcing complete: {added} added, {skipped} skipped")

    return {
        "queries_generated": len(queries),
        "companies_found": len(all_companies),
        "added_to_database": added,
        "skipped_duplicates": skipped,
    }
