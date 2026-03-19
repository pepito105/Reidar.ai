import logging
import uuid as _uuid
from app.core.database import AsyncSessionLocal
from app.core.config import settings

logger = logging.getLogger(__name__)


async def enrich_portfolio_company(score_id: str) -> None:
    """
    Background task — scrapes a portfolio company's website and
    enriches its data using Claude. score_id is FirmCompanyScore.id (UUID string).
    Runs in its own DB session. Never raises — logs errors silently.
    """
    if not settings.FIRECRAWL_API_KEY:
        logger.info("No FIRECRAWL_API_KEY — skipping portfolio enrichment")
        return

    async with AsyncSessionLocal() as db:
        try:
            from sqlalchemy import select
            from app.models.company import Company
            from app.models.firm_company_score import FirmCompanyScore

            try:
                score_uuid = _uuid.UUID(str(score_id))
            except (ValueError, AttributeError):
                logger.warning(f"Invalid score_id: {score_id}")
                return

            row = await db.execute(
                select(Company, FirmCompanyScore)
                .join(FirmCompanyScore, FirmCompanyScore.company_id == Company.id)
                .where(FirmCompanyScore.id == score_uuid)
            )
            pair = row.first()
            if not pair or not pair[0].website:
                return
            company, score = pair[0], pair[1]

            # Scrape the company website
            from app.services.research_service import firecrawl_scrape
            content = await firecrawl_scrape(company.website, max_length=4000)
            if not content or len(content.strip()) < 100:
                logger.info(f"No useful content scraped for {company.name}")
                return

            # Ask Claude to extract structured data
            import anthropic
            import json
            client = anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)

            prompt = f"""You are extracting structured data about a startup from their website content.

COMPANY NAME: {company.name}
WEBSITE: {company.website}

WEBSITE CONTENT:
{content}

Extract the following fields from the content above. Only include
fields where you have clear evidence from the content — do not invent
or infer.

Respond with ONLY a JSON object, no markdown:
{{
  "one_liner": "one sentence describing what the company does — We help [customer] [do X] by [mechanism]. Max 15 words. Null if unclear.",
  "sector": "one of: AI Infrastructure, Developer Tools, FinTech, HealthTech, LegalTech, HRTech, EdTech, Enterprise SaaS, Consumer AI, CleanTech, Cybersecurity, E-commerce & Retail, PropTech, MarketingTech, Supply Chain & Logistics, Other. Null if unclear.",
  "funding_stage": "one of: pre-seed, seed, series-a, series-b, unknown. Null if not mentioned.",
  "ai_summary": "2-3 sentences describing the company, product, and target customer. Null if insufficient content."
}}"""

            response = await client.messages.create(
                model="claude-haiku-4-5-20251001",
                max_tokens=500,
                messages=[{"role": "user", "content": prompt}]
            )
            raw = response.content[0].text.strip()
            if raw.startswith("```"):
                raw = raw.split("```")[1]
                if raw.startswith("json"):
                    raw = raw[4:]
            data = json.loads(raw.strip())

            # Update Company (global factual fields) — only if currently empty
            updated = False
            if data.get("one_liner") and not company.one_liner:
                company.one_liner = data["one_liner"][:499]
                updated = True
            if data.get("sector") and not company.sector:
                company.sector = data["sector"][:99]
                updated = True
            if data.get("funding_stage") and (not company.funding_stage or company.funding_stage == "unknown"):
                company.funding_stage = data["funding_stage"][:49]
                updated = True
            if data.get("ai_summary") and not company.ai_summary:
                company.ai_summary = data["ai_summary"][:2000]
                updated = True

            if updated:
                await db.commit()
                logger.info(f"Portfolio enrichment complete for {company.name}")
            else:
                logger.info(f"No new data found for {company.name} — nothing updated")

        except Exception as e:
            logger.error(f"Portfolio enrichment failed for score {score_id}: {e}")


async def enrich_portfolio_batch(score_ids: list) -> None:
    """Enrich multiple portfolio companies sequentially with a small delay."""
    import asyncio
    for score_id in score_ids:
        await enrich_portfolio_company(score_id)
        await asyncio.sleep(1)
