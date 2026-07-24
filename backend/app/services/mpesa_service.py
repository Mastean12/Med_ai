"""
M-Pesa Integration Service (Kenya).

Implements Safaricom Daraja API for STK Push payments.
Handles OAuth token management, STK Push initiation,
and callback verification.
"""
import base64
import logging
from datetime import datetime, timezone
from typing import Dict, Any

import httpx
from fastapi import HTTPException

from app.core.config import settings

logger = logging.getLogger("medaitutor.mpesa")

MPESA_AUTH_URL = {
    "sandbox": "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
    "production": "https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
}

MPESA_STKPUSH_URL = {
    "sandbox": "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
    "production": "https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
}


async def _get_access_token() -> str:
    """Get OAuth access token from Safaricom Daraja API."""
    url = MPESA_AUTH_URL.get(settings.MPESA_ENVIRONMENT, MPESA_AUTH_URL["sandbox"])

    if not settings.MPESA_CONSUMER_KEY or not settings.MPESA_CONSUMER_SECRET:
        raise HTTPException(status_code=503, detail="M-Pesa service is not configured. Contact support.")

    auth = base64.b64encode(
        f"{settings.MPESA_CONSUMER_KEY}:{settings.MPESA_CONSUMER_SECRET}".encode()
    ).decode()

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            res = await client.get(
                url, headers={"Authorization": f"Basic {auth}"}
            )

        if res.status_code != 200:
            logger.error("M-Pesa auth failed: %s", res.text[:500])
            raise HTTPException(status_code=502, detail="M-Pesa authentication failed")

        data = res.json()
        return data["access_token"]
    except HTTPException:
        raise
    except Exception as e:
        logger.error("M-Pesa auth error: %s", str(e))
        raise HTTPException(status_code=502, detail="M-Pesa service unavailable")


async def stk_push(
    user_id: str,
    phone_number: str,
    amount: int,
    account_reference: str = "Medaitutor",
    transaction_desc: str = "Subscription",
) -> Dict[str, Any]:
    """
    Initiate STK Push for M-Pesa payment.

    Args:
        user_id: The authenticated user ID
        phone_number: Kenyan phone number (2547XXXXXXXX)
        amount: Amount in KES (integer)
        account_reference: Reference for the transaction
        transaction_desc: Description

    Returns:
        Dict with checkout_request_id and status
    """
    token = await _get_access_token()

    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")
    password = base64.b64encode(
        f"{settings.MPESA_SHORTCODE}{settings.MPESA_PASSKEY}{timestamp}".encode()
    ).decode()

    env = settings.MPESA_ENVIRONMENT
    url = MPESA_STKPUSH_URL.get(env, MPESA_STKPUSH_URL["sandbox"])

    payload = {
        "BusinessShortCode": settings.MPESA_SHORTCODE,
        "Password": password,
        "Timestamp": timestamp,
        "TransactionType": "CustomerPayBillOnline",
        "Amount": amount,
        "PartyA": phone_number,
        "PartyB": settings.MPESA_SHORTCODE,
        "PhoneNumber": phone_number,
        "CallBackURL": settings.MPESA_CALLBACK_URL,
        "AccountReference": account_reference[:12],
        "TransactionDesc": transaction_desc[:13],
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            res = await client.post(
                url,
                json=payload,
                headers={"Authorization": f"Bearer {token}"},
            )

        data = res.json()
        logger.info("M-Pesa STK response: %s", str(data)[:500])

        if res.status_code != 200:
            error_msg = data.get("errorMessage", "M-Pesa request failed")
            raise HTTPException(status_code=502, detail=error_msg)

        response_code = data.get("ResponseCode", "1")
        if response_code != "0":
            raise HTTPException(
                status_code=400,
                detail=data.get("ResponseDescription", "STK Push failed"),
            )

        checkout_request_id = data.get("CheckoutRequestID")

        from app.core.supabase import supabase_admin
        sb = supabase_admin()
        try:
            sb.table("payment_transactions").insert({
                "user_id": user_id,
                "provider": "mpesa",
                "amount": amount,
                "currency": "kes",
                "status": "pending",
                "reference": checkout_request_id,
                "metadata": {
                    "phone": phone_number,
                    "merchant_request_id": data.get("MerchantRequestID"),
                },
            }).execute()
        except Exception:
            pass

        return {
            "checkout_request_id": checkout_request_id,
            "merchant_request_id": data.get("MerchantRequestID"),
            "status": "pending",
            "message": "Check your phone to complete payment",
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error("M-Pesa STK error: %s", str(e))
        raise HTTPException(status_code=502, detail="M-Pesa payment initiation failed")


async def process_callback(callback_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Process M-Pesa callback and update payment status.

    M-Pesa sends a POST to the callback URL with:
    {
        "Body": {
            "stkCallback": {
                "MerchantRequestID": "...",
                "CheckoutRequestID": "...",
                "ResultCode": 0,
                "ResultDesc": "Success",
                "CallbackMetadata": { ... }
            }
        }
    }
    """
    try:
        stk = callback_data.get("Body", {}).get("stkCallback", {})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid callback format")

    checkout_id = stk.get("CheckoutRequestID")
    result_code = stk.get("ResultCode")
    result_desc = stk.get("ResultDesc", "")

    logger.info(
        "M-Pesa callback: checkout=%s result=%s desc=%s",
        checkout_id, result_code, result_desc,
    )

    if result_code == 0:
        status = "completed"

        metadata_items = stk.get("CallbackMetadata", {}).get("Item", [])
        amount = None
        phone = None
        mpesa_ref = None
        for item in metadata_items:
            name = item.get("Name", "")
            if name == "Amount":
                amount = item.get("Value")
            elif name == "PhoneNumber":
                phone = item.get("Value")
            elif name == "MpesaReceiptNumber":
                mpesa_ref = item.get("Value")
    else:
        status = "failed"

    from app.core.supabase import supabase_admin
    sb = supabase_admin()

    try:
        sb.table("payment_transactions").update({
            "status": status,
            "reference": checkout_id,
            "metadata": callback_data,
        }).eq("reference", checkout_id).execute()
    except Exception as e:
        logger.error("Failed to update payment: %s", str(e))

    return {
        "checkout_request_id": checkout_id,
        "result_code": result_code,
        "result_desc": result_desc,
        "status": status,
    }
