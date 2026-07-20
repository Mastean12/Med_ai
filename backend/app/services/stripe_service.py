import logging
from typing import Dict, Any, Optional
from datetime import datetime, timezone

import stripe
from fastapi import HTTPException

from app.core.config import settings
from app.core.plans import PlanTier, PlanStatus, PaymentProvider, PRICE_ID_MAP
from app.core.supabase import supabase_admin
from app.services.subscription_service import get_subscription, upsert_subscription

logger = logging.getLogger("medaitutor.stripe")

stripe.api_key = settings.STRIPE_SECRET_KEY


def _map_plan_key_to_tier(plan_key: str) -> PlanTier:
    """Map user-facing plan key to PlanTier enum."""
    if plan_key == "university":
        return PlanTier.UNIVERSITY
    return PlanTier.PRO


async def create_checkout_session(
    user_id: str,
    user_email: str,
    plan_key: str,
) -> Dict[str, Any]:
    if plan_key not in PRICE_ID_MAP:
        raise HTTPException(status_code=400, detail=f"Unknown plan: {plan_key}")

    price_id = PRICE_ID_MAP[plan_key]
    if not price_id or not price_id.startswith("price_"):
        if settings.ENV == "dev":
            logger.info("DEV MODE: Simulating checkout for %s", plan_key)
            return {
                "checkout_url": f"{settings.APP_BASE_URL}/account/billing?dev_checkout=success&plan={plan_key}",
            }
        raise HTTPException(
            status_code=500,
            detail=f"Stripe Price ID not configured for {plan_key}",
        )

    if not settings.STRIPE_SECRET_KEY:
        raise HTTPException(status_code=501, detail="Stripe is not configured")

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
                "plan_key": plan_key,
            },
            subscription_data={
                "metadata": {
                    "user_id": user_id,
                    "plan_key": plan_key,
                },
            },
            allow_promotion_codes=True,
        )

        return {"checkout_url": session.url}

    except stripe.error.StripeError as e:
        logger.error("Stripe checkout error: %s", str(e))
        raise HTTPException(
            status_code=502, detail=f"Payment service error: {e.user_message or str(e)}"
        )


async def create_customer_portal(user_id: str) -> Dict[str, Any]:
    sub = await get_subscription(user_id)
    customer_id = sub.get("provider_customer_id")

    if not customer_id:
        if settings.ENV == "dev":
            return {"url": f"{settings.APP_BASE_URL}/account/billing?dev_portal=true"}
        raise HTTPException(status_code=404, detail="No Stripe customer found")

    if not settings.STRIPE_SECRET_KEY:
        raise HTTPException(status_code=501, detail="Stripe is not configured")

    try:
        session = stripe.billing_portal.Session.create(
            customer=customer_id,
            return_url=f"{settings.APP_BASE_URL}/account/billing",
        )
        return {"url": session.url}
    except stripe.error.StripeError as e:
        logger.error("Stripe portal error: %s", str(e))
        raise HTTPException(
            status_code=502, detail=f"Payment service error: {e.user_message or str(e)}"
        )


def _get_plan_tier_from_metadata(metadata: Dict[str, str]) -> PlanTier:
    plan_key = metadata.get("plan_key", "pro_monthly")
    return _map_plan_key_to_tier(plan_key)


async def handle_webhook(payload: bytes, signature: str) -> Dict[str, Any]:
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
        elif event_type == "invoice.paid":
            await _handle_invoice_paid(sb, data)
        elif event_type == "invoice.payment_failed":
            await _handle_invoice_failed(sb, data)
        elif event_type in ("customer.subscription.created", "customer.subscription.updated"):
            await _handle_subscription_updated(sb, data)
        elif event_type == "customer.subscription.deleted":
            await _handle_subscription_deleted(sb, data)
    except Exception as e:
        logger.error("Webhook handler error for %s: %s", event_type, str(e))

    return {"received": True, "type": event_type}


async def _handle_checkout_completed(sb, session: Dict[str, Any]):
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
        plan = _get_plan_tier_from_metadata(stripe_sub.metadata)
        await upsert_subscription(
            user_id=user_id,
            plan=plan,
            status=PlanStatus.ACTIVE,
            provider=PaymentProvider.STRIPE,
            provider_subscription_id=subscription_id,
            current_period_end=datetime.fromtimestamp(
                stripe_sub.current_period_end, tz=timezone.utc
            ),
        )


async def _handle_subscription_updated(sb, subscription: Dict[str, Any]):
    user_id = subscription.get("metadata", {}).get("user_id")
    if not user_id:
        customer_id = subscription.get("customer")
        if customer_id:
            try:
                customer = stripe.Customer.retrieve(customer_id)
                user_id = customer.metadata.get("user_id")
            except Exception:
                pass
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
        period_end = datetime.fromtimestamp(subscription["current_period_end"], tz=timezone.utc)

    plan = _get_plan_tier_from_metadata(subscription.get("metadata", {}))

    await upsert_subscription(
        user_id=user_id,
        plan=plan,
        status=plan_status,
        provider=PaymentProvider.STRIPE,
        provider_subscription_id=subscription.get("id"),
        current_period_end=period_end,
    )

    if subscription.get("cancel_at_period_end", False):
        sb.table("subscriptions").update({"cancel_at_period_end": True}).eq("user_id", user_id).execute()


async def _handle_subscription_deleted(sb, subscription: Dict[str, Any]):
    user_id = subscription.get("metadata", {}).get("user_id")
    if user_id:
        await upsert_subscription(
            user_id=user_id,
            plan=PlanTier.FREE,
            status=PlanStatus.CANCELED,
        )


async def _handle_invoice_paid(sb, invoice: Dict[str, Any]):
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
    user_id = invoice.get("metadata", {}).get("user_id")
    if user_id:
        await upsert_subscription(
            user_id=user_id,
            plan=PlanTier.FREE,
            status=PlanStatus.PAST_DUE,
        )
