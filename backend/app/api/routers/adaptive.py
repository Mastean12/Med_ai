"""
Adaptive Learning API Router.

Endpoints:
- GET /adaptive/profile        — learning profile
- GET /adaptive/mastery        — topic mastery summary
- GET /adaptive/recommendations — AI study recommendations
- GET /adaptive/insights       — comprehensive learning insights
"""

from fastapi import APIRouter, Depends

from app.core.auth import get_current_user
from app.services.adaptive_service import (
    get_learning_profile,
    get_mastery_summary,
    generate_recommendations,
    get_learning_insights,
)

router = APIRouter(prefix="/adaptive", tags=["Adaptive"])


@router.get("/profile")
async def profile(user=Depends(get_current_user)):
    """Get your learning profile."""
    return await get_learning_profile(user["id"])


@router.get("/mastery")
async def mastery(user=Depends(get_current_user)):
    """
    Get your topic mastery summary.

    Shows all topics, mastery scores, strengths (≥70%),
    and weaknesses (<40%).
    """
    return await get_mastery_summary(user["id"])


@router.get("/recommendations")
async def recommendations(user=Depends(get_current_user)):
    """
    Get personalized study recommendations.

    Based on your mastery data, identifies weak topics
    and suggests focused review sessions.
    """
    return await generate_recommendations(user["id"])


@router.get("/insights")
async def insights(user=Depends(get_current_user)):
    """
    Comprehensive learning insights.

    Combines mastery, exam performance, study activity,
    and personalized recommendations into one view.
    """
    return await get_learning_insights(user["id"])
