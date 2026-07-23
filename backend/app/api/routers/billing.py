"""
Billing Router — subscription management & usage.
"""
import logging
from fastapi import APIRouter, Depends, HTTPException

from app.core.auth import get_current_user
from app.core.config import settings
from app.core.supabase import supabase_admin
from app.schemas.billing import (
    SubscriptionOut, StkPushIn, StkPushOut, UsageSummaryOut,
)
from app.services.subscription_service import get_subscription
from app.services.mpesa_service import stk_push
from app.services.usage_service import get_usage_summary

logger = logging.getLogger("medaitutor.billing_router")

router = APIRouter(prefix="/billing", tags=["Billing"])


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


@router.post("/mpesa/stk-push", response_model=StkPushOut)
async def mpesa_stk_push(payload: StkPushIn, user=Depends(get_current_user)):
    return await stk_push(
        user_id=user["id"],
        phone_number=payload.phone_number,
        amount=payload.amount,
        account_reference=f"MT-{payload.plan}",
        transaction_desc="Subscription",
    )
