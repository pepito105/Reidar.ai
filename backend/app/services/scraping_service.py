import logging
import re
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.startup import Startup
from app.models.firm_profile import FirmProfile
from app.scrapers.rss_scraper import scrape_rss_feeds
from app.scrapers.yc_scraper import scrape_yc_companies
from app.scrapers.ph_scraper import scrape_producthunt
from app.services.classifier import classify_startup

logger = logging.getLogger(__name__)


def _slugify(name: str) -> str:
    slug = name.lower().strip()
    slug = re.sub(r"[^a-z0-9]+", "-", slug)
    return slug.strip("-")[:100]


async def _get_all_active_firms(db: AsyncSession) -> list:
    result = await db.execute(
        select(FirmProfile).where(FirmProfile.is_active == True)
    )
    return result.scalars().all()


async def run_full_scrape(db: AsyncSession) -> dict:
    stats = {"total_found": 0, "total_added": 0, "total_classified": 0, "sources": {}, "firms": 0}

    # Step 1: Get all active firms
    firms = await _get_all_active_firms(db)
    if not firms:
        logger.info("No active firms found — skipping scrape")
        return stats
    stats["firms"] = len(firms)
    logger.info(f"Running scrape for {len(firms)} active firm(s)")

    # Step 2: Scrape all sources once
    all_companies = []
    for source_name, scraper_fn in [
        ("RSS Feeds", scrape_rss_feeds),
        ("YC", scrape_yc_companies),
        ("ProductHunt", scrape_producthunt),
    ]:
        try:
            companies = await scraper_fn()
            all_companies.extend(companies)
            stats["sources"][source_name] = len(companies)
            logger.info(f"{source_name}: {len(companies)} companies found")
        except Exception as e:
            logger.error(f"{source_name} scraper failed: {e}")
            stats["sources"][source_name] = 0

    stats["total_found"] = len(all_companies)
    if not all_companies:
        logger.info("No companies found from scrapers")
        return stats

    # Step 3: For each firm, save and classify companies
    total_added = 0
    total_classified = 0

    for firm in firms:
        firm_slug_prefix = ""
        logger.info(f"Processing {len(all_companies)} companies for firm: {firm.firm_name} (user_id={firm.user_id})")
        new_startups = []

        for data in all_companies:
            name = (data.get("name") or "").strip()
            if not name or len(name) < 2:
                continue

            # Slug is scoped per firm via user_id — same company can exist for multiple firms
            slug = _slugify(name)

            # Check if this company already exists for this firm
            existing = await db.execute(
                select(Startup).where(
                    Startup.slug == slug,
                    Startup.user_id == firm.user_id
                )
            )
            if existing.scalar_one_or_none():
                continue

            startup = Startup(
                name=name,
                slug=slug,
                ai_summary=data.get("description", "")[:500],
                website=data.get("website"),
                founding_year=data.get("founding_year"),
                funding_stage=data.get("funding_stage", "unknown"),
                funding_amount_usd=data.get("funding_amount_usd"),
                top_investors=data.get("top_investors", []),
                source=data.get("source", "unknown"),
                source_url=data.get("source_url"),
                scraped_at=data.get("scraped_at", datetime.utcnow()),
                user_id=firm.user_id,
            )
            db.add(startup)
            new_startups.append((startup, data.get("description", "")))

        await db.commit()
        total_added += len(new_startups)
        logger.info(f"Added {len(new_startups)} new companies for {firm.firm_name}")

        # Classify new companies for this firm
        classified = 0
        for startup, description in new_startups[:50]:
            try:
                result = await classify_startup(
                    name=startup.name,
                    description=description or startup.ai_summary or startup.name,
                    website=startup.website,
                    source=startup.source,
                    firm=firm,
                )
                startup.one_liner = (result.get("one_liner") or "")[:499]
                startup.ai_summary = (result.get("ai_summary") or startup.ai_summary or "")[:2000]
                startup.ai_score = result.get("ai_score")
                startup.fit_score = result.get("fit_score")
                startup.fit_reasoning = (result.get("fit_reasoning") or "")[:1000]
                startup.business_model = (result.get("business_model") or "")[:99]
                startup.target_customer = (result.get("target_customer") or "")[:199]
                startup.sector = (result.get("sector") or "")[:99]
                startup.mandate_category = (result.get("mandate_category") or "")[:99]
                startup.thesis_tags = result.get("thesis_tags", [])
                startup.recommended_next_step = (result.get("recommended_next_step") or "")[:499]
                if startup.funding_stage == "unknown" and result.get("funding_stage"):
                    startup.funding_stage = result["funding_stage"][:49]
                await db.commit()
                classified += 1
            except Exception as e:
                await db.rollback()
                logger.error(f"Classification failed for {startup.name}: {e}")

        total_classified += classified
        logger.info(f"Classified {classified}/{len(new_startups)} for {firm.firm_name}")

    stats["total_added"] = total_added
    stats["total_classified"] = total_classified
    return stats
