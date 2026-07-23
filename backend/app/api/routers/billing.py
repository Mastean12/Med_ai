"""
Unified Billing Router — routes to M-Pesa (Kenya) or Lemon Squeezy (International).
"""
import logging
import hashlib
import hmac
from fastapi import APIRouter, Depends, Request, HTTPException

from app.core.auth import get_current_user
from app.core.config import settings
from app.core.supabase import supabase_admin
from app.schemas.billing import (
    CheckoutIn, CheckoutOut, PortalOut, SubscriptionOut,
    StkPushIn, StkPushOut, UsageSummaryOut,
)
from app.services.subscription_service import get_subscription
from app.services.lemonsqueezy_service import (
    create_checkout as ls_create_checkout,
    create_customer_portal as ls_create_portal,
    verify_webhook as ls_verify_webhook,
)
from app.services.mpesa_service import stk_push, process_callback
from app.services.usage_service import get_usage_summary

logger = logging.getLogger("medaitutor.billing_router")

router = APIRouter(tags=["Billing"])


@router.post("/create-checkout-session", response_model=CheckoutOut)
async def unified_checkout(
    payload: CheckoutIn,
    user=Depends(get_current_user),
):
    region = (payload.country or "").upper()

    # Kenyan phone numbers = M-Pesa
    if region == "KE" or payload.phone_number:
        if not payload.phone_number:
            raise HTTPException(status_code=400, detail="Phone number required for M-Pesa")
        result = await stk_push(
            user_id=user["id"],
            phone_number=payload.phone_number,
            amount=_get_kes_amount(payload.plan),
            account_reference=f"MT-{payload.plan}",
        )
        return {"checkout_url": None, "mpesa": result}

    # International = Lemon Squeezy
    return await ls_create_checkout(
        user_id=user["id"],
        user_email=user.get("email", ""),
        plan_key=payload.plan,
    )


@router.post("/create-customer-portal", response_model=PortalOut)
async def customer_portal(user=Depends(get_current_user)):
    sub = await get_subscription(user["id"])
    provider = sub.get("provider", "")

    if provider == "lemonsqueezy":
        return await ls_create_portal(user["id"])
    if provider == "mpesa":
        return {"url": f"{settings.APP_BASE_URL}/account/billing?support=mpesa"}

    return {"url": f"{settings.APP_BASE_URL}/account/billing"}


@router.get("/subscription", response_model=SubscriptionOut)
async def get_my_subscription(user=Depends(get_current_user)):
    sub = await get_subscription(user["id"])
    return SubscriptionOut(
        plan=sub.get("plan", "free"),
        status=sub.get("status", "active"),
        provider=sub.get("provider"),
        current_period_end=sub.get("current_period_end"),
        cancel_at_period_end=sub.get("cancel_at_period_end", False),
        provider_customer_id=sub.get("provider_customer_id"),
        renewal_date=sub.get("current_period_end"),
    )


@router.get("/usage", response_model=UsageSummaryOut)
async def my_usage(user=Depends(get_current_user)):
    summary = await get_usage_summary(user["id"])
    return UsageSummaryOut(**summary)


def _get_kes_amount(plan_key: str) -> int:
    """Return KES amount for a plan key."""
    mapping = {
        "pro_monthly": 2700, "pro_yearly": 27000,
        "premium_monthly": 7000, "premium_yearly": 70000,
    }
    return mapping.get(plan_key, 2700)


@router.post("/lemonsqueezy/webhook")
async def ls_webhook(request: Request):
    payload = await request.body()
    signature = request.headers.get("x-signature", "")
    return await ls_verify_webhook(payload, signature)


@router.post("/mpesa/stk-push", response_model=StkPushOut)
async def mpesa_stk_push(payload: StkPushIn, user=Depends(get_current_user)):
    return await stk_push(
        user_id=user["id"],
        phone_number=payload.phone_number,
        amount=payload.amount,
        account_reference=f"MT-{payload.plan}",
        transaction_desc="Subscription",
    )


@router.post("/mpesa/callback")
async def mpesa_callback(request: Request):
    body = await request.json()
    return await process_callback(body)
