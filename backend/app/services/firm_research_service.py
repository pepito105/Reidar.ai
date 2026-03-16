import logging
import asyncio
from anthropic import AsyncAnthropic
from app.core.config import settings

logger = logging.getLogger(__name__)
client = AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)


async def enrich_firm_from_website(website_url: str, firm_name: str) -> dict:
    """
    Crawl firm website with Firecrawl and extract structured context using Claude.
    Returns dict with: portfolio_companies, investment_themes, stage_focus, check_size, notes
    """
    if not website_url or not settings.FIRECRAWL_API_KEY:
        return {}

    try:
        from firecrawl import FirecrawlApp
        firecrawl = FirecrawlApp(api_key=settings.FIRECRAWL_API_KEY)

        # Run Firecrawl in executor since it's synchronous
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            None,
            lambda: firecrawl.scrape(website_url, params={"formats": ["markdown"]})
        )

        content = result.get("markdown", "") or result.get("content", "")
        if not content or len(content) < 100:
            logger.warning(f"Firecrawl returned insufficient content for {website_url}")
            return {}

        # Use Claude to extract structured firm context
        prompt = f"""You are analyzing the website of a VC firm called {firm_name}.

Here is the website content:
{content[:8000]}

Extract the following information and return ONLY a valid JSON object:

{{
  "portfolio_companies": ["list of portfolio company names you can identify"],
  "investment_themes": ["2-5 key investment themes in the firm's own words"],
  "stage_focus": ["stages they invest in e.g. pre-seed, seed, series-a"],
  "check_size": "typical check size if mentioned e.g. $500K-$2M",
  "geography": ["geographies they focus on"],
  "notes": "any other relevant context about their investment approach in 1-2 sentences"
}}

If a field cannot be determined from the content, use an empty array [] or null.
Return ONLY the JSON object, no explanation."""

        response = await client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=1000,
            messages=[{"role": "user", "content": prompt}]
        )

        import json
        import re
        raw = response.content[0].text.strip()
        raw = re.sub(r'^```(?:json)?\s*', '', raw)
        raw = re.sub(r'\s*```$', '', raw)
        extracted = json.loads(raw.strip())
        logger.info(f"Successfully enriched firm profile from {website_url}")
        return extracted

    except Exception as e:
        logger.error(f"Failed to enrich firm from website {website_url}: {e}")
        return {}
