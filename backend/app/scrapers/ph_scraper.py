import httpx
import logging
from datetime import datetime
from app.core.config import settings

logger = logging.getLogger(__name__)

PH_API_URL = "https://api.producthunt.com/v2/api/graphql"

PH_QUERY = """
query {{
  posts(first: 30, order: VOTES) {{
    edges {{
      node {{
        name
        tagline
        description
        url
        website
        votesCount
        createdAt
        topics {{
          edges {{
            node {{
              name
            }}
          }}
        }}
      }}
    }}
  }}
}}
"""

B2B_TOPICS = [
    "artificial intelligence", "saas", "developer tools", "productivity",
    "marketing", "sales", "analytics", "automation", "api", "no-code",
    "machine learning", "enterprise", "b2b", "finance", "security"
]


async def scrape_producthunt() -> list:
    if not getattr(settings, 'PRODUCTHUNT_API_KEY', None):
        logger.warning("No ProductHunt API key configured — skipping ProductHunt scrape")
        return []

    results = []
    async with httpx.AsyncClient(timeout=20.0) as client:
        try:
            response = await client.post(
                PH_API_URL,
                json={"query": PH_QUERY},
                headers={
                    "Authorization": f"Bearer {settings.PRODUCTHUNT_API_KEY}",
                    "Content-Type": "application/json",
                    "User-Agent": "Radar/2.0 VC Research Tool",
                },
            )
            if response.status_code != 200:
                logger.warning(f"ProductHunt API returned {response.status_code}")
                return []

            data = response.json()
            posts = data.get("data", {}).get("posts", {}).get("edges", [])

            for edge in posts:
                post = edge.get("node", {})
                name = post.get("name", "").strip()
                if not name:
                    continue

                # Get topics
                topics = [
                    t["node"]["name"].lower()
                    for t in post.get("topics", {}).get("edges", [])
                ]

                # Filter to B2B/tech relevant topics
                if not any(bt in " ".join(topics) for bt in B2B_TOPICS):
                    continue

                tagline = post.get("tagline", "")
                description = post.get("description", "") or tagline
                website = post.get("website") or post.get("url", "")

                results.append({
                    "name": name,
                    "description": f"{tagline}. {description[:400]}".strip(". "),
                    "website": website,
                    "source": "ProductHunt",
                    "source_url": post.get("url", ""),
                    "funding_stage": "pre-seed",
                    "top_investors": [],
                    "scraped_at": datetime.utcnow(),
                })

            logger.info(f"ProductHunt API: {len(results)} relevant products")
        except Exception as e:
            logger.error(f"ProductHunt scrape error: {e}")
    return results
