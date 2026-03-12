import feedparser
import httpx
import logging
from datetime import datetime
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

RELEVANT_KEYWORDS = ['ai', 'saas', 'api', 'b2b', 'enterprise', 'automation', 'ml', 'llm', 'agent']


async def scrape_producthunt() -> list:
    results = []
    async with httpx.AsyncClient(timeout=20.0) as client:
        try:
            response = await client.get(
                'https://www.producthunt.com/feed',
                headers={'User-Agent': 'Radar/2.0 VC Research Tool'},
                follow_redirects=True,
            )
            if response.status_code != 200:
                logger.warning(f'ProductHunt returned {response.status_code}')
                return []
            parsed = feedparser.parse(response.text)
            for entry in parsed.entries[:40]:
                title = getattr(entry, 'title', '') or ''
                summary = getattr(entry, 'summary', '') or ''
                link = getattr(entry, 'link', '') or ''
                if not title:
                    continue
                if summary:
                    soup = BeautifulSoup(summary, 'html.parser')
                    summary = soup.get_text(separator=' ').strip()
                text = (title + ' ' + summary).lower()
                if not any(kw in text for kw in RELEVANT_KEYWORDS):
                    continue
                name = title.split(' - ')[0].strip()
                desc = title + '. ' + summary[:400]
                results.append({
                    'name': name,
                    'description': desc.strip(),
                    'website': None,
                    'source': 'ProductHunt',
                    'source_url': link,
                    'funding_stage': 'pre-seed',
                    'top_investors': [],
                    'scraped_at': datetime.utcnow(),
                })
            logger.info(f'ProductHunt: {len(results)} relevant products')
        except Exception as e:
            logger.error(f'ProductHunt scrape error: {e}')
    return results
