from pydantic import BaseModel
from typing import List


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