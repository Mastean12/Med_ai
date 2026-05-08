"""
Adaptive Learning Engine.

Tracks topic mastery, generates personalized recommendations,
analyzes study patterns, and adapts content difficulty.
"""

import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional

from fastapi import HTTPException

from app.core.supabase import supabase_admin
from app.services.llm_service import generate_llm_response

logger = logging.getLogger("noctual.adaptive")


async def get_learning_profile(user_id: str) -> Dict[str, Any]:
    """Get or create a learning profile for the user."""
    sb = supabase_admin()
    try:
        res = (
            sb.table("learning_profiles")
            .select("*")
            .eq("user_id", user_id)
            .single()
            .execute()
        )
        if res.data:
            return {"profile": res.data}
    except Exception:
        pass

    try:
        res = (
            sb.table("learning_profiles")
            .insert({
                "user_id": user_id,
                "strengths": [],
                "weaknesses": [],
                "study_preferences": {},
            })
            .execute()
        )
        return {"profile": res.data[0] if res.data else {}}
    except Exception:
        return {"profile": {}}


async def update_topic_mastery(
    user_id: str,
    topic: str,
    is_correct: bool,
) -> Dict[str, Any]:
    """
    Update mastery score for a topic using Bayesian-like update.

    Each correct answer increases mastery, wrong decreases it.
    Uses spaced repetition scheduling for next review.
    """
    sb = supabase_admin()

    try:
        existing = (
            sb.table("topic_mastery")
            .select("*")
            .eq("user_id", user_id)
            .eq("topic", topic)
            .single()
            .execute()
        )
    except Exception:
        existing = type("obj", (object,), {"data": None})()

    if existing.data:
        row = existing.data
        attempted = row.get("questions_attempted", 0) + 1
        correct = row.get("questions_correct", 0) + (1 if is_correct else 0)
        old_score = row.get("mastery_score", 0)

        weight = 1 / (attempted + 5)
        new_score = old_score * (1 - weight) + (100 if is_correct else 0 if attempted == 1 else old_score * 0.2) * weight

        if is_correct:
            next_review = datetime.now(timezone.utc) + timedelta(days=max(1, int(new_score / 10)))
        else:
            next_review = datetime.now(timezone.utc) + timedelta(hours=4)

        try:
            sb.table("topic_mastery").update({
                "mastery_score": round(min(100, max(0, new_score)), 1),
                "questions_attempted": attempted,
                "questions_correct": correct,
                "last_reviewed": datetime.now(timezone.utc).isoformat(),
                "next_review": next_review.isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }).eq("id", row["id"]).execute()
        except Exception:
            pass
    else:
        try:
            sb.table("topic_mastery").insert({
                "user_id": user_id,
                "topic": topic,
                "mastery_score": 80 if is_correct else 30,
                "questions_attempted": 1,
                "questions_correct": 1 if is_correct else 0,
                "last_reviewed": datetime.now(timezone.utc).isoformat(),
                "next_review": (datetime.now(timezone.utc) + timedelta(days=3)).isoformat(),
            }).execute()
        except Exception:
            pass

    return {"topic": topic, "updated": True}


async def get_mastery_summary(user_id: str) -> Dict[str, Any]:
    """Get topic mastery overview for the user."""
    sb = supabase_admin()
    try:
        res = (
            sb.table("topic_mastery")
            .select("*")
            .eq("user_id", user_id)
            .order("mastery_score", asc=True)
            .execute()
        )
        topics = res.data or []

        if not topics:
            return {"topics": [], "overall_mastery": 0, "strengths": [], "weaknesses": []}

        avg = sum(t["mastery_score"] for t in topics) / len(topics)

        strengths = [t for t in topics if t["mastery_score"] >= 70]
        weaknesses = [t for t in topics if t["mastery_score"] < 40]

        return {
            "topics": topics,
            "overall_mastery": round(avg, 1),
            "total_topics": len(topics),
            "strengths": strengths,
            "weaknesses": weaknesses,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get mastery: {e}")


async def generate_recommendations(user_id: str) -> Dict[str, Any]:
    """Generate personalized study recommendations based on mastery data."""
    mastery = await get_mastery_summary(user_id)

    if not mastery["topics"]:
        return {
            "recommendations": [
                {"recommendation": "Upload your first medical notes to start learning.", "reason": "Get started", "priority": 1},
                {"recommendation": "Try the AI Tutor to ask medical questions.", "reason": "Interactive learning", "priority": 2},
                {"recommendation": "Generate flashcards from your notes.", "reason": "Active recall practice", "priority": 3},
            ]
        }

    sb = supabase_admin()

    recs = []

    for weak in mastery["weaknesses"][:3]:
        recs.append({
            "recommendation": f"Review {weak['topic']} — mastery is at {weak['mastery_score']}%",
            "reason": f"Below 40% mastery — needs focused review",
            "priority": 1,
            "topic": weak["topic"],
        })

    due_topics = [t for t in mastery["topics"] if t.get("next_review") and t["next_review"] <= datetime.now(timezone.utc).isoformat()]
    for dt in due_topics[:3]:
        if dt["topic"] not in [r.get("topic") for r in recs]:
            recs.append({
                "recommendation": f"Spaced repetition review: {dt['topic']} (last reviewed: {dt.get('last_reviewed', 'never')})",
                "reason": "Due for spaced repetition review",
                "priority": 2,
                "topic": dt["topic"],
            })

    if len(recs) < 3:
        recs.append({
            "recommendation": "Try an AI-generated exam to test your knowledge.",
            "reason": "Active recall improves retention",
            "priority": 3,
        })

    for rec in recs:
        try:
            sb.table("recommendations").insert({
                "user_id": user_id,
                "recommendation": rec["recommendation"],
                "reason": rec["reason"],
                "priority": rec.get("priority", 0),
                "category": rec.get("topic", ""),
            }).execute()
        except Exception:
            pass

    return {"recommendations": recs}


async def get_learning_insights(user_id: str) -> Dict[str, Any]:
    """Comprehensive learning insights combining mastery, exam, and study data."""
    sb = supabase_admin()

    mastery = await get_mastery_summary(user_id)
    recs_data = await generate_recommendations(user_id)

    try:
        exams = (
            sb.table("exam_attempts")
            .select("score, completed_at, total_questions")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .limit(10)
            .execute()
        )
    except Exception:
        exams = type("obj", (object,), {"data": []})()

    try:
        sessions = (
            sb.table("chat_sessions")
            .select("id, title, created_at")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .limit(10)
            .execute()
        )
    except Exception:
        sessions = type("obj", (object,), {"data": []})()

    recent_scores = [e["score"] for e in (exams.data or []) if e.get("score") is not None]
    average_score = round(sum(recent_scores) / len(recent_scores), 1) if recent_scores else None
    score_trend = "improving" if recent_scores and len(recent_scores) >= 2 and recent_scores[0] > recent_scores[-1] else "stable"

    return {
        "overall_mastery": mastery.get("overall_mastery", 0),
        "topics_studied": mastery.get("total_topics", 0),
        "average_exam_score": average_score,
        "score_trend": score_trend,
        "exams_completed": len(exams.data or []),
        "tutoring_sessions": len(sessions.data or []),
        "strengths": [s["topic"] for s in mastery.get("strengths", [])],
        "weaknesses": [w["topic"] for w in mastery.get("weaknesses", [])],
        "recommendations": recs_data.get("recommendations", []),
    }
