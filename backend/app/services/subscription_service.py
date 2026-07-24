"""
Subscription Management Service.
"""
import logging
from datetime import datetime, timezone
from typing import Dict, Any, Optional

from app.core.supabase import supabase_admin
from app.core.plans import PlanTier, PlanStatus, PaymentProvider

logger = logging.getLogger("medaitutor.subscriptions")


async def get_subscription(user_id: str) -> Dict[str, Any]:
    sb = supabase_admin()
    try:
        res = sb.table("subscriptions").select("*").eq("user_id", user_id).maybe_single().execute()
        if res.data:
            return res.data
    except Exception as e:
        logger.warning("get_subscription failed for %s: %s", user_id, str(e))

    return {
        "plan": PlanTier.FREE.value,
        "status": PlanStatus.ACTIVE.value,
        "provider": None,
        "current_period_end": None,
    }


async def get_active_plan(user_id: str) -> PlanTier:
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
        # First try updating existing record
        res = sb.table("subscriptions").update(payload).eq("user_id", user_id).execute()
        if res.data and len(res.data) > 0:
            return res.data[0]
    except Exception as e:
        logger.warning("Subscription update failed (will try insert): %s", str(e))

    # No existing record or update failed — insert new one
    try:
        payload["user_id"] = user_id
        payload["created_at"] = now
        if "updated_at" not in payload:
            payload["updated_at"] = now
        res = sb.table("subscriptions").insert(payload).execute()
        if res.data and len(res.data) > 0:
            return res.data[0]
        # Insert returned no data (204). Try select to confirm.
        sel = sb.table("subscriptions").select("*").eq("user_id", user_id).maybe_single().execute()
        if sel.data:
            return sel.data
    except Exception as e:
        logger.error("Subscription insert also failed: %s", str(e))

    # Last resort — select to see if it was saved despite errors
    try:
        sel = sb.table("subscriptions").select("*").eq("user_id", user_id).maybe_single().execute()
        if sel.data:
            return sel.data
    except Exception:
        pass

    logger.error("Failed to upsert subscription for user %s after all attempts", user_id)
    return {}


async def cancel_subscription(user_id: str) -> Dict[str, Any]:
    sb = supabase_admin()
    try:
        sb.table("subscriptions").update({
            "cancel_at_period_end": True,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }).eq("user_id", user_id).execute()
        return {"canceled": True}
    except Exception as e:
        logger.error("Cancel subscription failed: %s", str(e))
        return {"canceled": False, "error": str(e)[:200]}
