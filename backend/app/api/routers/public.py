from fastapi import APIRouter
from app.schemas.public import SymptomCheckIn, SymptomCheckOut
from app.core.safety import public_health_guardrails
from app.services.public_health_service import generate_public_guidance

router = APIRouter()

@router.post("/symptom-check", response_model=SymptomCheckOut)
def symptom_check(payload: SymptomCheckIn):
    safe_input = public_health_guardrails(payload.symptoms)
    msg = generate_public_guidance(safe_input)
    return SymptomCheckOut(
        message=msg,
        disclaimer="General information only, not a medical diagnosis. If symptoms are severe or worsening, seek professional care."
    )
