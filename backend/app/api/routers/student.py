from fastapi import APIRouter, Depends

from app.core.auth import get_current_user
from app.core.usage import enforce_ai_usage
from app.schemas.student import (
    StudentChatIn,
    StudentChatOut,
    StudentDashboardOut,
)
from app.services.rag_service import answer_from_notes
from app.services.student_dashboard_service import (
    log_student_question,
    get_student_dashboard,
)

router = APIRouter()


@router.post("/chat", response_model=StudentChatOut)
async def chat(payload: StudentChatIn, user=Depends(get_current_user)):
    """
    Ask a question against uploaded notes (doc_chunks).
    Requires: Authorization: Bearer <supabase_access_token>
    """
    enforce_ai_usage(user_id=user["id"])

    result = await answer_from_notes(
        user_id=user["id"],
        question=payload.question,
        document_id=payload.document_id,
        top_k=payload.top_k,
    )

    # Log the question after successful processing
    await log_student_question(
        user_id=user["id"],
        document_id=payload.document_id,
        question=payload.question,
    )

    return StudentChatOut(**result)


@router.get("/dashboard", response_model=StudentDashboardOut)
async def dashboard(user=Depends(get_current_user)):
    return await get_student_dashboard(user_id=user["id"])