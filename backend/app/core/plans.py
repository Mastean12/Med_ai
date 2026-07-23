from enum import Enum
from typing import Dict, List

from app.core.config import (
    STRIPE_PRICE_PRO_MONTHLY,
    STRIPE_PRICE_PRO_YEARLY,
    STRIPE_PRICE_PREMIUM_MONTHLY,
    STRIPE_PRICE_PREMIUM_YEARLY,
)


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
    LEMONSQUEEZY = "lemonsqueezy"
    MPESA = "mpesa"


class Feature(str, Enum):
    UPLOADS = "uploads"
    AI_QUESTIONS = "ai_questions"
    TUTORING_SESSIONS = "tutoring_sessions"
    FLASHCARDS_GENERATED = "flashcards_generated"
    EXAM_SESSIONS = "exam_sessions"
    AI_SUMMARIES = "ai_summaries"
    REVISION_NOTES = "revision_notes"
    CLINICAL_SIMULATIONS = "clinical_simulations"
    OSCE_SESSIONS = "osce_sessions"
    ADVANCED_ANALYTICS = "advanced_analytics"


PRICE_ID_MAP: Dict[str, str] = {
    "pro_monthly": STRIPE_PRICE_PRO_MONTHLY,
    "pro_yearly": STRIPE_PRICE_PRO_YEARLY,
    "premium_monthly": STRIPE_PRICE_PREMIUM_MONTHLY,
    "premium_yearly": STRIPE_PRICE_PREMIUM_YEARLY,
}


PLAN_PRICES = {
    PlanTier.FREE: {"monthly": 0, "yearly": 0},
    PlanTier.PRO: {"monthly": 19, "yearly": 190},
    PlanTier.PREMIUM: {"monthly": 49, "yearly": 490},
}


PLAN_LIMITS: Dict[PlanTier, Dict[Feature, int]] = {
    PlanTier.FREE: {
        Feature.UPLOADS: 2,
        Feature.AI_QUESTIONS: 20,
        Feature.TUTORING_SESSIONS: 10,
        Feature.FLASHCARDS_GENERATED: 20,
        Feature.EXAM_SESSIONS: 2,
        Feature.AI_SUMMARIES: 0,
        Feature.REVISION_NOTES: 0,
        Feature.CLINICAL_SIMULATIONS: 0,
        Feature.OSCE_SESSIONS: 0,
        Feature.ADVANCED_ANALYTICS: 0,
    },
    PlanTier.PRO: {
        Feature.UPLOADS: 50,
        Feature.AI_QUESTIONS: 750,
        Feature.TUTORING_SESSIONS: 750,
        Feature.FLASHCARDS_GENERATED: -1,
        Feature.EXAM_SESSIONS: -1,
        Feature.AI_SUMMARIES: -1,
        Feature.REVISION_NOTES: -1,
        Feature.CLINICAL_SIMULATIONS: 0,
        Feature.OSCE_SESSIONS: 0,
        Feature.ADVANCED_ANALYTICS: -1,
    },
    PlanTier.PREMIUM: {
        Feature.UPLOADS: -1,
        Feature.AI_QUESTIONS: 2500,
        Feature.TUTORING_SESSIONS: 2500,
        Feature.FLASHCARDS_GENERATED: -1,
        Feature.EXAM_SESSIONS: -1,
        Feature.AI_SUMMARIES: -1,
        Feature.REVISION_NOTES: -1,
        Feature.CLINICAL_SIMULATIONS: -1,
        Feature.OSCE_SESSIONS: -1,
        Feature.ADVANCED_ANALYTICS: -1,
    },
}


PLAN_FEATURES: Dict[PlanTier, List[str]] = {
    PlanTier.FREE: [
        "2 PDF uploads",
        "20 AI questions per month",
        "10 AI Tutor sessions",
        "20 flashcard generations/month",
        "2 exam attempts/month",
        "Beginner Mode only",
        "Basic analytics",
    ],
    PlanTier.PRO: [
        "50 PDF uploads",
        "750 AI messages per month",
        "Unlimited flashcards",
        "Unlimited exam mode",
        "All AI Tutor modes",
        "AI summaries & revision notes",
        "Weak-topic detection",
        "Progress dashboard",
        "Faster AI responses",
        "Priority email support",
    ],
    PlanTier.PREMIUM: [
        "Unlimited PDF uploads",
        "2,500 AI messages per month",
        "Everything in Student Pro",
        "Premium AI model",
        "Clinical simulations",
        "OSCE & Viva mode",
        "Adaptive learning",
        "Personalized study plans",
        "Advanced analytics",
        "Exam readiness prediction",
        "Study heatmaps",
        "Early access to new features",
    ],
}
