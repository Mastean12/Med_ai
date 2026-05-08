from fastapi import APIRouter, Depends

from app.core.auth import get_current_user
from app.core.usage import enforce_ai_usage
from app.schemas.student import (
    StudentChatIn,
    StudentChatOut,
    StudentDashboardOut,
    AnalyticsOut,
)
from app.services.rag_service import answer_from_notes
from app.services.student_dashboard_service import (
    log_student_question,
    get_student_dashboard,
)
from app.services.analytics_service import get_study_analytics

router = APIRouter()


@router.post("/chat", response_model=StudentChatOut)
async def chat(payload: StudentChatIn, user=Depends(get_current_user)):
    """
    Ask a question against your uploaded notes.

    Supports LLM-powered answer synthesis (use_llm=True by default).
    Falls back to rule-based extraction if LLM is unavailable.
    """
    enforce_ai_usage(user_id=user["id"])

    result = await answer_from_notes(
        user_id=user["id"],
        question=payload.question,
        document_id=payload.document_id,
        top_k=payload.top_k,
        use_llm=payload.use_llm,
    )

    await log_student_question(
        user_id=user["id"],
        document_id=payload.document_id,
        question=payload.question,
    )

    return StudentChatOut(**result)


@router.get("/dashboard", response_model=StudentDashboardOut)
async def dashboard(user=Depends(get_current_user)):
    """Get student dashboard with recent activity and totals."""
    return await get_student_dashboard(user_id=user["id"])


@router.get("/analytics", response_model=AnalyticsOut)
async def analytics(user=Depends(get_current_user)):
    """
    Comprehensive study analytics:
    - Daily streak tracking
    - Weekly activity breakdown
    - Lifetime totals
    - Review performance metrics
    - Recent study sessions
    """
    return await get_study_analytics(user_id=user["id"])
