"""
Stripe Integration Service.

Handles checkout sessions, webhooks, customer portal, and
subscription lifecycle synchronization with Stripe.
"""
import logging
from typing import Dict, Any, Optional
from datetime import datetime, timezone

import stripe
from fastapi import HTTPException

from app.core.config import settings
from app.core.plans import PlanTier, PlanStatus, PaymentProvider, STRIPE_PRICES
from app.core.supabase import supabase_admin
from app.services.subscription_service import (
    get_subscription, upsert_subscription,
)

logger = logging.getLogger("noctual.stripe")

stripe.api_key = settings.STRIPE_SECRET_KEY


async def create_checkout_session(
    user_id: str,
    user_email: str,
    plan: PlanTier,
    billing_interval: str = "monthly",
) -> Dict[str, Any]:
    """
    Create a Stripe Checkout session for subscribing to a plan.

    Args:
        user_id: The authenticated user ID
        user_email: User's email for the Stripe customer
        plan: Target plan tier (pro or premium)
        billing_interval: "monthly" or "yearly"

    Returns:
        Dict with checkout_url and session_id
    """
    if plan == PlanTier.FREE:
        raise HTTPException(status_code=400, detail="Cannot checkout free plan")

    if not settings.STRIPE_SECRET_KEY:
        raise HTTPException(
            status_code=501, detail="Stripe is not configured"
        )

    price_id = STRIPE_PRICES.get(plan, {}).get(billing_interval)

    # Dev mode — simulate checkout when Stripe isn't fully configured
    if not price_id or not price_id.startswith("price_"):
        if settings.ENV == "dev":
            logger.info("DEV MODE: Simulating checkout for %s %s", plan.value, billing_interval)
            return {
                "checkout_url": f"{settings.APP_BASE_URL}/account/billing?dev_checkout=success&plan={plan.value}",
                "session_id": f"dev_session_{user_id[:12]}",
            }
        raise HTTPException(
            status_code=500,
            detail=f"Stripe Price ID not configured for {plan.value} {billing_interval}",
        )

    sub = await get_subscription(user_id)
    customer_id = sub.get("provider_customer_id")

    try:
        if not customer_id:
            customer = stripe.Customer.create(
                email=user_email,
                metadata={"user_id": user_id},
            )
            customer_id = customer.id
            await upsert_subscription(
                user_id=user_id,
                plan=PlanTier.FREE,
                provider=PaymentProvider.STRIPE,
                provider_customer_id=customer_id,
            )

        session = stripe.checkout.Session.create(
            customer=customer_id,
            payment_method_types=["card"],
            line_items=[{"price": price_id, "quantity": 1}],
            mode="subscription",
            success_url=f"{settings.APP_BASE_URL}/account/billing?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{settings.APP_BASE_URL}/pricing?canceled=true",
            metadata={
                "user_id": user_id,
                "plan": plan.value,
                "billing_interval": billing_interval,
            },
            subscription_data={
                "metadata": {
                    "user_id": user_id,
                    "plan": plan.value,
                },
            },
            allow_promotion_codes=True,
        )

        return {"checkout_url": session.url, "session_id": session.id}

    except stripe.error.StripeError as e:
        logger.error("Stripe checkout error: %s", str(e))
        raise HTTPException(
            status_code=502, detail=f"Payment service error: {e.user_message or str(e)}"
        )


async def create_customer_portal(user_id: str) -> Dict[str, Any]:
    """Create a Stripe Customer Portal session."""
    sub = await get_subscription(user_id)
    customer_id = sub.get("provider_customer_id")

    if not customer_id:
        if settings.ENV == "dev":
            return {"portal_url": f"{settings.APP_BASE_URL}/account/billing?dev_portal=true"}
        raise HTTPException(status_code=404, detail="No Stripe customer found for your account")

    if not settings.STRIPE_SECRET_KEY:
        raise HTTPException(status_code=501, detail="Stripe is not configured")

    try:
        session = stripe.billing_portal.Session.create(
            customer=customer_id,
            return_url=f"{settings.APP_BASE_URL}/account/billing",
        )
        return {"portal_url": session.url}
    except stripe.error.StripeError as e:
        logger.error("Stripe portal error: %s", str(e))
        raise HTTPException(
            status_code=502, detail=f"Payment service error: {e.user_message or str(e)}"
        )


async def handle_webhook(payload: bytes, signature: str) -> Dict[str, Any]:
    """
    Process Stripe webhook events reliably.

    Events handled:
    - checkout.session.completed → record payment, activate subscription
    - customer.subscription.updated → sync subscription status
    - customer.subscription.deleted → cancel subscription
    - invoice.paid → record invoice
    - invoice.payment_failed → mark past_due
    """
    if not settings.STRIPE_WEBHOOK_SECRET:
        raise HTTPException(status_code=501, detail="Stripe webhook not configured")

    try:
        event = stripe.Webhook.construct_event(
            payload, signature, settings.STRIPE_WEBHOOK_SECRET
        )
    except stripe.error.SignatureVerificationError:
        logger.error("Invalid Stripe webhook signature")
        raise HTTPException(status_code=400, detail="Invalid signature")
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid payload")

    event_type = event["type"]
    data = event["data"]["object"]
    logger.info("Stripe webhook: %s", event_type)

    sb = supabase_admin()

    try:
        if event_type == "checkout.session.completed":
            await _handle_checkout_completed(sb, data)

        elif event_type == "customer.subscription.updated":
            await _handle_subscription_updated(sb, data)

        elif event_type == "customer.subscription.deleted":
            await _handle_subscription_deleted(sb, data)

        elif event_type == "invoice.paid":
            await _handle_invoice_paid(sb, data)

        elif event_type == "invoice.payment_failed":
            await _handle_invoice_failed(sb, data)

    except Exception as e:
        logger.error("Webhook processing error: %s", str(e))
        # Don't raise — Stripe will retry

    return {"received": True, "type": event_type}


async def _handle_checkout_completed(sb, session: Dict[str, Any]):
    """Record payment and activate subscription."""
    user_id = session.get("metadata", {}).get("user_id")
    if not user_id:
        return

    sb.table("payment_transactions").insert({
        "user_id": user_id,
        "provider": "stripe",
        "amount": (session.get("amount_total", 0) / 100),
        "currency": session.get("currency", "usd"),
        "status": "completed",
        "reference": session.get("id"),
        "provider_checkout_id": session.get("id"),
    }).execute()

    subscription_id = session.get("subscription")
    if subscription_id:
        stripe_sub = stripe.Subscription.retrieve(subscription_id)
        await upsert_subscription(
            user_id=user_id,
            plan=PlanTier(stripe_sub.metadata.get("plan", "pro")),
            status=PlanStatus.ACTIVE,
            provider=PaymentProvider.STRIPE,
            provider_subscription_id=subscription_id,
            current_period_end=datetime.fromtimestamp(
                stripe_sub.current_period_end, tz=timezone.utc
            ),
        )


async def _handle_subscription_updated(sb, subscription: Dict[str, Any]):
    """Sync subscription status changes."""
    user_id = subscription.get("metadata", {}).get("user_id")
    if not user_id:
        return

    status_map = {
        "active": PlanStatus.ACTIVE,
        "past_due": PlanStatus.PAST_DUE,
        "unpaid": PlanStatus.UNPAID,
        "canceled": PlanStatus.CANCELED,
        "trialing": PlanStatus.TRIALING,
    }
    stripe_status = subscription.get("status", "active")
    plan_status = status_map.get(stripe_status, PlanStatus.ACTIVE)

    period_end = None
    if subscription.get("current_period_end"):
        period_end = datetime.fromtimestamp(
            subscription.current_period_end, tz=timezone.utc
        )

    cancel_at_end = subscription.get("cancel_at_period_end", False)

    await upsert_subscription(
        user_id=user_id,
        plan=PlanTier(subscription.metadata.get("plan", "pro")),
        status=plan_status,
        provider=PaymentProvider.STRIPE,
        provider_subscription_id=subscription.get("id"),
        current_period_end=period_end,
    )

    if cancel_at_end:
        await upsert_subscription(user_id=user_id, plan=PlanTier.FREE, status=PlanStatus.ACTIVE)


async def _handle_subscription_deleted(sb, subscription: Dict[str, Any]):
    """Handle subscription cancellation."""
    user_id = subscription.get("metadata", {}).get("user_id")
    if user_id:
        await upsert_subscription(
            user_id=user_id,
            plan=PlanTier.FREE,
            status=PlanStatus.CANCELED,
        )


async def _handle_invoice_paid(sb, invoice: Dict[str, Any]):
    """Record paid invoice."""
    user_id = invoice.get("metadata", {}).get("user_id")
    if not user_id:
        customer_id = invoice.get("customer")
        if customer_id:
            try:
                customer = stripe.Customer.retrieve(customer_id)
                user_id = customer.metadata.get("user_id")
            except Exception:
                pass
    if not user_id:
        return

    sb.table("invoices").insert({
        "user_id": user_id,
        "provider": "stripe",
        "provider_invoice_id": invoice.get("id"),
        "amount": (invoice.get("amount_paid", 0) / 100),
        "currency": invoice.get("currency", "usd"),
        "status": "paid",
        "invoice_url": invoice.get("hosted_invoice_url"),
        "invoice_pdf": invoice.get("invoice_pdf"),
        "period_start": (
            datetime.fromtimestamp(invoice["period_start"], tz=timezone.utc).isoformat()
            if invoice.get("period_start") else None
        ),
        "period_end": (
            datetime.fromtimestamp(invoice["period_end"], tz=timezone.utc).isoformat()
            if invoice.get("period_end") else None
        ),
        "paid_at": datetime.now(timezone.utc).isoformat(),
    }).execute()


async def _handle_invoice_failed(sb, invoice: Dict[str, Any]):
    """Handle failed payment — mark subscription past_due."""
    user_id = invoice.get("metadata", {}).get("user_id")
    if user_id:
        await upsert_subscription(
            user_id=user_id,
            plan=PlanTier.FREE,  # doesn't matter, status overrides
            status=PlanStatus.PAST_DUE,
        )
