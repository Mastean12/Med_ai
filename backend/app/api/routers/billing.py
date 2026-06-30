"""
Billing Router.
"""
import logging
import stripe
from fastapi import APIRouter, Depends, Request, HTTPException

from app.core.auth import get_current_user
from app.core.config import settings
from app.core.supabase import supabase_admin
from app.schemas.billing import (
    CheckoutIn, CheckoutOut, PortalOut, SubscriptionOut,
    StkPushIn, StkPushOut, UsageSummaryOut,
)
from app.services.subscription_service import get_subscription
from app.services.stripe_service import (
    create_checkout_session, create_customer_portal, handle_webhook,
)
from app.services.mpesa_service import stk_push, process_callback
from app.services.usage_service import get_usage_summary

logger = logging.getLogger("noctual.billing_router")

router = APIRouter(tags=["Billing"])
stripe_router = APIRouter(tags=["Stripe"])


@router.post("/create-checkout-session", response_model=CheckoutOut)
async def create_stripe_checkout(
    payload: CheckoutIn,
    user=Depends(get_current_user),
):
    return await create_checkout_session(
        user_id=user["id"],
        user_email=user.get("email", ""),
        plan_key=payload.plan,
    )


@router.post("/create-customer-portal", response_model=PortalOut)
async def customer_portal(user=Depends(get_current_user)):
    return await create_customer_portal(user_id=user["id"])


@router.get("/subscription", response_model=SubscriptionOut)
async def get_my_subscription(user=Depends(get_current_user)):
    sub = await get_subscription(user["id"])
    return SubscriptionOut(
        plan=sub.get("plan", "free"),
        status=sub.get("status", "active"),
        provider=sub.get("provider"),
        current_period_end=sub.get("current_period_end"),
        cancel_at_period_end=sub.get("cancel_at_period_end", False),
        stripe_customer_id=sub.get("provider_customer_id"),
        stripe_subscription_id=sub.get("provider_subscription_id"),
        renewal_date=sub.get("current_period_end"),
    )


@router.get("/usage", response_model=UsageSummaryOut)
async def my_usage(user=Depends(get_current_user)):
    summary = await get_usage_summary(user["id"])
    return UsageSummaryOut(**summary)


@router.post("/cancel")
async def cancel_my_subscription(user=Depends(get_current_user)):
    try:
        sb = supabase_admin()
        sub = await get_subscription(user["id"])
        stripe_sub_id = sub.get("provider_subscription_id")
        if stripe_sub_id:
            stripe.api_key = settings.STRIPE_SECRET_KEY
            stripe.Subscription.modify(stripe_sub_id, cancel_at_period_end=True)
        sb.table("subscriptions").update({
            "cancel_at_period_end": True,
            "updated_at": "now()",
        }).eq("user_id", user["id"]).execute()
        return {"canceled": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)[:200])


@stripe_router.post("/webhook")
async def stripe_webhook(request: Request):
    payload = await request.body()
    signature = request.headers.get("stripe-signature", "")
    return await handle_webhook(payload, signature)


@router.post("/mpesa/stk-push", response_model=StkPushOut)
async def mpesa_stk_push(payload: StkPushIn, user=Depends(get_current_user)):
    return await stk_push(
        user_id=user["id"],
        phone_number=payload.phone_number,
        amount=payload.amount,
        account_reference=f"Noctual-{payload.plan}",
        transaction_desc="Subscription",
    )


@router.post("/mpesa/callback")
async def mpesa_callback(request: Request):
    body = await request.json()
    return await process_callback(body)
