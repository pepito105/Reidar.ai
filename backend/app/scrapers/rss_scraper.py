import feedparser
import httpx
import logging
import json
import re
import asyncio
from datetime import datetime
from bs4 import BeautifulSoup
from anthropic import AsyncAnthropic
from app.core.config import settings

logger = logging.getLogger(__name__)
client = AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)

RSS_FEEDS = [
    {"name": "TechCrunch AI", "url": "https://techcrunch.com/category/artificial-intelligence/feed/"},
    {"name": "TechCrunch Startups", "url": "https://techcrunch.com/category/startups/feed/"},
    {"name": "VentureBeat AI", "url": "https://venturebeat.com/category/ai/feed/"},
    {"name": "Hacker News", "url": "https://news.ycombinator.com/rss"},
    {"name": "MIT Tech Review", "url": "https://www.technologyreview.com/feed/"},
    {"name": "Wired Business", "url": "https://www.wired.com/feed/category/business/latest/rss"},
    {"name": "Forbes AI", "url": "https://www.forbes.com/ai/feed/"},
    {"name": "StrictlyVC", "url": "https://strictlyvc.com/feed/"},
    {"name": "SaaStr", "url": "https://www.saastr.com/feed/"},
]


async def _extract_startup_from_article(title: str, summary: str, source_name: str) -> dict | None:
    """Use Claude Haiku to extract structured startup data from an RSS article."""
    prompt = f"""You are analyzing a tech news article to extract startup information.

ARTICLE TITLE: {title}
ARTICLE SUMMARY: {summary[:600]}

Task: Determine if this article is about a specific startup raising funding, launching, or being founded.

Rules:
- Return null if the article is about: an established company (Google, Microsoft, Salesforce, etc.), a person, general industry trends, product updates from big tech, acquisitions of large companies, or anything that is not a new/early-stage startup
- A startup must be: less than ~7 years old, privately held, early-stage (pre-seed through Series B)
- Extract the CLEAN company name only — not "Chinese AI startup Acme" but just "Acme"

Respond with ONLY a JSON object or null:
{{"name": "clean company name", "description": "one sentence what they do", "funding_stage": "pre-seed|seed|series-a|series-b|unknown", "funding_amount": "e.g. $5M or null"}}

If not a startup article, respond with exactly: null"""

    try:
        response = await client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=200,
            messages=[{"role": "user", "content": prompt}]
        )
        raw = response.content[0].text.strip()
        if raw == "null" or raw == "None":
            return None
        raw = re.sub(r'^```(?:json)?\s*', '', raw)
        raw = re.sub(r'\s*```$', '', raw)
        data = json.loads(raw.strip())
        if not data or not data.get("name"):
            return None
        return data
    except Exception as e:
        logger.error(f"Claude extraction failed for '{title}': {e}")
        return None


async def scrape_rss_feeds() -> list:
    results = []
    raw_articles = []

    async with httpx.AsyncClient(timeout=15.0) as client:
        for feed in RSS_FEEDS:
            try:
                response = await client.get(
                    feed["url"],
                    headers={"User-Agent": "Radar/2.0 VC Research Tool"},
                    follow_redirects=True,
                )
                if response.status_code != 200:
                    continue
                parsed = feedparser.parse(response.text)
                for entry in parsed.entries[:15]:
                    title = getattr(entry, "title", "") or ""
                    summary = getattr(entry, "summary", "") or ""
                    link = getattr(entry, "link", "") or ""
                    if not title:
                        continue
                    if summary:
                        soup = BeautifulSoup(summary, "html.parser")
                        summary = soup.get_text(separator=" ").strip()

                    # Date filter — only last 26 hours
                    pub_date = None
                    if hasattr(entry, "published_parsed") and entry.published_parsed:
                        try:
                            pub_date = datetime(*entry.published_parsed[:6])
                        except Exception:
                            pass
                    if pub_date:
                        age = datetime.utcnow() - pub_date
                        if age.total_seconds() > 26 * 3600:
                            continue

                    # Quick pre-filter — must mention startup signals
                    text = (title + " " + summary).lower()
                    startup_signals = ["raises", "funding", "seed", "series a", "series b",
                                      "launches", "startup", "founded", "raises $", "million",
                                      "backed by", "venture", "just raised", "secures"]
                    if not any(s in text for s in startup_signals):
                        continue

                    raw_articles.append({
                        "title": title,
                        "summary": summary,
                        "link": link,
                        "pub_date": pub_date,
                        "source": feed["name"],
                    })
            except Exception as e:
                logger.error(f"RSS error for {feed['name']}: {e}")

    logger.info(f"RSS: {len(raw_articles)} candidate articles — extracting with Claude...")

    # Process articles in batches of 5 concurrently
    async def process_article(article):
        data = await _extract_startup_from_article(
            article["title"], article["summary"], article["source"]
        )
        if not data:
            return None
        return {
            "name": data["name"],
            "description": data.get("description", article["title"]),
            "website": None,
            "source": f"RSS:{article['source']}",
            "source_url": article["link"],
            "funding_stage": data.get("funding_stage", "unknown"),
            "top_investors": [],
            "scraped_at": article["pub_date"] or datetime.utcnow(),
        }

    # Process in batches of 5 to avoid rate limits
    for i in range(0, len(raw_articles), 5):
        batch = raw_articles[i:i+5]
        batch_results = await asyncio.gather(*[process_article(a) for a in batch])
        results.extend([r for r in batch_results if r])
        if i + 5 < len(raw_articles):
            await asyncio.sleep(1)

    logger.info(f"RSS scraping complete: {len(results)} startups extracted from {len(raw_articles)} articles")
    return results
