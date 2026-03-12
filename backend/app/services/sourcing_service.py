import logging
import asyncio
import json
import re
from datetime import datetime, timezone
from typing import List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from anthropic import AsyncAnthropic
from app.core.config import settings
from app.models.startup import Startup
from app.models.firm_profile import FirmProfile

logger = logging.getLogger(__name__)
client = AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)


async def generate_search_queries(thesis: str, firm_name: str, custom_brief: str = None) -> List[str]:
    prompt = f"""You are a VC analyst generating Google search queries to find early-stage startups.

FIRM: {firm_name}
INVESTMENT THESIS: {thesis}
{f'CUSTOM SEARCH BRIEF: {custom_brief}' if custom_brief else ''}

Generate 3 search queries that will find real startup websites and coverage.
Queries should sound like natural Google searches, not VC jargon.
Use terms startups actually use to describe themselves. Always use 2025 or 2026 as the year, never older years.
Mix query styles: one broad category search, one problem-focused, one recent funding angle.

Examples of good queries:
- "AI software for healthcare compliance startups 2026"
- "startup automating legal document review"
- "seed stage AI company insurance underwriting 2026"

Return ONLY a valid JSON array of 3 strings, nothing else.
Example: ["query one", "query two", "query three"]"""

    try:
        response = await client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=300,
            messages=[{"role": "user", "content": prompt}]
        )
        raw = response.content[0].text.strip()
        # Strip markdown code blocks if present
        raw = re.sub(r'^```(?:json)?\s*', '', raw)
        raw = re.sub(r'\s*```$', '', raw)
        queries = json.loads(raw.strip())
        logger.info(f"Generated {len(queries)} search queries for {firm_name}")
        return queries[:3]
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
            model="claude-sonnet-4-20250514",
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


async def is_duplicate(website: str, name: str, db: AsyncSession) -> bool:
    def normalize(s):
        if not s:
            return ""
        s = s.lower().strip()
        s = re.sub(r'\b(inc|llc|ltd|corp|co|technologies|labs|ai|hq)\b', '', s)
        s = re.sub(r'\s+', ' ', s).strip()
        return s

    if website:
        try:
            from urllib.parse import urlparse
            domain = urlparse(website).netloc.replace('www.', '')
            if domain:
                result = await db.execute(
                    select(Startup).where(Startup.website.ilike(f"%{domain}%")).limit(1)
                )
                if result.scalar_one_or_none():
                    return True
        except Exception:
            pass

    if name:
        norm_name = normalize(name)
        if len(norm_name) < 3:
            return False
        result = await db.execute(select(Startup))
        all_companies = result.scalars().all()
        for company in all_companies:
            if company.name and normalize(company.name) == norm_name:
                return True
    return False


async def run_autonomous_sourcing(db: AsyncSession, custom_brief: str = None, limit_per_source: int = 10) -> dict:
    profile_result = await db.execute(select(FirmProfile).where(FirmProfile.is_active == True))
    profile = profile_result.scalar_one_or_none()
    if not profile:
        return {"error": "No firm profile configured"}

    firm_name = profile.firm_name
    thesis = custom_brief or profile.investment_thesis
    logger.info(f"Starting autonomous sourcing for {firm_name}")

    queries = await generate_search_queries(thesis, firm_name, custom_brief)
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
                scraped_at=datetime.now(timezone.utc),
                research_status=None,
            )
            db.add(startup)
            await db.flush()

            from app.services.classifier import classify_startup
            result = await classify_startup(
                name=startup.name,
                description=startup.one_liner or startup.name,
                website=startup.website,
                source=startup.source or "autonomous_sourcing",
                firm=profile,
            )
            if result:
                startup.one_liner = (result.get("one_liner") or startup.one_liner or "")[:499]
                startup.ai_summary = (result.get("ai_summary") or "")[:2000]
                startup.ai_score = result.get("ai_score")
                startup.fit_score = result.get("fit_score")
                startup.fit_reasoning = (result.get("fit_reasoning") or "")[:1000]
                startup.business_model = (result.get("business_model") or "")[:99]
                startup.target_customer = (result.get("target_customer") or "")[:199]
                startup.sector = (result.get("sector") or startup.sector or "")[:99]
                startup.thesis_tags = result.get("thesis_tags", [])
                startup.recommended_next_step = (result.get("recommended_next_step") or "")[:499]
                if (startup.funding_stage or "unknown") == "unknown" and result.get("funding_stage"):
                    startup.funding_stage = (result["funding_stage"] or "")[:49]
            added += 1
        except Exception as e:
            logger.error(f"Failed to add {name}: {e}")
            await db.rollback()
            continue

    await db.commit()
    logger.info(f"Sourcing complete: {added} added, {skipped} skipped")

    return {
        "queries_generated": len(queries),
        "companies_found": len(all_companies),
        "added_to_database": added,
        "skipped_duplicates": skipped,
    }
