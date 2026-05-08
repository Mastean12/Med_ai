"""
Spaced Repetition & Flashcard Study Service.

Implements the SM-2 algorithm for adaptive flashcard scheduling.
Provides CRUD for flashcards, review logging, and due-card retrieval.
"""

import math
import logging
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Optional

from fastapi import HTTPException

from app.core.supabase import supabase_admin

logger = logging.getLogger("noctual.study")


def sm2(
    quality: int,
    repetition_count: int,
    ease_factor: float,
    interval_days: int,
) -> Dict[str, Any]:
    """
    SM-2 spaced repetition algorithm.

    Args:
        quality: 0–5 rating (0=complete blackout, 5=perfect recall)
        repetition_count: Number of consecutive correct reviews
        ease_factor: Current ease factor (min 1.3)
        interval_days: Current interval

    Returns:
        Dict with updated: ease_factor, interval_days, repetition_count,
        next_review_at (ISO string)
    """
    ef = max(1.3, ease_factor)

    if quality < 3:
        new_interval = 1
        new_repetition = 0
    else:
        if repetition_count == 0:
            new_interval = 1
        elif repetition_count == 1:
            new_interval = 3
        else:
            new_interval = round(interval_days * ef)

        new_repetition = repetition_count + 1
        ef = ef + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))

    ef = max(1.3, ef)

    next_review = datetime.now(timezone.utc) + timedelta(days=new_interval)

    return {
        "ease_factor": round(ef, 2),
        "interval_days": new_interval,
        "repetition_count": new_repetition,
        "next_review_at": next_review.isoformat(),
    }


async def save_flashcards(
    user_id: str,
    document_id: str,
    flashcards: List[Dict[str, Any]],
) -> Dict[str, Any]:
    """
    Save generated flashcards to the user's flashcard collection.

    Args:
        user_id: Owner user ID
        document_id: Source document ID
        flashcards: List of {question, answer, chunk_index}

    Returns:
        Dict with saved_ids and count
    """
    sb = supabase_admin()

    if not flashcards:
        return {"saved_ids": [], "count": 0}

    rows = []
    for card in flashcards:
        rows.append({
            "owner_id": user_id,
            "document_id": document_id,
            "question": card["question"],
            "answer": card["answer"],
            "chunk_index": card.get("chunk_index"),
        })

    try:
        res = sb.table("flashcards").insert(rows).execute()
        saved = res.data or []
        return {
            "saved_ids": [r["id"] for r in saved],
            "count": len(saved),
        }
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to save flashcards: {e}"
        )


async def list_flashcards(
    user_id: str,
    document_id: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
) -> Dict[str, Any]:
    """
    List saved flashcards for a user, optionally filtered by document.
    """
    sb = supabase_admin()

    try:
        query = (
            sb.table("flashcards")
            .select("id, question, answer, chunk_index, document_id, created_at",
                    count="exact")
            .eq("owner_id", user_id)
            .order("created_at", desc=True)
            .range(offset, offset + limit - 1)
        )

        if document_id:
            query = query.eq("document_id", document_id)

        res = query.execute()
        return {
            "flashcards": res.data or [],
            "total": res.count or 0,
        }
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to list flashcards: {e}"
        )


async def delete_flashcard(user_id: str, flashcard_id: str) -> Dict[str, Any]:
    """Delete a single flashcard and its review history."""
    sb = supabase_admin()

    try:
        check = (
            sb.table("flashcards")
            .select("id")
            .eq("id", flashcard_id)
            .eq("owner_id", user_id)
            .execute()
        )
        if not check.data:
            raise HTTPException(status_code=404, detail="Flashcard not found")

        sb.table("flashcards").delete().eq("id", flashcard_id).execute()
        return {"deleted": flashcard_id}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to delete flashcard: {e}"
        )


async def log_review(
    user_id: str,
    flashcard_id: str,
    quality: int,
) -> Dict[str, Any]:
    """
    Log a flashcard review and compute next review date using SM-2.

    Args:
        user_id: Owner ID
        flashcard_id: Card being reviewed
        quality: 0–5 rating

    Returns:
        Dict with updated scheduling info
    """
    sb = supabase_admin()

    if not 0 <= quality <= 5:
        raise HTTPException(
            status_code=400, detail="Quality must be between 0 and 5"
        )

    try:
        check = (
            sb.table("flashcards")
            .select("id")
            .eq("id", flashcard_id)
            .eq("owner_id", user_id)
            .execute()
        )
        if not check.data:
            raise HTTPException(status_code=404, detail="Flashcard not found")

        last_review = (
            sb.table("flashcard_reviews")
            .select("*")
            .eq("flashcard_id", flashcard_id)
            .eq("owner_id", user_id)
            .order("reviewed_at", desc=True)
            .limit(1)
            .execute()
        )

        last = last_review.data[0] if last_review.data else None

        if last:
            schedule = sm2(
                quality=quality,
                repetition_count=last.get("repetition_count", 0),
                ease_factor=last.get("ease_factor", 2.5),
                interval_days=last.get("interval_days", 0),
            )
        else:
            schedule = sm2(
                quality=quality,
                repetition_count=0,
                ease_factor=2.5,
                interval_days=0,
            )

        review_row = {
            "owner_id": user_id,
            "flashcard_id": flashcard_id,
            "quality": quality,
            "reviewed_at": datetime.now(timezone.utc).isoformat(),
            "next_review_at": schedule["next_review_at"],
            "repetition_count": schedule["repetition_count"],
            "ease_factor": schedule["ease_factor"],
            "interval_days": schedule["interval_days"],
        }

        sb.table("flashcard_reviews").insert(review_row).execute()

        return {
            "flashcard_id": flashcard_id,
            "quality": quality,
            **schedule,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to log review: {e}"
        )


async def get_due_flashcards(
    user_id: str,
    limit: int = 20,
) -> Dict[str, Any]:
    """
    Get flashcards due for review (SM-2 next_review_at <= now).

    Cards never reviewed are included by default
    (they have no entry in flashcard_reviews).
    """
    sb = supabase_admin()

    now = datetime.now(timezone.utc).isoformat()

    try:
        all_cards = (
            sb.table("flashcards")
            .select("id, question, answer, chunk_index, document_id")
            .eq("owner_id", user_id)
            .order("created_at", desc=True)
            .limit(1000)
            .execute()
        )

        if not all_cards.data:
            return {"flashcards": [], "total": 0}

        recorded_ids = set()
        due_ids = set()

        for card in all_cards.data:
            card_id = card["id"]
            latest = (
                sb.table("flashcard_reviews")
                .select("next_review_at, quality")
                .eq("flashcard_id", card_id)
                .eq("owner_id", user_id)
                .order("reviewed_at", desc=True)
                .limit(1)
                .execute()
            )

            if not latest.data:
                due_ids.add(card_id)
            else:
                recorded_ids.add(card_id)
                lr = latest.data[0]
                next_review = lr.get("next_review_at")
                if next_review and next_review <= now:
                    due_ids.add(card_id)

        due_cards = [
            {
                "id": c["id"],
                "question": c["question"],
                "answer": c["answer"],
                "chunk_index": c.get("chunk_index"),
                "document_id": c.get("document_id"),
            }
            for c in all_cards.data
            if c["id"] in due_ids
        ][:limit]

        return {"flashcards": due_cards, "total": len(due_cards)}
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to get due flashcards: {e}"
        )


async def start_study_session(
    user_id: str,
    session_type: str = "flashcards",
) -> Dict[str, Any]:
    """Start a new study session."""
    sb = supabase_admin()

    try:
        res = (
            sb.table("study_sessions")
            .insert({
                "owner_id": user_id,
                "session_type": session_type,
                "started_at": datetime.now(timezone.utc).isoformat(),
            })
            .execute()
        )
        return {"session": res.data[0] if res.data else None}
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to start study session: {e}"
        )


async def end_study_session(
    user_id: str,
    session_id: str,
) -> Dict[str, Any]:
    """End a study session and record duration."""
    sb = supabase_admin()

    ended_at = datetime.now(timezone.utc)

    try:
        session = (
            sb.table("study_sessions")
            .select("started_at")
            .eq("id", session_id)
            .eq("owner_id", user_id)
            .single()
            .execute()
        )

        if not session.data:
            raise HTTPException(status_code=404, detail="Session not found")

        started_at = datetime.fromisoformat(
            session.data["started_at"].replace("Z", "+00:00")
        )
        duration = int((ended_at - started_at).total_seconds())

        sb.table("study_sessions").update({
            "ended_at": ended_at.isoformat(),
            "duration_seconds": duration,
        }).eq("id", session_id).execute()

        return {
            "session_id": session_id,
            "duration_seconds": duration,
            "ended_at": ended_at.isoformat(),
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to end study session: {e}"
        )
