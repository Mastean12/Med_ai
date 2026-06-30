from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from enum import Enum


class CheckoutIn(BaseModel):
    plan: str  # "pro_monthly", "pro_yearly", or "university"


class CheckoutOut(BaseModel):
    checkout_url: Optional[str] = None


class PortalOut(BaseModel):
    url: Optional[str] = None


class SubscriptionOut(BaseModel):
    plan: str
    status: str
    provider: Optional[str] = None
    current_period_end: Optional[str] = None
    cancel_at_period_end: bool = False
    trial_end: Optional[str] = None
    stripe_customer_id: Optional[str] = None
    stripe_subscription_id: Optional[str] = None
    renewal_date: Optional[str] = None


class StkPushIn(BaseModel):
    phone_number: str = Field(..., min_length=12, max_length=12)
    amount: int = Field(..., gt=0)
    plan: str = "pro"


class StkPushOut(BaseModel):
    checkout_request_id: Optional[str] = None
    merchant_request_id: Optional[str] = None
    status: str
    message: str


class UsageFeature(BaseModel):
    used: int
    limit: Optional[int] = None
    unlimited: bool = False
    remaining: Optional[int] = None


class UsageSummaryOut(BaseModel):
    plan: str
    period: str
    features: Dict[str, UsageFeature]
