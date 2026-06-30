"""
Subscription Plan Definitions.

Central source of truth for plan tiers, feature limits,
and pricing. Used by billing, usage tracking, and feature gating.
"""

from enum import Enum
from typing import Dict, List


class PlanTier(str, Enum):
    FREE = "free"
    PRO = "pro"
    PREMIUM = "premium"


class PlanStatus(str, Enum):
    ACTIVE = "active"
    CANCELED = "canceled"
    TRIALING = "trialing"
    PAST_DUE = "past_due"
    UNPAID = "unpaid"


class PaymentProvider(str, Enum):
    STRIPE = "stripe"
    MPESA = "mpesa"


class Feature(str, Enum):
    AI_QUESTIONS = "ai_questions"
    FLASHCARDS_GENERATED = "flashcards_generated"
    UPLOADS = "uploads"
    TUTORING_SESSIONS = "tutoring_sessions"
    SUMMARIES_GENERATED = "summaries_generated"
    EXAM_SESSIONS = "exam_sessions"
    CLINICAL_SIMULATIONS = "clinical_simulations"


# Import Stripe price IDs from environment config
from app.core.config import (
    STRIPE_PRO_MONTHLY_PRICE_ID,
    STRIPE_PRO_YEARLY_PRICE_ID,
    STRIPE_PREMIUM_MONTHLY_PRICE_ID,
    STRIPE_PREMIUM_YEARLY_PRICE_ID,
)

# Pricing (Stripe Price IDs — set via environment variables)
STRIPE_PRICES = {
    PlanTier.PRO: {
        "monthly": STRIPE_PRO_MONTHLY_PRICE_ID,
        "yearly": STRIPE_PRO_YEARLY_PRICE_ID,
    },
    PlanTier.PREMIUM: {
        "monthly": STRIPE_PREMIUM_MONTHLY_PRICE_ID,
        "yearly": STRIPE_PREMIUM_YEARLY_PRICE_ID,
    },
}

# Human-readable prices
PLAN_PRICES = {
    PlanTier.FREE: {"monthly": 0, "yearly": 0},
    PlanTier.PRO: {"monthly": 19, "yearly": 190},
    PlanTier.PREMIUM: {"monthly": 49, "yearly": 490},
}

# Feature limits per plan per period (monthly)
PLAN_LIMITS: Dict[PlanTier, Dict[Feature, int]] = {
    PlanTier.FREE: {
        Feature.AI_QUESTIONS: 20,
        Feature.FLASHCARDS_GENERATED: 10,
        Feature.UPLOADS: 3,
        Feature.TUTORING_SESSIONS: 5,
        Feature.SUMMARIES_GENERATED: 3,
        Feature.EXAM_SESSIONS: 2,
        Feature.CLINICAL_SIMULATIONS: 0,
    },
    PlanTier.PRO: {
        Feature.AI_QUESTIONS: 200,
        Feature.FLASHCARDS_GENERATED: 100,
        Feature.UPLOADS: 50,
        Feature.TUTORING_SESSIONS: 50,
        Feature.SUMMARIES_GENERATED: 50,
        Feature.EXAM_SESSIONS: 20,
        Feature.CLINICAL_SIMULATIONS: 0,
    },
    PlanTier.PREMIUM: {
        Feature.AI_QUESTIONS: -1,  # -1 = unlimited
        Feature.FLASHCARDS_GENERATED: -1,
        Feature.UPLOADS: -1,
        Feature.TUTORING_SESSIONS: -1,
        Feature.SUMMARIES_GENERATED: -1,
        Feature.EXAM_SESSIONS: -1,
        Feature.CLINICAL_SIMULATIONS: -1,
    },
}

# Feature descriptions for the pricing page
PLAN_FEATURES: Dict[PlanTier, List[str]] = {
    PlanTier.FREE: [
        "3 document uploads",
        "20 AI questions per day",
        "Basic flashcards",
        "Limited summarization",
        "Symptom checker access",
        "Health tips library",
    ],
    PlanTier.PRO: [
        "50 document uploads/month",
        "200 AI questions/month",
        "100 flashcard generations",
        "Unlimited AI chat",
        "Spaced repetition system",
        "Exam preparation mode",
        "Advanced analytics dashboard",
        "Priority AI access",
    ],
    PlanTier.PREMIUM: [
        "Unlimited everything",
        "Clinical case simulations",
        "Adaptive learning AI",
        "Advanced coaching mode",
        "Performance analytics",
        "University group tools",
        "Priority AI + fastest model",
        "Early access to new features",
        "Dedicated support",
    ],
}
