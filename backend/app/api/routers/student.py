from fastapi import APIRouter, Depends
from app.core.auth import get_current_user
from app.core.usage import enforce_ai_usage
from app.schemas.student import StudentChatIn, StudentChatOut
from app.services.rag_service import answer_from_notes

router = APIRouter()

@router.post("/chat", response_model=StudentChatOut)
def chat(payload: StudentChatIn, user=Depends(get_current_user)):
    enforce_ai_usage(user_id=user["id"])
    return answer_from_notes(user_id=user["id"], document_id=payload.document_id, question=payload.question)
