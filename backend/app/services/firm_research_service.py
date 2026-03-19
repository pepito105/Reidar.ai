import logging
import re
import uuid as _uuid_mod
from datetime import datetime
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from anthropic import AsyncAnthropic
from app.core.config import settings
from app.services.research_service import firecrawl_scrape

logger = logging.getLogger(__name__)
client = AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)


async def enrich_firm_from_website(
    website_url: str,
    firm_name: str,
    db: Optional[AsyncSession] = None,
    user_id: Optional[str] = None,
    progress_callback=None,
) -> dict:
    """
    Crawl firm website with Firecrawl and extract structured context using Claude.

    Stores in firm_context JSON on FirmProfile:
      investment_themes, stage_focus, check_size, geography, team, notes

    If db + user_id are provided, also creates Company + FirmCompanyScore rows
    for any portfolio companies found on the site.

    Returns the firm_context dict (portfolio data is saved to DB directly, not returned).
    """
    logger.info(f"[firm_enrichment] Starting enrichment for '{firm_name}' url={website_url!r}")
    logger.info(f"[firm_enrichment] FIRECRAWL_API_KEY set: {bool(settings.FIRECRAWL_API_KEY)}")

    if not website_url:
        logger.info("[firm_enrichment] No website_url — skipping")
        return {}
    if not settings.FIRECRAWL_API_KEY:
        logger.warning("[firm_enrichment] FIRECRAWL_API_KEY not configured — skipping enrichment")
        return {}

    try:
        try:
            from urllib.parse import urlparse
            _display_domain = urlparse(website_url).netloc.replace("www.", "") or website_url
        except Exception:
            _display_domain = website_url

        if progress_callback:
            await progress_callback(f"Visiting {_display_domain}...")
        logger.info(f"[firm_enrichment] Calling Firecrawl scrape for {website_url}")
        content = await firecrawl_scrape(website_url, max_length=8000) or ""
        logger.info(f"[firm_enrichment] Firecrawl content length={len(content)} chars")

        if not content or len(content) < 100:
            logger.warning(f"[firm_enrichment] Insufficient Firecrawl content (len={len(content)}) — skipping")
            return {}

        if progress_callback:
            await progress_callback("Reading website content...")

        import json

        # ── Step 1: Extract firm context (themes, stage, geography, team) ─────
        if progress_callback:
            await progress_callback("Extracting investment themes...")
        context_prompt = f"""You are analyzing the website of a VC firm called {firm_name}.

Here is the website content:
{content[:8000]}

Extract the following information and return ONLY a valid JSON object:

{{
  "investment_themes": ["2-5 key investment themes in the firm's own words"],
  "stage_focus": ["stages they invest in, e.g. pre-seed, seed, series-a"],
  "check_size": "typical check size if mentioned e.g. $500K-$2M, or null",
  "geography": ["geographies they focus on"],
  "team": ["names of partners or key team members found on the site"],
  "notes": "any other relevant context about their investment approach in 1-2 sentences, or null"
}}

If a field cannot be determined from the content, use an empty array [] or null.
Return ONLY the JSON object, no explanation."""

        logger.info("[firm_enrichment] Calling Claude Haiku for firm context extraction")
        context_response = await client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=800,
            messages=[{"role": "user", "content": context_prompt}]
        )
        raw = context_response.content[0].text.strip()
        raw = re.sub(r'^```(?:json)?\s*', '', raw)
        raw = re.sub(r'\s*```$', '', raw)
        firm_context = json.loads(raw.strip())
        logger.info(
            f"[firm_enrichment] Firm context extracted: "
            f"themes={firm_context.get('investment_themes')} "
            f"team={firm_context.get('team')} "
            f"geography={firm_context.get('geography')}"
        )
        if progress_callback:
            themes = firm_context.get("investment_themes") or []
            await progress_callback(f"Investment themes extracted{': ' + ', '.join(themes[:3]) if themes else ''}")

        # ── Step 2: Extract portfolio companies ───────────────────────────────
        if progress_callback:
            await progress_callback("Scanning for portfolio companies...")
        portfolio_prompt = f"""You are analyzing the website of a VC firm called {firm_name}.

Here is the website content:
{content[:8000]}

Find all portfolio companies mentioned on this site. For each one, extract:
- name: company name (required)
- website: company website URL if found on the page, or null
- one_liner: brief description if mentioned, or null
- sector: industry sector if mentioned, or null

Return ONLY a valid JSON array. If no portfolio companies are found, return [].
Example: [{{"name": "Acme AI", "website": "https://acme.ai", "one_liner": "AI for law firms", "sector": "LegalTech"}}]"""

        logger.info("[firm_enrichment] Calling Claude Haiku for portfolio extraction")
        portfolio_response = await client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=1500,
            messages=[{"role": "user", "content": portfolio_prompt}]
        )
        raw_p = portfolio_response.content[0].text.strip()
        raw_p = re.sub(r'^```(?:json)?\s*', '', raw_p)
        raw_p = re.sub(r'\s*```$', '', raw_p)
        portfolio_companies = json.loads(raw_p.strip())
        if not isinstance(portfolio_companies, list):
            portfolio_companies = []
        logger.info(f"[firm_enrichment] Portfolio extraction: {len(portfolio_companies)} companies found")
        if progress_callback:
            count = len(portfolio_companies)
            if count > 0:
                await progress_callback(f"Found {count} portfolio {'company' if count == 1 else 'companies'}")
            else:
                await progress_callback("No portfolio companies found on site")

        # ── Step 3: Persist portfolio companies if db session available ───────
        if db is not None and user_id and portfolio_companies:
            if progress_callback:
                await progress_callback("Saving portfolio companies...")
            await _save_portfolio_companies(db, user_id, portfolio_companies)

        return firm_context

    except Exception as e:
        logger.error(f"[firm_enrichment] Failed for '{firm_name}' url={website_url}: {e}", exc_info=True)
        return {}


async def _save_portfolio_companies(
    db: AsyncSession,
    user_id: str,
    portfolio_companies: list,
) -> None:
    """
    For each portfolio company extracted from the firm website:
    - Find or create a global Company row
    - Create FirmCompanyScore with is_portfolio=True, pipeline_status="invested"

    Each company is wrapped in its own savepoint so a single failure
    does not roll back the others.
    """
    from app.models.company import Company
    from app.models.firm_company_score import FirmCompanyScore

    saved = 0
    skipped = 0

    for co in portfolio_companies:
        name = (co.get("name") or "").strip()
        if not name:
            continue
        website = co.get("website") or None

        try:
            async with db.begin_nested():
                # ── Find or create global Company ─────────────────────────────
                existing = await _find_company(db, website, name)

                if existing:
                    company = existing
                    logger.info(f"[firm_enrichment] Portfolio '{name}' — existing company id={company.id}")
                else:
                    slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")[:80]
                    slug_check = await db.execute(
                        select(Company).where(Company.slug == slug).limit(1)
                    )
                    if slug_check.scalar_one_or_none():
                        slug = f"{slug}-{str(_uuid_mod.uuid4())[:4]}"

                    company = Company(
                        id=_uuid_mod.uuid4(),
                        name=name,
                        website=website,
                        slug=slug,
                        one_liner=co.get("one_liner"),
                        sector=co.get("sector"),
                        source="portfolio_import",
                        source_url=website,
                        research_status="pending",
                        scraped_at=datetime.utcnow(),
                    )
                    db.add(company)
                    await db.flush()
                    logger.info(f"[firm_enrichment] Created Company '{name}' id={company.id}")

                # ── Skip if FirmCompanyScore already exists ────────────────────
                existing_score = await db.execute(
                    select(FirmCompanyScore)
                    .where(FirmCompanyScore.company_id == company.id)
                    .where(FirmCompanyScore.user_id == user_id)
                    .limit(1)
                )
                if existing_score.scalar_one_or_none():
                    logger.info(f"[firm_enrichment] Portfolio '{name}' — score already exists, skipping")
                    skipped += 1
                    continue

                # ── Create FirmCompanyScore ────────────────────────────────────
                score = FirmCompanyScore(
                    company_id=company.id,
                    user_id=user_id,
                    is_portfolio=True,
                    pipeline_status="invested",
                    source="portfolio_import",
                    fit_score=None,
                )
                db.add(score)
                await db.flush()
                logger.info(f"[firm_enrichment] Created FirmCompanyScore for '{name}' id={score.id}")
                saved += 1

        except Exception as e:
            logger.error(f"[firm_enrichment] Failed to save portfolio '{name}': {e}", exc_info=True)
            skipped += 1
            continue

    await db.commit()
    logger.info(f"[firm_enrichment] Portfolio save complete: {saved} saved, {skipped} skipped")


async def _find_company(db: AsyncSession, website: Optional[str], name: str):
    """Find an existing Company by domain match or normalized name."""
    from app.models.company import Company

    if website:
        try:
            from urllib.parse import urlparse
            domain = urlparse(website).netloc.lower().replace("www.", "")
            if domain:
                result = await db.execute(
                    select(Company).where(Company.website.ilike(f"%{domain}%")).limit(1)
                )
                existing = result.scalar_one_or_none()
                if existing:
                    return existing
        except Exception:
            pass

    if name:
        norm = re.sub(r"\b(inc|llc|ltd|corp|co|technologies|labs|ai|hq)\b", "", name.lower())
        norm = re.sub(r"\s+", " ", norm).strip()
        if len(norm) >= 3:
            result = await db.execute(
                select(Company).where(Company.name.ilike(f"%{norm}%")).limit(10)
            )
            for company in result.scalars().all():
                if company.name:
                    cmp = re.sub(r"\b(inc|llc|ltd|corp|co|technologies|labs|ai|hq)\b", "", company.name.lower())
                    cmp = re.sub(r"\s+", " ", cmp).strip()
                    if cmp == norm:
                        return company

    return None
