"""
Web Search Utility.

Supports two backends:
1. DuckDuckGo Instant Answer API (free, no key needed)
2. Tavily Search API (paid, higher quality)

Priority: Tavily if configured, otherwise DuckDuckGo.
"""

import logging
from typing import List, Dict, Any
from urllib.parse import quote_plus

import httpx

from app.core.config import settings

logger = logging.getLogger("medaitutor.search")

DUCKDUCKGO_API = "https://api.duckduckgo.com"
TAVILY_API = "https://api.tavily.com/search"


async def search_duckduckgo(query: str, max_results: int = 10) -> List[Dict[str, str]]:
    """
    Search using DuckDuckGo's free API.
    Returns list of {title, snippet, url} dicts.
    """
    results: List[Dict[str, str]] = []

    try:
        params = {
            "q": query,
            "format": "json",
            "no_html": "1",
            "skip_disambig": "1",
        }
        async with httpx.AsyncClient(timeout=15.0) as client:
            res = await client.get(DUCKDUCKGO_API, params=params)

        if res.status_code != 200:
            logger.warning("DuckDuckGo returned %d", res.status_code)
            return results

        data = res.json()

        abstract = data.get("Abstract", "").strip()
        abstract_url = data.get("AbstractURL", "")
        if abstract and abstract_url:
            results.append({
                "title": data.get("Heading", "Result"),
                "snippet": abstract[:600],
                "url": abstract_url,
            })

        answer = data.get("Answer", "").strip()
        if answer:
            results.append({
                "title": "Instant Answer",
                "snippet": answer[:600],
                "url": abstract_url or "",
            })

        for topic in data.get("RelatedTopics", [])[:max_results - len(results)]:
            if isinstance(topic, dict):
                text = topic.get("Text", "")
                url = topic.get("FirstURL", "")
                if text and url:
                    parts = text.split(" - ", 1)
                    results.append({
                        "title": parts[0][:100] if len(parts) > 1 else text[:100],
                        "snippet": parts[1][:500] if len(parts) > 1 else "",
                        "url": url,
                    })

        return results[:max_results]
    except Exception as e:
        logger.warning("DuckDuckGo search failed: %s", str(e)[:200])
        return results


async def search_tavily(query: str, max_results: int = 10) -> List[Dict[str, str]]:
    """
    Search using Tavily API (higher quality, requires API key).
    Returns list of {title, content, url} dicts.
    """
    if not settings.TAVILY_API_KEY:
        return []

    results: List[Dict[str, str]] = []

    try:
        payload = {
            "api_key": settings.TAVILY_API_KEY,
            "query": query,
            "search_depth": "advanced",
            "max_results": max_results,
            "include_answer": True,
        }
        async with httpx.AsyncClient(timeout=30.0) as client:
            res = await client.post(TAVILY_API, json=payload)

        if res.status_code != 200:
            logger.warning("Tavily returned %d", res.status_code)
            return results

        data = res.json()

        answer = data.get("answer", "").strip()
        if answer:
            results.append({
                "title": "AI Answer",
                "snippet": answer[:600],
                "url": "",
            })

        for r in data.get("results", [])[:max_results]:
            results.append({
                "title": r.get("title", "")[:200],
                "snippet": (r.get("content") or r.get("snippet", ""))[:600],
                "url": r.get("url", ""),
            })

        return results[:max_results]
    except Exception as e:
        logger.warning("Tavily search failed: %s", str(e)[:200])
        return results


async def web_search(query: str, max_results: int = 10) -> List[Dict[str, str]]:
    """
    Search the web, preferring Tavily if configured, falling back to DuckDuckGo.
    """
    if settings.TAVILY_API_KEY:
        results = await search_tavily(query, max_results)
        if results:
            return results
        logger.info("Tavily returned no results, falling back to DuckDuckGo")

    return await search_duckduckgo(query, max_results)


async def medical_search(query: str, max_results: int = 10) -> List[Dict[str, str]]:
    """
    Medical-focused search. Appends 'medical' context to the query for better results.
    """
    medical_query = f"{query} medical education guideline clinical"
    return await web_search(medical_query, max_results)
