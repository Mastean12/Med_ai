from pydantic import BaseModel
from typing import List, Optional, Any, Dict


class StudentChatIn(BaseModel):
    question: str
    document_id: str
    top_k: int = 5


class SourceOut(BaseModel):
    chunk_index: int
    preview: str
    similarity: Optional[float] = None


class StudentChatOut(BaseModel):
    answer: str
    sources: List[SourceOut]
    meta: Optional[Dict[str, Any]] = None


class StudentActivityOut(BaseModel):
    type: str
    label: str
    created_at: Optional[str] = None


class StudentDashboardOut(BaseModel):
    documents_uploaded: int
    questions_asked: int
    flashcards_created: int
    recent_activity: List[StudentActivityOut]