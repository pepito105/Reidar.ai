import asyncio
import logging
import httpx
from bs4 import BeautifulSoup
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from anthropic import AsyncAnthropic
from app.core.config import settings
from app.models.startup import Startup
from app.models.firm_profile import FirmProfile

logger = logging.getLogger(__name__)

client = AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xhtml;q=0.9,*/*;q=0.8",
}


async def fetch_website_content(url: str) -> str | None:
    """Fetch and extract clean content from a website using Firecrawl."""
    if not url:
        return None
    try:
        if not url.startswith("http"):
            url = f"https://{url}"

        if settings.FIRECRAWL_API_KEY:
            from firecrawl import FirecrawlApp
            app = FirecrawlApp(api_key=settings.FIRECRAWL_API_KEY)
            # Run sync Firecrawl in thread pool to avoid blocking
            loop = asyncio.get_event_loop()
            result = await loop.run_in_executor(
                None,
                lambda: app.scrape(url, formats=['markdown'])
            )
            if result and result.markdown:
                return result.markdown[:4000]
            else:
                logger.warning(f"Firecrawl returned no content for {url}, falling back to httpx")

        # Fallback to httpx/BeautifulSoup if no Firecrawl key or Firecrawl failed
        async with httpx.AsyncClient(timeout=15, follow_redirects=True, headers=HEADERS) as http:
            response = await http.get(url)
            if response.status_code != 200:
                logger.warning(f"Website returned {response.status_code}: {url}")
                return None
            soup = BeautifulSoup(response.text, "html.parser")
            for tag in soup(["script", "style", "nav", "footer", "header", "aside", "iframe"]):
                tag.decompose()
            content_parts = []
            for selector in ["main", "article", "[class*='hero']", "[class*='about']", "[class*='product']", "body"]:
                elements = soup.select(selector)
                for el in elements[:2]:
                    text = el.get_text(separator=" ", strip=True)
                    if len(text) > 100:
                        content_parts.append(text)
                        break
                if content_parts:
                    break
            if not content_parts:
                content_parts = [soup.get_text(separator=" ", strip=True)]
            content = " ".join(content_parts)
            return content[:3000] if content else None

    except Exception as e:
        logger.warning(f"Failed to fetch {url}: {e}")
        return None


async def research_company(company: Startup, db: AsyncSession, firm_mandate: str = "") -> bool:
    """
    Autonomously research a company by visiting their website and enriching
    their profile with Claude.
    Returns True if successful, False if failed.
    """
    logger.info(f"Researching {company.name} ({company.website})")

    # Step 1: Fetch website
    website_content = await fetch_website_content(company.website)
    if not website_content or len(website_content) < 100:
        logger.warning(f"No useful content for {company.name} — marking as failed")
        company.research_status = "failed"
        company.research_completed_at = datetime.utcnow()
        await db.commit()
        return False

    # Step 2: Build Claude prompt
    prompt = f"""You are an AI investment analyst. You have just visited the website of a startup and read its content. Your job is to enrich the company profile based on what you found.

FIRM MANDATE:
{firm_mandate or "Early-stage technology startups"}

COMPANY NAME: {company.name}
ORIGINAL ONE-LINER: {company.one_liner or "Unknown"}
FUNDING STAGE: {company.funding_stage or "Unknown"}
WEBSITE CONTENT:
{website_content}

Based on the website content, provide a structured analysis. Respond in this exact JSON format with no other text:
{{
  "enriched_one_liner": "A precise, sharp one-liner (max 15 words) describing what this company does and for whom",
  "business_model": "How they make money — pricing model, revenue type (SaaS/usage/marketplace/etc), typical contract size if inferrable",
  "target_customer": "Who buys this — company size, role, industry, pain point being solved",
  "traction_signals": "Any evidence of traction — customers named, metrics mentioned, growth signals, notable partnerships or investors",
  "red_flags": "Any concerns — vague value prop, crowded space, no clear monetization, early team, etc. Write 'None identified' if none",
  "fit_reasoning": "1-2 sentences on why this does or does not fit the firm mandate"
}}"""

    try:
        response = await client.messages.create(
            model="claude-opus-4-5",
            max_tokens=1000,
            messages=[{"role": "user", "content": prompt}]
        )
        raw = response.content[0].text.strip()

        # Parse JSON response
        import json
        # Strip markdown code blocks if present
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        data = json.loads(raw.strip())

        # Update company record
        company.enriched_one_liner = data.get("enriched_one_liner")
        company.business_model = data.get("business_model")
        company.target_customer = data.get("target_customer")
        company.traction_signals = data.get("traction_signals")
        company.red_flags = data.get("red_flags")
        if data.get("fit_reasoning"):
            company.fit_reasoning = data["fit_reasoning"]
        company.website_content = website_content[:1000]  # Store truncated version
        company.research_status = "completed"
        company.research_completed_at = datetime.utcnow()
        await db.commit()

        logger.info(f"Research complete for {company.name}")
        return True

    except Exception as e:
        logger.error(f"Claude research failed for {company.name}: {e}", exc_info=True)
        company.research_status = "failed"
        company.research_completed_at = datetime.utcnow()
        await db.commit()
        return False


async def run_research_batch(db: AsyncSession, limit: int = 50) -> dict:
    """
    Run autonomous research on companies that haven't been researched yet.
    Prioritizes by fit score. Called after nightly scrape.
    """
    # Get firm mandate
    profile_result = await db.execute(
        select(FirmProfile).where(FirmProfile.is_active == True)
    )
    profile = profile_result.scalar_one_or_none()
    firm_mandate = profile.investment_thesis if profile else ""

    # Find unresearched companies, prioritized by fit score
    result = await db.execute(
        select(Startup)
        .where(Startup.research_status == None)
        .where(Startup.website != None)
        .order_by(Startup.fit_score.desc())
        .limit(limit)
    )
    companies = result.scalars().all()

    if not companies:
        logger.info("No companies to research")
        return {"researched": 0, "failed": 0, "total": 0}

    logger.info(f"Starting research batch: {len(companies)} companies")
    researched = 0
    failed = 0

    for company in companies:
        success = await research_company(company, db, firm_mandate)
        if success:
            researched += 1
        else:
            failed += 1
        # Small delay to be polite to websites and avoid rate limits
        import asyncio
        await asyncio.sleep(2)

    logger.info(f"Research batch complete: {researched} succeeded, {failed} failed")
    return {"researched": researched, "failed": failed, "total": len(companies)}
