"""
Usage Tracking & Feature Gating Service.

Tracks user feature consumption per billing period,
enforces plan limits, and provides usage analytics.
"""
import logging
from datetime import date, timedelta
from typing import Dict, Any, Optional

from fastapi import HTTPException

from app.core.supabase import supabase_admin
from app.core.plans import (
    PlanTier, Feature, PLAN_LIMITS, PlanStatus,
)
from app.services.subscription_service import get_active_plan

logger = logging.getLogger("medaitutor.usage")


def _current_period() -> tuple[date, date]:
    """Return (period_start, period_end) for the current billing month."""
    today = date.today()
    start = today.replace(day=1)
    if today.month == 12:
        end = today.replace(year=today.year + 1, month=1, day=1) - timedelta(days=1)
    else:
        end = today.replace(month=today.month + 1, day=1) - timedelta(days=1)
    return start, end


async def _get_or_create_counter(
    user_id: str, feature: Feature, period_start: date, period_end: date
) -> Dict[str, Any]:
    """Get existing counter or create a new one for this period."""
    sb = supabase_admin()
    try:
        res = (
            sb.table("usage_tracking")
            .select("*")
            .eq("user_id", user_id)
            .eq("feature", feature.value)
            .eq("period_start", period_start.isoformat())
            .maybe_single()
            .execute()
        )
        if res.data:
            return res.data
    except Exception:
        pass

    try:
        res = (
            sb.table("usage_tracking")
            .insert({
                "user_id": user_id,
                "feature": feature.value,
                "usage_count": 0,
                "period_start": period_start.isoformat(),
                "period_end": period_end.isoformat(),
            })
            .execute()
        )
        return res.data[0] if res.data else {"usage_count": 0}
    except Exception:
        return {"usage_count": 0}


async def get_usage(user_id: str, feature: Feature) -> int:
    """Get current usage count for a feature in this period."""
    start, end = _current_period()
    counter = await _get_or_create_counter(user_id, feature, start, end)
    return counter.get("usage_count", 0)


async def increment_usage(user_id: str, feature: Feature) -> int:
    """Increment usage and return new count."""
    start, end = _current_period()
    counter = await _get_or_create_counter(user_id, feature, start, end)
    new_count = counter.get("usage_count", 0) + 1

    sb = supabase_admin()
    try:
        sb.table("usage_tracking").update({
            "usage_count": new_count,
            "updated_at": "now()",
        }).eq("id", counter["id"]).execute()
    except Exception:
        pass

    return new_count


async def check_feature_access(user_id: str, feature: Feature) -> bool:
    """
    Check if user has remaining usage for a feature.
    Returns True if access is allowed.
    """
    plan = await get_active_plan(user_id)
    limit = PLAN_LIMITS[plan].get(feature, 0)

    if limit == -1:
        return True

    current = await get_usage(user_id, feature)
    return current < limit


async def enforce_feature_access(user_id: str, feature: Feature):
    """
    Enforce feature gating — raises 402 if limit exceeded.

    Usage:
        await enforce_feature_access(user_id, Feature.AI_QUESTIONS)
        # Proceed with AI request...
        await increment_usage(user_id, Feature.AI_QUESTIONS)
    """
    plan = await get_active_plan(user_id)
    limit = PLAN_LIMITS[plan].get(feature, 0)

    if limit == -1:
        return

    current = await get_usage(user_id, feature)

    if current >= limit:
        raise HTTPException(
            status_code=402,
            detail=(
                f"You've reached your {plan.value} plan limit for {feature.value} "
                f"({current}/{limit}). Upgrade to continue."
            ),
        )


async def get_usage_summary(user_id: str) -> Dict[str, Any]:
    """Get a summary of all feature usage for the current period."""
    start, _ = _current_period()
    plan = await get_active_plan(user_id)

    sb = supabase_admin()
    try:
        res = (
            sb.table("usage_tracking")
            .select("feature, usage_count")
            .eq("user_id", user_id)
            .gte("period_start", start.isoformat())
            .execute()
        )
        rows = res.data or []
    except Exception:
        rows = []

    features_used: Dict[str, int] = {}
    for row in rows:
        features_used[row["feature"]] = row["usage_count"]

    summary = {
        "plan": plan.value,
        "period": start.isoformat(),
        "features": {},
    }

    for feat in Feature:
        feat_key = feat.value
        used = features_used.get(feat_key, 0)
        limit = PLAN_LIMITS[plan].get(feat, 0)
        summary["features"][feat_key] = {
            "used": used,
            "limit": None if limit == -1 else limit,
            "unlimited": limit == -1,
            "remaining": None if limit == -1 else max(0, limit - used),
        }

    return summary
