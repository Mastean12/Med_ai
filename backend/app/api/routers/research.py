"""
Deep Research API Router.

Endpoints:
- POST /research/deep   — full deep research (search + analysis + reasoning + synthesis)
- POST /research/quick  — fast research mode (search + summary only)
- POST /research/search — raw web search without analysis
"""

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from typing import Optional

from app.core.auth import get_current_user
from app.services.research_service import deep_research, quick_research
from app.services.web_search import web_search, medical_search

router = APIRouter(prefix="/research", tags=["Research"])


class DeepResearchIn(BaseModel):
    topic: str = Field(..., min_length=3, max_length=2000)
    depth: str = Field(default="standard", description="quick | standard | deep")
    max_sources: Optional[int] = Field(default=None, ge=3, le=30)


class QuickResearchIn(BaseModel):
    topic: str = Field(..., min_length=3, max_length=2000)


class SearchIn(BaseModel):
    query: str = Field(..., min_length=2)
    medical: bool = Field(default=True)
    max_results: int = Field(default=10, ge=1, le=20)


@router.post("/deep")
async def research(payload: DeepResearchIn, user=Depends(get_current_user)):
    """
    Perform deep AI research on a medical topic.

    Multi-step pipeline:
    1. Web search for current information
    2. LLM analysis of search results
    3. Deep reasoning analysis
    4. Synthesize into structured research report with citations

    **Depth levels:**
    - `quick` — 5 sources, faster response
    - `standard` — 10 sources, balanced
    - `deep` — 15 sources, most comprehensive

    Example topics:
    - "2024 ACC/AHA hypertension guidelines"
    - "Latest evidence for SGLT2 inhibitors in heart failure"
    - "CAR-T therapy advances in hematology 2024"
    """
    return await deep_research(
        user_id=user["id"],
        topic=payload.topic,
        depth=payload.depth,
        max_sources=payload.max_sources,
    )


@router.post("/quick")
async def quick(payload: QuickResearchIn, user=Depends(get_current_user)):
    """
    Fast research — web search + brief AI summary.
    Returns a 3-5 sentence summary with key facts.
    """
    return await quick_research(
        user_id=user["id"],
        topic=payload.topic,
    )


@router.post("/search")
async def search(payload: SearchIn, user=Depends(get_current_user)):
    """
    Perform a raw web search (medical-focused if medical=true).
    Returns search results without AI analysis.
    """
    if payload.medical:
        results = await medical_search(payload.query, max_results=payload.max_results)
    else:
        results = await web_search(payload.query, max_results=payload.max_results)

    return {
        "query": payload.query,
        "results": results,
        "count": len(results),
    }
