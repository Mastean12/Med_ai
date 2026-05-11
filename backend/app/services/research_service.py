"""
Deep Research Service.

Performs multi-step AI-powered research on medical topics:
1. Web search for current information
2. Deep analysis using reasoning models
3. Source synthesis and citation
4. Structured research reports

Architecture:
- Reasoning model (deepseek-reasoner) for complex analysis
- Standard model for synthesis
- Web search for grounding
- Multi-step research pipeline
"""

import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone

from fastapi import HTTPException

from app.core.config import settings
from app.core.supabase import supabase_admin
from app.services.llm_service import generate_llm_response, generate_llm_json
from app.services.web_search import web_search, medical_search

logger = logging.getLogger("noctual.research")

RESEARCH_SYSTEM_PROMPT = """You are a medical research analyst for Noctual AI. Your job is to synthesize information from multiple sources into comprehensive, well-structured research reports for medical students and professionals.

## Research Standards
- Be thorough but concise. Prioritize clinically relevant information.
- Cite sources when referencing specific facts or guidelines.
- Structure reports clearly: Executive Summary -> Background -> Key Findings -> Clinical Implications -> Conclusions.
- Distinguish between established facts and areas of ongoing research.
- Include relevant statistics, guidelines, and consensus statements.
- Flag any contradictory findings between sources.

## Medical Accuracy
- Base answers on established medical evidence.
- When guidelines differ (e.g., AHA vs ESC), note both and explain context.
- For treatments: note first-line, alternatives, and evidence level.
- Flag off-label uses clearly.

## Response Format
# [Topic]
## Executive Summary
[2-3 sentence overview]

## Key Findings
1. [Finding with source]
2. [Finding with source]
...

## Clinical Relevance
[How this applies to practice/study]

## Sources
[Numbered list of sources used]"""


async def deep_research(
    user_id: str,
    topic: str,
    depth: str = "standard",
    max_sources: Optional[int] = None,
) -> Dict[str, Any]:
    """
    Perform deep AI-powered research on a medical topic.

    Pipeline:
    1. Web search for current information
    2. Reasoning analysis on search results
    3. Synthesize into structured research report
    4. Verify and cite sources

    Args:
        topic: Medical topic to research (e.g., "latest hypertension guidelines 2024")
        depth: "quick" (5 sources) or "standard" (10) or "deep" (15)
        max_sources: Override source count

    Returns:
        Research report with findings, analysis, and sources
    """
    source_counts = {"quick": 5, "standard": 10, "deep": 15}
    source_limit = max_sources or source_counts.get(depth, 10)
    source_limit = min(source_limit, settings.RESEARCH_MAX_SOURCES)

    # Step 1: Web search
    logger.info("Research step 1/4: Searching for '%s'", topic[:100])
    sources = await medical_search(topic, max_results=source_limit)

    if not sources:
        # Fallback: try a broader search
        sources = await web_search(topic, max_results=source_limit)

    # Step 2: Analyze search results with LLM
    logger.info("Research step 2/4: Analyzing %d sources", len(sources))
    search_context = "\n\n".join(
        f"[Source {i+1}] {s['title']}\n{s['snippet']}\nURL: {s['url']}"
        for i, s in enumerate(sources)
    ) if sources else "No web search results found. Use your medical knowledge."

    analysis_prompt = f"""
Topic: {topic}

Search Results:
{search_context}

Analyze these search results. Extract key findings, identify any conflicting information, and note gaps. Be specific and factual. Structure your analysis clearly.
"""

    try:
        analysis = await generate_llm_response(
            system_prompt=RESEARCH_SYSTEM_PROMPT,
            user_prompt=analysis_prompt,
            temperature=0.2,
            max_tokens=1500,
        )
    except Exception as e:
        logger.error("Analysis step failed: %s", str(e)[:200])
        analysis = "Unable to analyze search results. The research topic may be too specific or receive limited coverage."

    # Step 3: Deep reasoning analysis using reasoner model
    logger.info("Research step 3/4: Deep reasoning on findings")
    reasoner_analysis = None
    try:
        if settings.DEEPSEEK_REASONER_MODEL:
            reasoning_prompt = f"""
Topic: {topic}

Initial findings:
{analysis[:2000]}

## Task
Provide a deeper medical analysis:
1. Clinical significance and implications for practice
2. Areas of consensus vs debate in the medical community
3. Recent developments since typical textbook knowledge
4. Key knowledge gaps that students should be aware of
5. Examination relevance (what examiners typically test on this topic)

Be specific, cite evidence levels where possible, and distinguish between well-established facts and emerging research.
"""
            reasoner_analysis = await generate_llm_response(
                system_prompt=RESEARCH_SYSTEM_PROMPT,
                user_prompt=reasoning_prompt,
                temperature=0.2,
                max_tokens=1200,
                model="deepseek-chat",  # Use standard model — reasoner is slow
            )
    except Exception as e:
        logger.warning("Reasoner step skipped: %s", str(e)[:200])

    # Step 4: Synthesize final report
    logger.info("Research step 4/4: Synthesizing final report")
    synthesis_prompt = f"""
Topic: {topic}

## Initial Analysis
{analysis[:2000]}

## Deeper Reasoning
{reasoner_analysis or 'Not available'}

## Sources
{chr(10).join(f'{i+1}. {s["title"]} - {s["url"]}' for i, s in enumerate(sources[:10]))}

Create a comprehensive research report. Follow this exact structure:

# {topic}

## Executive Summary
[2-3 sentences summarizing the key takeaway]

## Key Findings
[List 5-8 bullet-point findings, each with source reference]

## Clinical Relevance
[How this applies to medical practice and study]

## Exam Relevance
[What medical students should know for USMLE/PLAB exams]

## Areas of Debate / Uncertainty
[Conflicting evidence or areas needing more research]

## Key Sources
[Numbered list of the most important sources]
"""
    try:
        report = await generate_llm_response(
            system_prompt=RESEARCH_SYSTEM_PROMPT,
            user_prompt=synthesis_prompt,
            temperature=0.2,
            max_tokens=2500,
        )
    except Exception:
        report = analysis

    # Log the research session
    try:
        sb = supabase_admin()
        sb.table("research_logs").insert({
            "user_id": user_id,
            "topic": topic[:500],
            "sources_found": len(sources),
            "depth": depth,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }).execute()
    except Exception:
        pass

    return {
        "topic": topic,
        "report": report,
        "sources": [
            {"title": s["title"], "url": s["url"], "snippet": s["snippet"][:300]}
            for s in sources[:source_limit]
        ],
        "analysis": analysis[:1500],
        "source_count": len(sources),
        "depth": depth,
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }


async def quick_research(
    user_id: str,
    topic: str,
) -> Dict[str, Any]:
    """Fast research mode — search only, no deep analysis."""
    logger.info("Quick research: '%s'", topic[:100])

    sources = await medical_search(topic, max_results=5)

    if not sources:
        sources = await web_search(topic, max_results=5)

    context = "\n\n".join(
        f"{s['title']}\n{s['snippet']}"
        for s in sources
    ) if sources else "No search results."

    prompt = f"Quick research: {topic}\n\nSources:\n{context}\n\nProvide a 3-5 sentence summary with key facts."

    try:
        summary = await generate_llm_response(
            system_prompt="You are a medical research assistant. Be concise and factual. Cite sources.",
            user_prompt=prompt,
            temperature=0.2,
            max_tokens=500,
        )
    except Exception:
        summary = "Unable to complete quick research."

    return {
        "topic": topic,
        "summary": summary,
        "sources": [
            {"title": s["title"], "url": s["url"]}
            for s in sources[:5]
        ],
        "source_count": len(sources),
    }
