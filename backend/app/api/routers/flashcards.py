from fastapi import APIRouter, Depends

from app.core.auth import get_current_user
from app.schemas.flashcards import (
    FlashcardGenerateIn,
    FlashcardGenerateOut,
    FlashcardSaveIn,
    FlashcardSaveOut,
    FlashcardListOut,
    FlashcardDeleteOut,
    ReviewLogIn,
    ReviewLogOut,
    DueFlashcardsOut,
    SessionStartIn,
    SessionStartOut,
    SessionEndOut,
)
from app.services.flashcards_service import generate_flashcards_from_document
from app.services.study_tools_service import (
    save_flashcards,
    list_flashcards,
    delete_flashcard,
    log_review,
    get_due_flashcards,
    start_study_session,
    end_study_session,
)

router = APIRouter(prefix="/flashcards", tags=["flashcards"])


@router.post("/generate", response_model=FlashcardGenerateOut)
async def generate_flashcards(
    payload: FlashcardGenerateIn,
    user=Depends(get_current_user),
):
    """
    Generate AI-powered medical flashcards from an uploaded document.
    Uses DeepSeek LLM for high-quality, exam-oriented cards.
    """
    result = await generate_flashcards_from_document(
        user_id=user["id"],
        document_id=payload.document_id,
        max_cards=payload.max_cards,
    )
    return FlashcardGenerateOut(**result)


@router.post("/save", response_model=FlashcardSaveOut)
async def save_generated_flashcards(
    payload: FlashcardSaveIn,
    user=Depends(get_current_user),
):
    """
    Save generated flashcards to the user's permanent collection.
    """
    return await save_flashcards(
        user_id=user["id"],
        document_id=payload.document_id,
        flashcards=[f.model_dump() for f in payload.flashcards],
    )


@router.get("/list", response_model=FlashcardListOut)
async def list_saved_flashcards(
    document_id: str | None = None,
    limit: int = 50,
    offset: int = 0,
    user=Depends(get_current_user),
):
    """
    List saved flashcards, optionally filtered by document.
    """
    return await list_flashcards(
        user_id=user["id"],
        document_id=document_id,
        limit=limit,
        offset=offset,
    )


@router.delete("/{flashcard_id}", response_model=FlashcardDeleteOut)
async def remove_flashcard(
    flashcard_id: str,
    user=Depends(get_current_user),
):
    """
    Delete a saved flashcard and its review history.
    """
    return await delete_flashcard(
        user_id=user["id"],
        flashcard_id=flashcard_id,
    )


@router.post("/review", response_model=ReviewLogOut)
async def review_flashcard(
    payload: ReviewLogIn,
    user=Depends(get_current_user),
):
    """
    Log a flashcard review with quality rating (0-5).
    Uses SM-2 algorithm to schedule next review.
    """
    return await log_review(
        user_id=user["id"],
        flashcard_id=payload.flashcard_id,
        quality=payload.quality,
    )


@router.get("/due", response_model=DueFlashcardsOut)
async def due_for_review(
    limit: int = 20,
    user=Depends(get_current_user),
):
    """
    Get flashcards due for review based on SM-2 scheduling.
    """
    return await get_due_flashcards(
        user_id=user["id"],
        limit=limit,
    )


@router.post("/sessions/start", response_model=SessionStartOut)
async def begin_study_session(
    payload: SessionStartIn,
    user=Depends(get_current_user),
):
    """
    Start a new study session for activity tracking.
    """
    return await start_study_session(
        user_id=user["id"],
        session_type=payload.session_type,
    )


@router.post("/sessions/{session_id}/end", response_model=SessionEndOut)
async def finish_study_session(
    session_id: str,
    user=Depends(get_current_user),
):
    """
    End a study session and record duration.
    """
    return await end_study_session(
        user_id=user["id"],
        session_id=session_id,
    )
