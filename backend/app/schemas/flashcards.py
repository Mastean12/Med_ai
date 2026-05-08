from pydantic import BaseModel, Field
from typing import List, Optional


class FlashcardGenerateIn(BaseModel):
    document_id: str
    max_cards: int = 10


class FlashcardOut(BaseModel):
    question: str
    answer: str
    chunk_index: int


class FlashcardGenerateOut(BaseModel):
    document_id: str
    flashcards: List[FlashcardOut]
    total: int


# ---------- Saved Flashcards ----------

class FlashcardSaveIn(BaseModel):
    document_id: str
    flashcards: List[FlashcardOut]


class FlashcardSaveOut(BaseModel):
    saved_ids: List[str]
    count: int


class FlashcardListOut(BaseModel):
    flashcards: List[dict]
    total: int


class FlashcardDeleteOut(BaseModel):
    deleted: str


# ---------- Spaced Repetition ----------

class ReviewLogIn(BaseModel):
    flashcard_id: str
    quality: int = Field(ge=0, le=5, description="0=complete blackout, 5=perfect recall")


class ReviewLogOut(BaseModel):
    flashcard_id: str
    quality: int
    ease_factor: float
    interval_days: int
    repetition_count: int
    next_review_at: str


class DueFlashcardsOut(BaseModel):
    flashcards: List[dict]
    total: int


# ---------- Study Sessions ----------

class SessionStartIn(BaseModel):
    session_type: str = "flashcards"


class SessionStartOut(BaseModel):
    session: Optional[dict] = None


class SessionEndOut(BaseModel):
    session_id: str
    duration_seconds: int
    ended_at: str
