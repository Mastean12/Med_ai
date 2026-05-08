"""
Billing & Subscription Schemas.

Pydantic models for all billing endpoints.
"""
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from enum import Enum


class BillingInterval(str, Enum):
    MONTHLY = "monthly"
    YEARLY = "yearly"


class PlanTierStr(str, Enum):
    FREE = "free"
    PRO = "pro"
    PREMIUM = "premium"


class CheckoutIn(BaseModel):
    plan: PlanTierStr
    billing_interval: BillingInterval = BillingInterval.MONTHLY


class CheckoutOut(BaseModel):
    checkout_url: Optional[str] = None
    session_id: Optional[str] = None


class PortalOut(BaseModel):
    portal_url: Optional[str] = None


class SubscriptionOut(BaseModel):
    plan: str
    status: str
    provider: Optional[str] = None
    current_period_end: Optional[str] = None
    cancel_at_period_end: bool = False
    trial_end: Optional[str] = None


class StkPushIn(BaseModel):
    phone_number: str = Field(..., min_length=12, max_length=12, description="2547XXXXXXXX")
    amount: int = Field(..., gt=0, description="Amount in KES")
    plan: PlanTierStr = PlanTierStr.PRO


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
