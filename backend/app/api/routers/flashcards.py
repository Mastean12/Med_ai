from fastapi import APIRouter, Depends

from app.core.auth import get_current_user
from app.schemas.flashcards import (
    FlashcardGenerateIn,
    FlashcardGenerateOut,
)
from app.services.flashcards_service import generate_flashcards_from_document

router = APIRouter(prefix="/flashcards", tags=["flashcards"])


@router.post("/generate", response_model=FlashcardGenerateOut)
async def generate_flashcards(
    payload: FlashcardGenerateIn,
    user=Depends(get_current_user),
):
    result = await generate_flashcards_from_document(
        user_id=user["id"],
        document_id=payload.document_id,
        max_cards=payload.max_cards,
    )
    return FlashcardGenerateOut(**result)