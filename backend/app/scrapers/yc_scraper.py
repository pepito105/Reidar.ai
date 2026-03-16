import httpx
import logging
from datetime import datetime
from typing import Optional

logger = logging.getLogger(__name__)

YC_API_URL = "https://api.ycombinator.com/v0.1/companies"
YC_BATCHES = ["S25", "W25", "S24", "W24"]


async def scrape_yc_companies() -> list:
    results = []
    async with httpx.AsyncClient(timeout=20.0) as client:
        for batch in YC_BATCHES:
            try:
                response = await client.get(
                    YC_API_URL,
                    params={"batch": batch, "page": 1},
                    headers={"User-Agent": "Radar/2.0 VC Research Tool", "Accept": "application/json"},
                    follow_redirects=True,
                )
                if response.status_code == 200:
                    data = response.json()
                    companies = data.get("companies", [])
                    for c in companies:
                        name = c.get("name", "").strip()
                        if not name:
                            continue
                        one_liner = c.get("one_liner", "")
                        description = c.get("long_description", "") or one_liner
                        results.append({
                            "name": name,
                            "description": f"{one_liner}. {description}".strip(". "),
                            "website": c.get("website") or c.get("url"),
                            "source": "YC",
                            "source_url": f"https://www.ycombinator.com/companies/{c.get('slug', '')}",
                            "funding_stage": "seed",
                            "top_investors": ["Y Combinator"],
                            "founding_year": _parse_year(c.get("founded_date") or c.get("year_founded")),
                            "scraped_at": datetime.utcnow(),
                        })
                    logger.info(f"YC {batch}: {len(companies)} companies")
                else:
                    logger.warning(f"YC API returned {response.status_code} for {batch}")
            except Exception as e:
                logger.error(f"YC scrape error for {batch}: {e}")
    logger.info(f"YC scraping complete: {len(results)} companies")
    return results


def _parse_year(value) -> Optional[int]:
    if not value:
        return None
    try:
        return int(str(value)[:4])
    except (ValueError, TypeError):
        return None
