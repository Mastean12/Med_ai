from fastapi import APIRouter, Depends
from app.schemas.public import SymptomCheckIn, SymptomCheckOut
from app.core.auth import get_optional_user
from app.services.public_health_service import (
    generate_public_guidance,
    generate_health_tips,
)

router = APIRouter()


@router.post("/symptom-check", response_model=SymptomCheckOut)
async def symptom_check(
    payload: SymptomCheckIn,
    user=Depends(get_optional_user),
):
    """
    Get general health guidance for described symptoms.

    Powered by DeepSeek LLM with strict medical safety guardrails.
    Falls back to safe pre-written messaging if LLM is unavailable.

    IMPORTANT: This is NOT a diagnosis. Always consult a healthcare professional.
    """
    msg = await generate_public_guidance(payload.symptoms, use_llm=True)
    return SymptomCheckOut(
        message=msg,
        disclaimer=(
            "General health information only — not a medical diagnosis. "
            "If symptoms are severe or worsening, seek professional care immediately. "
            "In an emergency, call 911 (US), 999 (UK), or 112 (EU)."
        ),
    )


@router.get("/health-tips")
async def health_tips(topic: str = "general wellness"):
    """
    Get evidence-based health tips on a specific topic.

    Query params:
        topic: e.g., "sleep hygiene", "hydration", "stress management"
    """
    tips = await generate_health_tips(topic)
    return {
        "topic": topic,
        "tips": tips,
    }


@router.get("/safety")
async def safety_info():
    """
    Return general safety and emergency information.
    """
    return {
        "emergency_numbers": {
            "US": "911",
            "UK": "999",
            "EU": "112",
            "Australia": "000",
            "India": "112",
        },
        "warning_signs": [
            "Chest pain or pressure",
            "Difficulty breathing or shortness of breath",
            "Sudden confusion or disorientation",
            "Severe bleeding that won't stop",
            "Loss of consciousness or fainting",
            "Sudden severe headache",
            "Seizure or convulsions",
            "Suicidal thoughts or self-harm urges",
        ],
        "disclaimer": (
            "This is general information, not medical advice. "
            "If you're experiencing any of the above, seek emergency care immediately."
        ),
    }
