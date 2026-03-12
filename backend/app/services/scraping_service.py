import logging
import re
from datetime import datetime
from typing import Optional
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


async def _get_active_firm(db: AsyncSession) -> Optional[FirmProfile]:
    result = await db.execute(
        select(FirmProfile).where(FirmProfile.is_active == True).limit(1)
    )
    return result.scalar_one_or_none()


async def run_full_scrape(db: AsyncSession) -> dict:
    firm = await _get_active_firm(db)
    stats = {"total_found": 0, "total_added": 0, "total_classified": 0, "sources": {}}

    all_companies = []
    for name, scraper_fn in [
        ("RSS Feeds", scrape_rss_feeds),
        ("YC", scrape_yc_companies),
        ("ProductHunt", scrape_producthunt),
    ]:
        try:
            companies = await scraper_fn()
            all_companies.extend(companies)
            stats["sources"][name] = len(companies)
            logger.info(f"{name}: {len(companies)} companies found")
        except Exception as e:
            logger.error(f"{name} scraper failed: {e}")
            stats["sources"][name] = 0

    stats["total_found"] = len(all_companies)

    new_startups = []
    for data in all_companies:
        name = (data.get("name") or "").strip()
        if not name or len(name) < 2:
            continue
        slug = _slugify(name)
        existing = await db.execute(select(Startup).where(Startup.slug == slug))
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
        )
        db.add(startup)
        new_startups.append((startup, data.get("description", "")))

    await db.commit()
    stats["total_added"] = len(new_startups)
    logger.info(f"Added {len(new_startups)} new companies")

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
            startup.thesis_tags = result.get("thesis_tags", [])
            startup.recommended_next_step = (result.get("recommended_next_step") or "")[:499]
            if startup.funding_stage == "unknown" and result.get("funding_stage"):
                startup.funding_stage = result["funding_stage"][:49]
            await db.commit()
            classified += 1
        except Exception as e:
            await db.rollback()
            logger.error(f"Classification failed for {startup.name}: {e}")

    stats["total_classified"] = classified
    logger.info(f"Classification complete: {classified}/{len(new_startups)}")
    return stats
