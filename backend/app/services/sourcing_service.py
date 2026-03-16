import logging
import asyncio
import json
import re
from datetime import datetime
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from anthropic import AsyncAnthropic
from app.core.config import settings
from app.models.startup import Startup
from app.models.firm_profile import FirmProfile

logger = logging.getLogger(__name__)
client = AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)


async def generate_search_queries(thesis: str, firm_name: str, firm_website: str = None, firm_context: dict = None, custom_brief: str = None, count: int = 3) -> List[str]:
    prompt = f"""You are a VC analyst generating search queries to find real early-stage startups.

FIRM: {firm_name}
INVESTMENT THESIS: {thesis}
{f'FIRM WEBSITE: {firm_website}\n' if firm_website else ''}{f'PORTFOLIO COMPANIES (already invested — do not source these): {", ".join(firm_context.get("portfolio_companies") or [])}\n' if firm_context and firm_context.get("portfolio_companies") else ''}{f'INVESTMENT THEMES: {", ".join(firm_context.get("investment_themes") or [])}\n' if firm_context and firm_context.get("investment_themes") else ''}
{f'CUSTOM SEARCH BRIEF: {custom_brief}' if custom_brief else ''}

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
        return [
            f"AI startup seed stage 2025",
            f"new AI B2B SaaS startup founders 2025",
            f"YC startup AI automation 2025",
        ]


async def search_and_extract_companies(query: str, thesis: str, firm_name: str) -> List[dict]:
    """
    Single Claude web search call: searches, reads results, returns structured company data.
    """
    prompt = f"""You are a VC analyst at {firm_name} finding early-stage startups.

INVESTMENT THESIS: {thesis}

Search the web for: "{query}"

Find real startups (not news articles, job boards, directories, or aggregators).
For each relevant startup found, extract its information.

You MUST respond with ONLY a valid JSON array. No explanation, no markdown, no preamble.
If no startups found, respond with exactly: []

Each item in the array must have these exact fields:
{{"name": "string", "website": "string", "one_liner": "string", "funding_stage": "pre-seed or seed or series-a or unknown", "sector": "string", "is_relevant": true}}

Example of valid response:
[{{"name": "Acme AI", "website": "https://acme.ai", "one_liner": "AI for legal workflows", "funding_stage": "seed", "sector": "LegalTech", "is_relevant": true}}]"""

    try:
        response = await client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=1500,
            tools=[{"type": "web_search_20250305", "name": "web_search", "max_uses": 2}],
            messages=[{"role": "user", "content": prompt}]
        )

        # Get the final text block (after tool use)
        final_text = ""
        for block in response.content:
            if hasattr(block, 'type') and block.type == "text":
                final_text = block.text

        if not final_text or not final_text.strip():
            logger.warning(f"Empty response for query: {query[:50]}")
            return []

        # Clean and parse JSON
        raw = final_text.strip()
        raw = re.sub(r'^```(?:json)?\s*', '', raw)
        raw = re.sub(r'\s*```$', '', raw)
        raw = raw.strip()

        # Find JSON array in response if Claude added preamble
        array_match = re.search(r'\[.*\]', raw, re.DOTALL)
        if array_match:
            raw = array_match.group(0)

        companies = json.loads(raw)
        if not isinstance(companies, list):
            return []

        relevant = [c for c in companies if c.get("name") and c.get("is_relevant", True)]
        logger.info(f"Query '{query[:50]}' → {len(relevant)} companies")
        return relevant

    except json.JSONDecodeError as e:
        logger.warning(f"JSON parse error for '{query[:40]}': {e} | Response was: {final_text[:200] if final_text else 'empty'}")
        return []
    except Exception as e:
        logger.error(f"Search error for '{query[:40]}': {e}")
        return []


async def is_duplicate(website: str, name: str, db: AsyncSession, user_id: Optional[str] = None) -> bool:
    def normalize(s):
        if not s:
            return ""
        s = s.lower().strip()
        s = re.sub(r'\b(inc|llc|ltd|corp|co|technologies|labs|ai|hq)\b', '', s)
        s = re.sub(r'\s+', ' ', s).strip()
        return s

    base = select(Startup)
    if user_id is not None:
        base = base.where(Startup.user_id == user_id)

    if website:
        try:
            from urllib.parse import urlparse
            domain = urlparse(website).netloc.replace('www.', '')
            if domain:
                q = base.where(Startup.website.ilike(f"%{domain}%")).limit(1)
                result = await db.execute(q)
                if result.scalar_one_or_none():
                    return True
        except Exception:
            pass

    if name:
        norm_name = normalize(name)
        if len(norm_name) < 3:
            return False
        result = await db.execute(base)
        all_companies = result.scalars().all()
        for company in all_companies:
            if company.name and normalize(company.name) == norm_name:
                return True
    return False


async def run_autonomous_sourcing(db: AsyncSession, custom_brief: str = None, limit_per_source: int = 10, user_id: Optional[str] = None, nightly: bool = False) -> dict:
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
    queries = await generate_search_queries(thesis, firm_name, firm_website=profile.firm_website, firm_context=profile.firm_context, custom_brief=custom_brief, count=query_count)
    logger.info(f"Search queries: {queries}")

    all_companies = []
    seen_names = set()

    for i, query in enumerate(queries):
        logger.info(f"Searching {i+1}/{len(queries)}: {query[:60]}")
        companies = await search_and_extract_companies(query, thesis, firm_name)
        for company in companies:
            name = company.get("name", "").strip()
            if name and name.lower() not in seen_names:
                seen_names.add(name.lower())
                all_companies.append(company)

        # Wait between searches to stay under rate limit
        if i < len(queries) - 1:
            logger.info("Waiting 15s between searches to respect rate limits...")
            await asyncio.sleep(30)

    logger.info(f"Total unique companies from web search: {len(all_companies)}")

    added = 0
    skipped = 0

    for company in all_companies:
        name = company.get("name")
        website = company.get("website")
        if not name:
            skipped += 1
            continue
        if await is_duplicate(website, name, db):
            logger.debug(f"Skipping duplicate: {name}")
            skipped += 1
            continue
        try:
            startup = Startup(
                name=name,
                website=website,
                one_liner=company.get("one_liner"),
                funding_stage=company.get("funding_stage", "unknown"),
                sector=company.get("sector"),
                source="autonomous_sourcing",
                source_url=website,
                scraped_at=datetime.utcnow(),
                research_status=None,
                user_id=user_id,
            )
            db.add(startup)
            await db.flush()
            added += 1
        except Exception as e:
            logger.error(f"Failed to add {name}: {e}")
            await db.rollback()
            continue

    await db.commit()

    # Fast batch scoring — fit_score only, no deep analysis
    from app.services.classifier import classify_batch
    from sqlalchemy import select as sa_select
    unscored_result = await db.execute(
        sa_select(Startup).where(
            Startup.user_id == user_id,
            Startup.source == "autonomous_sourcing",
            Startup.fit_score == None
        )
    )
    unscored = unscored_result.scalars().all()
    if unscored:
        companies_input = [
            {"id": s.id, "name": s.name, "description": s.one_liner or s.name, "website": s.website, "source": s.source}
            for s in unscored
        ]
        try:
            results = await classify_batch(companies_input, profile)
            result_map = {r.get("id"): r for r in results if r.get("id")}
            for startup in unscored:
                result = result_map.get(startup.id)
                if result:
                    startup.one_liner = (result.get("one_liner") or startup.one_liner or "")[:499]
                    startup.ai_score = result.get("ai_score")
                    startup.fit_score = result.get("fit_score")
                    startup.sector = (result.get("sector") or startup.sector or "")[:99]
                    startup.mandate_category = (result.get("mandate_category") or "")[:99]
                    startup.thesis_tags = result.get("thesis_tags", [])
                    startup.business_model = (result.get("business_model") or "")[:499]
                    startup.target_customer = (result.get("target_customer") or "")[:499]
                    if (startup.funding_stage or "unknown") == "unknown" and result.get("funding_stage"):
                        startup.funding_stage = result["funding_stage"][:49]
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
