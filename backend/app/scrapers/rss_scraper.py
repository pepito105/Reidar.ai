import feedparser
import httpx
import logging
from datetime import datetime
from typing import Optional
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

RSS_FEEDS = [
    {"name": "TechCrunch AI", "url": "https://techcrunch.com/category/artificial-intelligence/feed/"},
    {"name": "TechCrunch Startups", "url": "https://techcrunch.com/category/startups/feed/"},
    {"name": "VentureBeat AI", "url": "https://venturebeat.com/category/ai/feed/"},
    {"name": "Hacker News", "url": "https://news.ycombinator.com/rss"},
    {"name": "MIT Tech Review", "url": "https://www.technologyreview.com/feed/"},
    {"name": "Wired Business", "url": "https://www.wired.com/feed/category/business/latest/rss"},
    {"name": "The Verge Tech", "url": "https://www.theverge.com/rss/index.xml"},
    {"name": "Forbes AI", "url": "https://www.forbes.com/ai/feed/"},
    {"name": "Reuters Technology", "url": "https://feeds.reuters.com/reuters/technologyNews"},
    {"name": "Axios", "url": "https://www.axios.com/feeds/feed.rss"},
    {"name": "Bloomberg Technology", "url": "https://feeds.bloomberg.com/technology/news.rss"},
    {"name": "StrictlyVC", "url": "https://strictlyvc.com/feed/"},
    {"name": "SaaStr", "url": "https://www.saastr.com/feed/"},
]

STARTUP_SIGNALS = [
    "raises", "funding", "seed round", "series a", "series b", "launches",
    "startup", "founded", "ai company", "saas", "raises $", "million",
    "backed by", "venture", "announced", "new startup", "just raised",
]

ACTION_WORDS = [
    "raises", "raised", "launches", "launched", "announces", "announced",
    "secures", "secured", "closes", "closed", "lands", "gets", "receives",
    "unveils", "unveiled", "debuts", "introduces", "acquires", "acquired",
]


def _is_startup_article(title: str, summary: str) -> bool:
    text = (title + " " + summary).lower()
    return any(signal in text for signal in STARTUP_SIGNALS)


def _extract_company_name(title: str) -> Optional[str]:
    title_lower = title.lower()
    for action in ACTION_WORDS:
        if action in title_lower:
            idx = title_lower.index(action)
            candidate = title[:idx].strip()
            for prefix in ["Meet ", "How ", "Why ", "The ", "Inside ", "When "]:
                if candidate.startswith(prefix):
                    candidate = candidate[len(prefix):]
            candidate = candidate.rstrip(",:;")
            words = candidate.split()
            if 1 <= len(words) <= 5 and len(candidate) > 1:
                return candidate
    return None


async def scrape_rss_feeds() -> list:
    results = []
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
                for entry in parsed.entries[:20]:
                    title = getattr(entry, "title", "") or ""
                    summary = getattr(entry, "summary", "") or ""
                    link = getattr(entry, "link", "") or ""
                    if summary:
                        soup = BeautifulSoup(summary, "html.parser")
                        summary = soup.get_text(separator=" ").strip()
                    if not title or not _is_startup_article(title, summary):
                        continue
                    company_name = _extract_company_name(title)
                    if not company_name:
                        continue
                    pub_date = None
                    if hasattr(entry, "published_parsed") and entry.published_parsed:
                        try:
                            pub_date = datetime(*entry.published_parsed[:6])
                        except Exception:
                            pass
                    results.append({
                        "name": company_name,
                        "description": f"{title}. {summary[:400]}".strip(),
                        "website": None,
                        "source": f"RSS:{feed['name']}",
                        "source_url": link,
                        "funding_stage": "unknown",
                        "top_investors": [],
                        "scraped_at": pub_date or datetime.utcnow(),
                    })
            except Exception as e:
                logger.error(f"RSS error for {feed['name']}: {e}")
    logger.info(f"RSS scraping complete: {len(results)} companies found")
    return results
