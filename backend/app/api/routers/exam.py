"""
Exam Mode API Router — Professional medical exam engine.

Endpoints:
- POST /exam/generate     — generate AI exam (6 modes)
- POST /exam/submit       — submit answers + get score + topic breakdown
- GET  /exam/history      — past attempts
- GET  /exam/result/{id}  — detailed result with explanations
- GET  /exam/dashboard    — exam stats + weak topics + score trends
"""

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from typing import Optional, List

from app.core.auth import get_current_user
from app.services.exam_service import (
    generate_exam, submit_answers, get_exam_history, get_exam_result, get_exam_dashboard,
    BEGINNER, EXAM_PREP, CLINICAL, RAPID_REVIEW, VIVA, ADAPTIVE, VALID_MODES,
)

router = APIRouter(prefix="/exam", tags=["Exam"])


class GenerateExamIn(BaseModel):
    document_id: Optional[str] = None
    topic: Optional[str] = None
    count: int = Field(default=10, ge=5, le=50)
    difficulty: str = "mixed"
    exam_mode: str = Field(default="exam_prep", description="beginner | exam_prep | clinical | rapid_review | viva | adaptive")


class AnswerItem(BaseModel):
    question_id: str
    answer: str


class SubmitExamIn(BaseModel):
    attempt_id: str
    answers: List[AnswerItem]


@router.post("/generate")
async def create_exam(payload: GenerateExamIn, user=Depends(get_current_user)):
    """Generate an AI-powered medical exam in any of 6 modes."""
    mode = payload.exam_mode if payload.exam_mode in VALID_MODES else EXAM_PREP
    return await generate_exam(
        user_id=user["id"], document_id=payload.document_id, topic=payload.topic,
        count=payload.count, difficulty=payload.difficulty, exam_mode=mode,
    )


@router.post("/submit")
async def submit(payload: SubmitExamIn, user=Depends(get_current_user)):
    """Submit answers. Returns score, per-question results with tagged explanations, and topic breakdown."""
    return await submit_answers(user_id=user["id"], attempt_id=payload.attempt_id,
                                 answers=[a.model_dump() for a in payload.answers])


@router.get("/history")
async def history(user=Depends(get_current_user)):
    return await get_exam_history(user["id"])


@router.get("/result/{attempt_id}")
async def result(attempt_id: str, user=Depends(get_current_user)):
    return await get_exam_result(user["id"], attempt_id)


@router.get("/dashboard")
async def dashboard(user=Depends(get_current_user)):
    """Exam dashboard: stats, weak topics, score trends, available modes."""
    return await get_exam_dashboard(user["id"])
