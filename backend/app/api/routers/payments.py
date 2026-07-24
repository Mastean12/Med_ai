"""
Payments Router — M-Pesa (Kenya) & Lemon Squeezy (International).
"""
import logging
import traceback
from fastapi import APIRouter, Depends, Request, HTTPException
from pydantic import BaseModel, Field
from typing import Optional

from app.core.auth import get_current_user
from app.core.config import settings
from app.schemas.billing import CheckoutOut, PortalOut, StkPushOut
from app.services.lemonsqueezy_service import (
    create_checkout as ls_create_checkout,
    create_customer_portal as ls_create_portal,
    verify_webhook as ls_verify_webhook,
)
from app.services.mpesa_service import stk_push, process_callback
from app.core.supabase import supabase_admin
from app.core.plans import PlanTier, PlanStatus, PaymentProvider

logger = logging.getLogger("medaitutor.payments")

router = APIRouter(prefix="/payments", tags=["Payments"])


class LSCheckoutIn(BaseModel):
    plan: str  # "pro_monthly", "pro_yearly", "premium_monthly", "premium_yearly"


class LSCheckoutOut(BaseModel):
    checkout_url: Optional[str] = None


class MpesaStkIn(BaseModel):
    phone_number: str = Field(..., min_length=12, max_length=12)
    plan: str = "pro_monthly"


class MpesaStkOut(BaseModel):
    checkout_request_id: Optional[str] = None
    merchant_request_id: Optional[str] = None
    status: str
    message: str


@router.post("/lemonsqueezy/checkout", response_model=LSCheckoutOut)
async def ls_checkout(payload: LSCheckoutIn, user=Depends(get_current_user)):
    try:
        return await ls_create_checkout(
            user_id=user["id"],
            user_email=user.get("email", ""),
            plan_key=payload.plan,
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error("LS checkout error: %s\n%s", str(e), traceback.format_exc())
        raise HTTPException(status_code=502, detail="Checkout service unavailable")


@router.post("/lemonsqueezy/portal", response_model=PortalOut)
async def ls_portal(user=Depends(get_current_user)):
    try:
        return await ls_create_portal(user["id"])
    except HTTPException:
        raise
    except Exception as e:
        logger.error("LS portal error: %s\n%s", str(e), traceback.format_exc())
        raise HTTPException(status_code=502, detail="Portal unavailable")


@router.post("/webhook/lemonsqueezy")
async def ls_webhook(request: Request):
    payload = await request.body()
    signature = request.headers.get("x-signature", "")
    try:
        return await ls_verify_webhook(payload, signature)
    except HTTPException:
        raise
    except Exception as e:
        logger.error("LS webhook error: %s\n%s", str(e), traceback.format_exc())
        raise HTTPException(status_code=500, detail="Webhook processing failed")


@router.post("/mpesa/stk-push", response_model=MpesaStkOut)
async def mpesa_stk(payload: MpesaStkIn, user=Depends(get_current_user)):
    amount_map = {
        "student_pro_monthly": 2700, "student_pro_annual": 27000,
        "premium_monthly": 7000, "premium_annual": 70000,
    }
    amount = amount_map.get(payload.plan, 2700)
    try:
        return await stk_push(
            user_id=user["id"],
            phone_number=payload.phone_number,
            amount=amount,
            account_reference=f"MT-{payload.plan}",
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error("M-Pesa STK error: %s\n%s", str(e), traceback.format_exc())
        raise HTTPException(status_code=502, detail="M-Pesa payment failed")


@router.post("/webhook/mpesa")
async def mpesa_webhook(request: Request):
    body = await request.json()
    return await process_callback(body)
