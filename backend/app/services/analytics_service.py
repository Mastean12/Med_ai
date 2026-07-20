"""
Study Analytics Service.

Computes user analytics: streaks, weekly activity, performance trends.
Uses efficient Supabase aggregation queries + RPC functions.
"""

import logging
from datetime import date, datetime, timedelta, timezone
from typing import Dict, Any, List, Optional

from fastapi import HTTPException

from app.core.supabase import supabase_admin

logger = logging.getLogger("medaitutor.analytics")


async def get_study_analytics(user_id: str) -> Dict[str, Any]:
    """
    Comprehensive study analytics for a student.

    Returns:
        streak: Consecutive days with at least one study activity
        weekly_activity: Last 7 days of question + review counts
        totals: Lifetime counts (questions, flashcards, reviews, sessions)
        performance: Average review quality, mastery rate
        recent_sessions: Last 5 study sessions
    """
    sb = supabase_admin()

    try:
        streak = await _compute_streak(sb, user_id)
        weekly = await _get_weekly_activity(sb, user_id)
        totals = await _get_lifetime_totals(sb, user_id)
        performance = await _get_performance_metrics(sb, user_id)
        recent = await _get_recent_sessions(sb, user_id)

        return {
            "streak": streak,
            "weekly_activity": weekly,
            "totals": totals,
            "performance": performance,
            "recent_sessions": recent,
        }
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to compute analytics: {e}"
        )


async def _compute_streak(sb, user_id: str) -> Dict[str, Any]:
    """Compute current active-day streak from all activity sources."""
    try:
        active_dates = set()

        # Collect activity dates from all available tables
        date_sources = [
            ("student_questions", "created_at", "owner_id"),
            ("documents", "created_at", "owner_id"),
            ("chat_sessions", "created_at", "user_id"),
            ("flashcard_reviews", "reviewed_at", "owner_id"),
            ("flashcard_sessions", "created_at", "owner_id"),
        ]

        for table, date_col, owner_col in date_sources:
            try:
                res = (
                    sb.table(table)
                    .select(date_col)
                    .eq(owner_col, user_id)
                    .order(date_col, desc=True)
                    .limit(365)
                    .execute()
                )
                for row in res.data or []:
                    dt = row.get(date_col)
                    if dt:
                        active_dates.add(_parse_date(dt).isoformat())
            except Exception:
                continue

        if not active_dates:
            return {"current_streak": 0, "longest_streak": 0, "is_active_today": False}

        today = date.today()
        sorted_dates = sorted(active_dates, reverse=True)

        # Count streak starting from today, going backwards
        current = 0
        check = today
        while check.isoformat() in active_dates:
            current += 1
            check -= timedelta(days=1)

        # Compute longest streak
        all_dates = sorted(active_dates)
        longest = 0
        run = 0
        prev = None
        for d_str in all_dates:
            d = date.fromisoformat(d_str)
            if prev is None:
                run = 1
            elif (d - prev).days == 1:
                run += 1
            else:
                run = 1
            longest = max(longest, run)
            prev = d

        is_active_today = today.isoformat() in active_dates

        return {
            "current_streak": current,
            "longest_streak": longest,
            "is_active_today": is_active_today,
        }
    except Exception as e:
        logger.warning("Streak computation failed: %s", str(e))
        return {"current_streak": 0, "longest_streak": 0, "is_active_today": False}

        return {
            "current_streak": current,
            "longest_streak": longest,
            "is_active_today": is_active_today,
        }
    except Exception as e:
        logger.warning("Streak computation failed: %s", str(e))
        return {"current_streak": 0, "longest_streak": 0, "is_active_today": False}


async def _get_weekly_activity(sb, user_id: str) -> List[Dict[str, Any]]:
    """Last 7 days of daily activity breakdown."""
    try:
        res = sb.rpc("get_weekly_activity", {"p_owner_id": user_id}).execute()
        if res.data:
            return res.data[-7:]
        return _empty_weekly()
    except Exception:
        return _empty_weekly()


def _empty_weekly() -> List[Dict[str, Any]]:
    today = date.today()
    return [
        {
            "activity_date": (today - timedelta(days=i)).isoformat(),
            "questions_count": 0,
            "flashcards_count": 0,
        }
        for i in range(6, -1, -1)
    ]


async def _get_lifetime_totals(sb, user_id: str) -> Dict[str, Any]:
    """Lifetime aggregate counts."""
    try:
        q = (
            sb.table("student_questions")
            .select("id", count="exact")
            .eq("owner_id", user_id)
            .execute()
        )
        questions_total = q.count or 0

        f = (
            sb.table("flashcards")
            .select("id", count="exact")
            .eq("owner_id", user_id)
            .execute()
        )
        flashcards_total = f.count or 0

        r = (
            sb.table("flashcard_reviews")
            .select("id", count="exact")
            .eq("owner_id", user_id)
            .execute()
        )
        reviews_total = r.count or 0

        s = (
            sb.table("study_sessions")
            .select("id, duration_seconds")
            .eq("owner_id", user_id)
            .execute()
        )
        sessions_total = len(s.data) if s.data else 0
        total_seconds = sum(
            (row.get("duration_seconds") or 0) for row in (s.data or [])
        )

        return {
            "questions_asked": questions_total,
            "flashcards_saved": flashcards_total,
            "reviews_completed": reviews_total,
            "study_sessions": sessions_total,
            "total_study_minutes": round(total_seconds / 60),
        }
    except Exception as e:
        logger.warning("Totals computation failed: %s", str(e))
        return {
            "questions_asked": 0,
            "flashcards_saved": 0,
            "reviews_completed": 0,
            "study_sessions": 0,
            "total_study_minutes": 0,
        }


async def _get_performance_metrics(sb, user_id: str) -> Dict[str, Any]:
    """Review performance: average quality, mastery rate."""
    try:
        reviews = (
            sb.table("flashcard_reviews")
            .select("quality")
            .eq("owner_id", user_id)
            .execute()
        )

        if not reviews.data:
            return {"average_quality": None, "mastery_rate": None, "total_reviews": 0}

        qualities = [r["quality"] for r in reviews.data if "quality" in r]
        if not qualities:
            return {"average_quality": None, "mastery_rate": None, "total_reviews": 0}

        avg_q = round(sum(qualities) / len(qualities), 2)
        mastered = sum(1 for q in qualities if q >= 4)
        mastery_rate = round(mastered / len(qualities) * 100, 1)

        return {
            "average_quality": avg_q,
            "mastery_rate": mastery_rate,
            "total_reviews": len(qualities),
        }
    except Exception as e:
        logger.warning("Performance metrics failed: %s", str(e))
        return {"average_quality": None, "mastery_rate": None, "total_reviews": 0}


async def _get_recent_sessions(sb, user_id: str) -> List[Dict[str, Any]]:
    """Last 5 study sessions."""
    try:
        res = (
            sb.table("study_sessions")
            .select("id, session_type, started_at, ended_at, duration_seconds,"
                    "cards_reviewed, questions_asked")
            .eq("owner_id", user_id)
            .order("started_at", desc=True)
            .limit(5)
            .execute()
        )
        return res.data or []
    except Exception:
        return []


def _parse_date(dt_str: str) -> date:
    """Parse ISO datetime string to date, handling various formats."""
    try:
        return datetime.fromisoformat(dt_str.replace("Z", "+00:00")).date()
    except (ValueError, AttributeError):
        parts = dt_str.split("T")[0].split("-")
        return date(int(parts[0]), int(parts[1]), int(parts[2]))
