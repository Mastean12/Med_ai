"""
Billing Router.

Endpoints:
- GET  /billing/subscription     — current subscription status
- POST /billing/create-checkout  — Stripe checkout session
- POST /billing/customer-portal  — Stripe customer portal
- POST /billing/webhook          — Stripe webhook receiver
- POST /billing/mpesa/stk-push   — M-Pesa STK Push initiation
- POST /billing/mpesa/callback   — M-Pesa payment callback
- GET  /billing/usage            — current usage summary
"""

import logging
from typing import Optional

from fastapi import APIRouter, Depends, Request, HTTPException

from app.core.auth import get_current_user
from app.core.plans import PlanTier
from app.schemas.billing import (
    CheckoutIn, CheckoutOut, PortalOut, SubscriptionOut,
    StkPushIn, StkPushOut, UsageSummaryOut,
)
from app.services.subscription_service import (
    get_subscription, cancel_subscription,
)
from app.services.stripe_service import (
    create_checkout_session, create_customer_portal, handle_webhook,
)
from app.services.mpesa_service import stk_push, process_callback
from app.services.usage_service import get_usage_summary

logger = logging.getLogger("noctual.billing_router")

router = APIRouter(tags=["Billing"])


@router.get("/subscription", response_model=SubscriptionOut)
async def get_my_subscription(user=Depends(get_current_user)):
    """Get the current user's subscription status and plan details."""
    sub = await get_subscription(user["id"])
    return SubscriptionOut(**sub)


@router.post("/create-checkout", response_model=CheckoutOut)
async def create_stripe_checkout(
    payload: CheckoutIn,
    user=Depends(get_current_user),
):
    """
    Create a Stripe Checkout session for upgrading to Pro or Premium.

    Returns a URL to redirect to Stripe's hosted checkout page.
    """
    return await create_checkout_session(
        user_id=user["id"],
        user_email=user.get("email", ""),
        plan=PlanTier(payload.plan.value),
        billing_interval=payload.billing_interval.value,
    )


@router.post("/customer-portal", response_model=PortalOut)
async def customer_portal(user=Depends(get_current_user)):
    """
    Create a Stripe Customer Portal session for managing
    payment methods, invoices, and subscription.
    """
    return await create_customer_portal(user_id=user["id"])


@router.post("/webhook")
async def stripe_webhook(request: Request):
    """
    Stripe webhook endpoint.

    Receives events from Stripe for subscription lifecycle,
    payment confirmations, and invoice processing.

    Must be configured in Stripe Dashboard:
    https://dashboard.stripe.com/webhooks
    """
    payload = await request.body()
    signature = request.headers.get("stripe-signature", "")

    return await handle_webhook(payload, signature)


@router.post("/cancel")
async def cancel_my_subscription(user=Depends(get_current_user)):
    """Cancel the current subscription (at period end for Stripe)."""
    return await cancel_subscription(user_id=user["id"])


@router.post("/mpesa/stk-push", response_model=StkPushOut)
async def mpesa_stk_push(
    payload: StkPushIn,
    user=Depends(get_current_user),
):
    """
    Initiate M-Pesa STK Push payment (Kenya).

    A push notification will appear on the user's phone.
    They must enter their M-Pesa PIN to complete.

    Supported: Safaricom Kenya
    """
    return await stk_push(
        user_id=user["id"],
        phone_number=payload.phone_number,
        amount=payload.amount,
        account_reference=f"Noctual-{payload.plan.value}",
        transaction_desc="Subscription",
    )


@router.post("/mpesa/callback")
async def mpesa_callback(request: Request):
    """
    M-Pesa callback receiver.

    Safaricom sends payment confirmation to this URL after
    the user completes or cancels the STK Push on their phone.
    """
    body = await request.json()
    return await process_callback(body)


@router.get("/usage", response_model=UsageSummaryOut)
async def my_usage(user=Depends(get_current_user)):
    """Get current period usage across all features."""
    summary = await get_usage_summary(user["id"])
    return UsageSummaryOut(**summary)
