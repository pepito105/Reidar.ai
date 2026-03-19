"""
Research service — Brave Search + Firecrawl + Claude pipeline.
Replaces the Anthropic web_search tool in research_startup.
"""
import logging
import httpx
from typing import Optional
from app.core.config import settings

logger = logging.getLogger(__name__)


async def brave_search(query: str, count: int = 5, freshness: str = None) -> list[dict]:
    """
    Search the web using Brave Search API.
    Returns list of {title, url, description}.
    freshness options: 'pd' (past day), 'pw' (past week), 'pm' (past month)
    """
    if not settings.BRAVE_API_KEY:
        logger.warning("No BRAVE_API_KEY configured")
        return []
    try:
        params = {"q": query, "count": count, "search_lang": "en"}
        if freshness:
            params["freshness"] = freshness
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://api.search.brave.com/res/v1/web/search",
                params=params,
                headers={
                    "X-Subscription-Token": settings.BRAVE_API_KEY,
                    "Accept": "application/json",
                },
                timeout=10,
            )
            data = response.json()
            results = data.get("web", {}).get("results", [])
            return [
                {
                    "title": r.get("title", ""),
                    "url": r.get("url", ""),
                    "description": r.get("description", ""),
                }
                for r in results
            ]
    except Exception as e:
        logger.warning(f"Brave search failed for '{query}': {e}")
        return []


async def firecrawl_scrape(url: str, max_length: int = 3000) -> Optional[str]:
    """Scrape a URL using Firecrawl and return clean markdown content."""
    if not settings.FIRECRAWL_API_KEY:
        return None
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.firecrawl.dev/v1/scrape",
                headers={
                    "Authorization": f"Bearer {settings.FIRECRAWL_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={"url": url, "formats": ["markdown"]},
                timeout=15,
            )
            data = response.json()
            content = data.get("data", {}).get("markdown", "")
            return content[:max_length] if content else None
    except Exception as e:
        logger.warning(f"Firecrawl scrape failed for {url}: {e}")
        return None


async def research_with_brave_and_firecrawl(
    name: str,
    description: str,
    website: Optional[str],
    queries: list[str],
    progress_callback=None,
) -> tuple[str, list[str], Optional[str]]:
    """
    Run research using Brave Search + Firecrawl.
    Returns (research_findings, sources_visited).
    """
    all_results = []
    sources_visited = []

    # Step 1 — Search with Brave
    for query in queries:
        if progress_callback:
            await progress_callback(f"🔍 Searching: {query}")
        results = await brave_search(query, count=5)
        all_results.extend(results)
        for r in results:
            if r["url"] not in sources_visited:
                sources_visited.append(r["url"])

    # Step 2 — Scrape top URLs with Firecrawl
    # Prioritize: company website first, then top search results
    urls_to_scrape = []
    if website:
        urls_to_scrape.append(website)

    # Add top unique URLs from search results (excluding already added)
    seen = set(urls_to_scrape)
    for r in all_results:
        url = r["url"]
        if url not in seen and len(urls_to_scrape) < 5:
            # Skip social media and irrelevant domains
            skip_domains = ["linkedin.com", "twitter.com", "facebook.com", "instagram.com"]
            if not any(d in url for d in skip_domains):
                urls_to_scrape.append(url)
                seen.add(url)

    scraped_content = []
    homepage_content = None
    for i, url in enumerate(urls_to_scrape):
        if progress_callback:
            domain = url.split("/")[2] if "/" in url else url
            await progress_callback(f"📄 Reading {domain}...")
        content = await firecrawl_scrape(url)
        if content:
            scraped_content.append(f"SOURCE: {url}\n{content}")
            if i == 0 and website and url == website:
                homepage_content = content

    # Step 3 — Combine search snippets + scraped content
    findings_parts = []

    # Add search result snippets
    if all_results:
        findings_parts.append("SEARCH RESULTS:")
        for r in all_results[:10]:
            findings_parts.append(f"- [{r['title']}]({r['url']}): {r['description']}")

    # Add scraped content
    if scraped_content:
        findings_parts.append("\nFULL PAGE CONTENT:")
        findings_parts.extend(scraped_content)

    research_findings = "\n\n".join(findings_parts)

    if progress_callback:
        await progress_callback(f"📰 Found {len(sources_visited)} sources. Structuring investment brief...")

    return research_findings, sources_visited, homepage_content
