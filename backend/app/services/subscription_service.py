"""
Subscription Management Service.

Handles plan CRUD, provider sync, and status lifecycle.
"""
import logging
from datetime import datetime, timezone
from typing import Dict, Any, Optional

from fastapi import HTTPException

from app.core.supabase import supabase_admin
from app.core.plans import PlanTier, PlanStatus, PaymentProvider

logger = logging.getLogger("noctual.subscriptions")


async def get_subscription(user_id: str) -> Dict[str, Any]:
    """Get current subscription for a user. Returns free tier default if none."""
    sb = supabase_admin()
    try:
        res = (
            sb.table("subscriptions")
            .select("*")
            .eq("user_id", user_id)
            .single()
            .execute()
        )
        if res.data:
            return res.data
    except Exception:
        pass

    return {
        "plan": PlanTier.FREE.value,
        "status": PlanStatus.ACTIVE.value,
        "provider": None,
        "current_period_end": None,
    }


async def get_active_plan(user_id: str) -> PlanTier:
    """Get the user's active plan tier. Defaults to FREE."""
    sub = await get_subscription(user_id)
    try:
        return PlanTier(sub.get("plan", PlanTier.FREE.value))
    except ValueError:
        return PlanTier.FREE


async def upsert_subscription(
    user_id: str,
    plan: PlanTier,
    status: PlanStatus = PlanStatus.ACTIVE,
    provider: Optional[PaymentProvider] = None,
    provider_customer_id: Optional[str] = None,
    provider_subscription_id: Optional[str] = None,
    current_period_end: Optional[datetime] = None,
    metadata: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Create or update a subscription record."""
    sb = supabase_admin()
    now = datetime.now(timezone.utc).isoformat()

    payload: Dict[str, Any] = {
        "plan": plan.value,
        "status": status.value,
        "updated_at": now,
    }

    if provider is not None:
        payload["provider"] = provider.value
    if provider_customer_id is not None:
        payload["provider_customer_id"] = provider_customer_id
    if provider_subscription_id is not None:
        payload["provider_subscription_id"] = provider_subscription_id
    if current_period_end is not None:
        payload["current_period_end"] = current_period_end.isoformat()
    if metadata is not None:
        payload["metadata"] = metadata

    try:
        existing = (
            sb.table("subscriptions")
            .select("id")
            .eq("user_id", user_id)
            .single()
            .execute()
        )

        if existing.data:
            res = (
                sb.table("subscriptions")
                .update(payload)
                .eq("user_id", user_id)
                .execute()
            )
        else:
            payload["user_id"] = user_id
            payload["created_at"] = now
            res = sb.table("subscriptions").insert(payload).execute()

        return res.data[0] if res.data else {}
    except Exception as e:
        logger.error("Failed to upsert subscription: %s", str(e))
        raise HTTPException(status_code=500, detail="Failed to update subscription")


async def cancel_subscription(user_id: str) -> Dict[str, Any]:
    """Mark subscription for cancellation at period end."""
    sb = supabase_admin()
    try:
        res = (
            sb.table("subscriptions")
            .update({
                "cancel_at_period_end": True,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            })
            .eq("user_id", user_id)
            .execute()
        )
        return res.data[0] if res.data else {}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to cancel: {e}")
