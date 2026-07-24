"""
Lemon Squeezy Payment Service (International).

Handles Checkout Sessions, Customer Portal (via Lemon Squeezy),
and Webhook verification for subscription management.
"""
import logging
import hashlib
import hmac
from typing import Dict, Any, Optional
from datetime import datetime, timezone

import httpx
from fastapi import HTTPException, Request

from app.core.config import settings
from app.core.plans import PlanTier, PlanStatus, PaymentProvider, PRICE_ID_MAP
from app.core.supabase import supabase_admin
from app.services.subscription_service import get_subscription, upsert_subscription

logger = logging.getLogger("medaitutor.lemonsqueezy")

LEMONSQUEEZY_API = "https://api.lemonsqueezy.com/v1"


def _api_headers() -> dict:
    api_key = settings.LEMONSQUEEZY_API_KEY
    if not api_key:
        raise HTTPException(status_code=503, detail="Lemon Squeezy is not configured. Set LEMONSQUEEZY_API_KEY in environment variables.")
    return {
        "Authorization": f"Bearer {api_key}",
        "Accept": "application/json",
        "Content-Type": "application/json",
    }


async def create_checkout(user_id: str, user_email: str, plan_key: str) -> Dict[str, Any]:
    logger.info("Checkout requested: plan=%s user=%s", plan_key, user_id[:12])

    variant_id = PRICE_ID_MAP.get(plan_key)
    if not variant_id:
        logger.error("Unknown plan key: %s (available: %s)", plan_key, list(PRICE_ID_MAP.keys()))
        raise HTTPException(status_code=400, detail=f"Unknown plan: {plan_key}")

    try:
        headers = _api_headers()
        async with httpx.AsyncClient(timeout=30.0) as client:
            res = await client.post(
                f"{LEMONSQUEEZY_API}/checkouts",
                headers=_api_headers(),
                json={
                    "data": {
                        "type": "checkouts",
                        "attributes": {
                            "product_variant_id": int(variant_id),
                            "email": user_email,
                            "custom_price": None,
                            "product_options": {
                                "redirect_url": f"{settings.APP_BASE_URL}/account/billing",
                                "receipt_button_text": "Go to Billing",
                                "receipt_link_url": f"{settings.APP_BASE_URL}/account/billing",
                            },
                            "checkout_options": {
                                "embed": False,
                                "media": False,
                                "logo": True,
                                "button_color": "#5B5CEB",
                            },
                            "expires_at": None,
                            "preview": False,
                            "test_mode": settings.ENV != "production",
                        },
                        "relationships": {
                            "store": {"data": {"type": "stores", "id": settings.LEMONSQUEEZY_STORE_ID}}
                        },
                    }
                },
            )

        data = res.json()
        if res.status_code not in (200, 201):
            logger.error("LS checkout error: %s", data)
            raise HTTPException(status_code=502, detail="Payment provider error")

        checkout_url = data.get("data", {}).get("attributes", {}).get("url")
        if not checkout_url:
            raise HTTPException(status_code=502, detail="No checkout URL returned")

        return {"checkout_url": checkout_url}

    except HTTPException:
        raise
    except Exception as e:
        logger.error("LS checkout exception: %s", str(e))
        raise HTTPException(status_code=502, detail="Checkout service unavailable")


async def create_customer_portal(user_id: str) -> Dict[str, Any]:
    sub = await get_subscription(user_id)
    ls_customer_id = sub.get("provider_customer_id")

    if not ls_customer_id:
        if settings.ENV == "dev":
            return {"url": f"{settings.APP_BASE_URL}/account/billing?dev_portal=true"}
        raise HTTPException(status_code=404, detail="No Lemon Squeezy customer found")

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            res = await client.get(
                f"{LEMONSQUEEZY_API}/customers/{ls_customer_id}",
                headers=_api_headers(),
            )
        if res.status_code != 200:
            logger.error("LS customer fetch error: %s", res.text[:500])
            raise HTTPException(status_code=502, detail="Failed to fetch customer")

        return {"url": f"https://app.lemonsqueezy.com/billing/{ls_customer_id}"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error("LS portal error: %s", str(e))
        raise HTTPException(status_code=502, detail="Customer portal unavailable")


async def verify_webhook(payload: bytes, signature: str) -> Dict[str, Any]:
    secret = settings.LEMONSQUEEZY_WEBHOOK_SECRET
    if not secret:
        raise HTTPException(status_code=503, detail="Lemon Squeezy webhook not configured. Contact support.")

    computed = hmac.new(secret.encode(), payload, hashlib.sha256).hexdigest()
    if not hmac.compare_digest(computed, signature):
        raise HTTPException(status_code=400, detail="Invalid webhook signature")

    import json
    event = json.loads(payload)
    event_name = event.get("meta", {}).get("event_name", "")
    custom_data = event.get("meta", {}).get("custom_data", {})
    logger.info("LS webhook: %s", event_name)

    sb = supabase_admin()

    try:
        if event_name == "order_created":
            await _handle_order_created(sb, event, custom_data)
        elif event_name == "subscription_created":
            await _handle_subscription_event(sb, event, custom_data)
        elif event_name == "subscription_updated":
            await _handle_subscription_event(sb, event, custom_data)
        elif event_name == "subscription_cancelled":
            await _handle_subscription_cancelled(sb, event, custom_data)
    except Exception as e:
        logger.error("LS webhook handler error: %s", str(e))

    return {"received": True}


async def _handle_order_created(sb, event: Dict, custom_data: Dict):
    user_id = custom_data.get("user_id")
    if not user_id:
        return

    attributes = event.get("data", {}).get("attributes", {})
    sb.table("payment_transactions").insert({
        "user_id": user_id,
        "provider": "lemonsqueezy",
        "amount": (attributes.get("total", 0) / 100),
        "currency": attributes.get("currency", "usd"),
        "status": "completed",
        "reference": event.get("data", {}).get("id"),
    }).execute()


async def _handle_subscription_event(sb, event: Dict, custom_data: Dict):
    user_id = custom_data.get("user_id")
    if not user_id:
        return

    attributes = event.get("data", {}).get("attributes", {})
    status_map = {
        "active": PlanStatus.ACTIVE,
        "cancelled": PlanStatus.CANCELED,
        "past_due": PlanStatus.PAST_DUE,
        "paused": PlanStatus.CANCELED,
        "expired": PlanStatus.CANCELED,
    }
    ls_status = attributes.get("status", "active")
    plan_status = status_map.get(ls_status, PlanStatus.ACTIVE)

    variant_id = attributes.get("variant_id")
    plan = PlanTier.PRO
    for key, val in PRICE_ID_MAP.items():
        if str(val) == str(variant_id):
            if key.startswith("premium"):
                plan = PlanTier.PREMIUM
            else:
                plan = PlanTier.PRO
            break

    period_end = None
    if attributes.get("renews_at"):
        try:
            period_end = datetime.fromisoformat(attributes["renews_at"].replace("Z", "+00:00"))
        except Exception:
            pass

    customer_id = str(attributes.get("customer_id", ""))
    sub_id = str(event.get("data", {}).get("id", ""))

    try:
        await upsert_subscription(
            user_id=user_id,
            plan=plan,
            status=plan_status,
            provider=PaymentProvider.LEMONSQUEEZY,
            provider_customer_id=customer_id,
            provider_subscription_id=sub_id,
            current_period_end=period_end,
        )
    except Exception as e:
        logger.error("Subscription sync failed for webhook %s: %s", event_name, str(e))


async def _handle_subscription_cancelled(sb, event: Dict, custom_data: Dict):
    user_id = custom_data.get("user_id")
    if user_id:
        sb.table("subscriptions").update({"cancel_at_period_end": True}).eq("user_id", user_id).execute()
