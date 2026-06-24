from pydantic import BaseModel
from typing import List, Optional, Any, Dict


class StudentChatIn(BaseModel):
    question: str
    document_id: str
    top_k: int = 5
    use_llm: bool = True


class SourceOut(BaseModel):
    chunk_index: int
    preview: str
    similarity: Optional[float] = None


class StudentChatOut(BaseModel):
    answer: str
    sources: List[SourceOut]
    response_type: Optional[str] = None
    response_badge: Optional[str] = None
    confidence: Optional[float] = None
    confidence_level: Optional[str] = None
    related_questions: Optional[List[str]] = None
    formatted_sections: Optional[List[Dict[str, Any]]] = None
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


# ---------- Analytics ----------

class WeeklyActivityPoint(BaseModel):
    activity_date: str
    questions_count: int
    flashcards_count: int


class StreakInfo(BaseModel):
    current_streak: int
    longest_streak: int
    is_active_today: bool


class LifetimeTotals(BaseModel):
    questions_asked: int
    flashcards_saved: int
    reviews_completed: int
    study_sessions: int
    total_study_minutes: int


class PerformanceMetrics(BaseModel):
    average_quality: Optional[float] = None
    mastery_rate: Optional[float] = None
    total_reviews: int


class AnalyticsOut(BaseModel):
    streak: StreakInfo
    weekly_activity: List[WeeklyActivityPoint]
    totals: LifetimeTotals
    performance: PerformanceMetrics
    recent_sessions: List[dict]
