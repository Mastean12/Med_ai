"""
Notes Intelligence API Router.

Endpoints:
- POST /notes/summarize       — generate summary (concise/detailed/exam/clinical/beginner)
- POST /notes/key-points      — extract high-yield key points
- POST /notes/revision-sheet  — generate printable revision sheet
- POST /notes/simplify        — simplify complex text
- POST /notes/explain         — explain a concept simply
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from typing import Optional

from app.core.auth import get_current_user
from app.services.summarization_service import (
    summarize_document,
    extract_key_points,
    generate_revision_sheet,
)
from app.services.simplification_service import (
    simplify_text,
    explain_concept,
)

router = APIRouter(prefix="/notes", tags=["Notes"])


class SummarizeIn(BaseModel):
    document_id: str
    mode: str = "concise"


class KeyPointsIn(BaseModel):
    document_id: str
    count: int = Field(default=10, ge=1, le=30)


class RevisionSheetIn(BaseModel):
    document_id: str


class SimplifyIn(BaseModel):
    text: str = Field(..., min_length=20, max_length=5000)


class ExplainIn(BaseModel):
    concept: str = Field(..., min_length=3)


@router.post("/summarize")
async def summarize(payload: SummarizeIn, user=Depends(get_current_user)):
    """
    Generate a summary of uploaded notes.

    Modes:
    - concise: Brief 3-5 paragraph summary
    - detailed: Full comprehensive summary
    - exam: High-yield exam-focused summary with tables
    - clinical: Clinical presentation/management format
    - beginner: Simplified for beginners
    """
    return await summarize_document(
        user_id=user["id"],
        document_id=payload.document_id,
        mode=payload.mode,
    )


@router.post("/key-points")
async def key_points(payload: KeyPointsIn, user=Depends(get_current_user)):
    """Extract the most important key points from a document."""
    return await extract_key_points(
        user_id=user["id"],
        document_id=payload.document_id,
        count=payload.count,
    )


@router.post("/revision-sheet")
async def revision_sheet(payload: RevisionSheetIn, user=Depends(get_current_user)):
    """Generate a printable revision sheet."""
    return await generate_revision_sheet(
        user_id=user["id"],
        document_id=payload.document_id,
    )


@router.post("/simplify")
async def simplify(payload: SimplifyIn, user=Depends(get_current_user)):
    """Simplify complex medical text into beginner-friendly language."""
    return await simplify_text(
        user_id=user["id"],
        text=payload.text,
    )


@router.post("/explain")
async def explain(payload: ExplainIn, user=Depends(get_current_user)):
    """
    Explain a medical concept in simple, beginner-friendly language.

    Example: "Explain the Krebs cycle" or "What is hypertension?"
    """
    return await explain_concept(
        user_id=user["id"],
        concept=payload.concept,
    )
