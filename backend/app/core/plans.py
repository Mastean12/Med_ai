from enum import Enum
from typing import Dict, List

from app.core.config import (
    STRIPE_PRICE_PRO_MONTHLY,
    STRIPE_PRICE_PRO_YEARLY,
    STRIPE_PRICE_UNIVERSITY,
)


class PlanTier(str, Enum):
    FREE = "free"
    PRO = "pro"
    UNIVERSITY = "university"


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


# Mapping from user-facing plan key to Stripe Price ID
PRICE_ID_MAP: Dict[str, str] = {
    "pro_monthly": STRIPE_PRICE_PRO_MONTHLY,
    "pro_yearly": STRIPE_PRICE_PRO_YEARLY,
    "university": STRIPE_PRICE_UNIVERSITY,
}


# Human-readable prices
PLAN_PRICES = {
    PlanTier.FREE: {"monthly": 0, "yearly": 0},
    PlanTier.PRO: {"monthly": 19, "yearly": 190},
    PlanTier.UNIVERSITY: {"monthly": 99, "yearly": 990},
}


# Feature limits per plan (monthly). -1 = unlimited.
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
        Feature.AI_QUESTIONS: -1,
        Feature.FLASHCARDS_GENERATED: -1,
        Feature.UPLOADS: -1,
        Feature.TUTORING_SESSIONS: -1,
        Feature.SUMMARIES_GENERATED: -1,
        Feature.EXAM_SESSIONS: -1,
        Feature.CLINICAL_SIMULATIONS: 0,
    },
    PlanTier.UNIVERSITY: {
        Feature.AI_QUESTIONS: -1,
        Feature.FLASHCARDS_GENERATED: -1,
        Feature.UPLOADS: -1,
        Feature.TUTORING_SESSIONS: -1,
        Feature.SUMMARIES_GENERATED: -1,
        Feature.EXAM_SESSIONS: -1,
        Feature.CLINICAL_SIMULATIONS: -1,
    },
}


PLAN_FEATURES: Dict[PlanTier, List[str]] = {
    PlanTier.FREE: [
        "3 document uploads",
        "20 AI questions per month",
        "Basic flashcards",
        "Limited summarization",
        "Symptom checker access",
        "Health tips library",
    ],
    PlanTier.PRO: [
        "Unlimited AI Chat",
        "Unlimited AI Tutor",
        "Unlimited exam mode",
        "Unlimited flashcards",
        "Unlimited uploads",
        "Advanced analytics",
        "Priority AI access",
        "Adaptive learning",
        "Revision sheets",
    ],
    PlanTier.UNIVERSITY: [
        "Everything in Pro",
        "Clinical simulations",
        "Multiple users",
        "Organization dashboard",
        "Student analytics",
        "Instructor dashboard",
        "Institution reports",
        "Role management",
        "Team billing",
    ],
}
