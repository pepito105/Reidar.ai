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
from app.services.classifier import classify_batch

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

    # YC: only scrape if any firm doesn't have YC companies yet
    yc_needed = False
    for firm in firms:
        yc_check = await db.execute(
            select(Startup).where(
                Startup.source == "YC",
                Startup.user_id == firm.user_id
            ).limit(1)
        )
        if not yc_check.scalar_one_or_none():
            yc_needed = True
            break

    if yc_needed:
        try:
            yc_companies = await scrape_yc_companies()
            all_companies.extend(yc_companies)
            stats["sources"]["YC"] = len(yc_companies)
            logger.info(f"YC: {len(yc_companies)} companies found")
        except Exception as e:
            logger.error(f"YC scraper failed: {e}")
            stats["sources"]["YC"] = 0
    else:
        logger.info("YC: all firms already have YC data — skipping")
        stats["sources"]["YC"] = 0

    # RSS and ProductHunt: always run
    for source_name, scraper_fn in [
        ("RSS Feeds", scrape_rss_feeds),
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

        # Fast batch scoring — fit_score only, no deep analysis
        if new_startups:
            companies_input = [
                {"id": s.id, "name": s.name, "description": desc or s.name, "website": s.website, "source": s.source}
                for s, desc in new_startups
            ]
            try:
                results = await classify_batch(companies_input, firm)
                result_map = {r.get("id"): r for r in results if r.get("id")}
                for startup, _ in new_startups:
                    result = result_map.get(startup.id)
                    if result:
                        startup.one_liner = (result.get("one_liner") or "")[:499]
                        startup.ai_score = result.get("ai_score")
                        startup.fit_score = result.get("fit_score")
                        startup.sector = (result.get("sector") or "")[:99]
                        startup.mandate_category = (result.get("mandate_category") or "")[:99]
                        startup.thesis_tags = result.get("thesis_tags", [])
                        startup.business_model = (result.get("business_model") or "")[:499]
                        startup.target_customer = (result.get("target_customer") or "")[:499]
                        if (startup.funding_stage or "unknown") == "unknown" and result.get("funding_stage"):
                            startup.funding_stage = result["funding_stage"][:49]
                await db.commit()
                total_classified += len(new_startups)
            except Exception as e:
                logger.error(f"Batch classification failed for {firm.firm_name}: {e}")
        logger.info(f"Classified {len(new_startups)} for {firm.firm_name}")

    stats["total_added"] = total_added
    stats["total_classified"] = total_classified
    return stats
