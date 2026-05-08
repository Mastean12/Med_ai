"""
Exam Mode API Router.

Endpoints:
- POST /exam/generate     — generate AI-powered exam
- POST /exam/submit       — submit answers and get score
- GET  /exam/history      — list past exam attempts
- GET  /exam/result/{id}  — get detailed exam results
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, List

from app.core.auth import get_current_user
from app.services.exam_service import (
    generate_exam,
    submit_answers,
    get_exam_history,
    get_exam_result,
)
from app.services.adaptive_service import update_topic_mastery

router = APIRouter(prefix="/exam", tags=["Exam"])


class GenerateExamIn(BaseModel):
    document_id: Optional[str] = None
    topic: Optional[str] = None
    count: int = Field(default=10, ge=5, le=50)
    difficulty: str = "mixed"
    exam_type: str = "mcq"


class AnswerItem(BaseModel):
    question_id: str
    answer: str


class SubmitExamIn(BaseModel):
    attempt_id: str
    answers: List[AnswerItem]


@router.post("/generate")
async def create_exam(payload: GenerateExamIn, user=Depends(get_current_user)):
    """
    Generate an AI-powered medical exam.

    Options:
    - Specify a document_id to test on your uploaded notes
    - Specify a topic (e.g., "cardiology") for focused exams
    - Choose difficulty: easy, medium, hard, or mixed
    - Choose type: mcq or case_study
    """
    return await generate_exam(
        user_id=user["id"],
        document_id=payload.document_id,
        topic=payload.topic,
        count=payload.count,
        difficulty=payload.difficulty,
        exam_type=payload.exam_type,
    )


@router.post("/submit")
async def submit(payload: SubmitExamIn, user=Depends(get_current_user)):
    """
    Submit your answers for grading.

    Returns your score, correct answers, and explanations.
    Also updates your topic mastery for adaptive learning.
    """
    result = await submit_answers(
        user_id=user["id"],
        attempt_id=payload.attempt_id,
        answers=[a.model_dump() for a in payload.answers],
    )

    for r in result.get("results", []):
        if r.get("topic"):
            try:
                await update_topic_mastery(
                    user_id=user["id"],
                    topic=r["topic"],
                    is_correct=r.get("is_correct", False),
                )
            except Exception:
                pass

    return result


@router.get("/history")
async def history(user=Depends(get_current_user)):
    """Get your exam attempt history."""
    return await get_exam_history(user["id"])


@router.get("/result/{attempt_id}")
async def result(attempt_id: str, user=Depends(get_current_user)):
    """Get detailed results for an exam attempt with questions and answers."""
    return await get_exam_result(user["id"], attempt_id)
