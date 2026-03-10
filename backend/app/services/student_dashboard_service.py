from fastapi import HTTPException
from typing import Dict, Any, List

from app.core.supabase import supabase_admin


async def log_student_question(
    user_id: str,
    document_id: str,
    question: str,
) -> None:
    sb = supabase_admin()

    try:
        sb.table("student_questions").insert({
            "owner_id": user_id,
            "document_id": document_id,
            "question": question,
        }).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to log student question: {e}")


async def get_student_dashboard(user_id: str) -> Dict[str, Any]:
    sb = supabase_admin()

    try:
        docs_res = (
            sb.table("documents")
            .select("id, title, created_at", count="exact")
            .eq("owner_id", user_id)
            .execute()
        )

        questions_res = (
            sb.table("student_questions")
            .select("id, question, created_at", count="exact")
            .eq("owner_id", user_id)
            .order("created_at", desc=True)
            .limit(10)
            .execute()
        )

        flashcards_res = (
            sb.table("flashcard_sessions")
            .select("id, cards_generated, created_at", count="exact")
            .eq("owner_id", user_id)
            .order("created_at", desc=True)
            .limit(10)
            .execute()
        )

        documents_uploaded = docs_res.count or 0
        questions_asked = questions_res.count or 0

        flashcard_rows = flashcards_res.data or []
        flashcards_created = sum(item.get("cards_generated", 0) for item in flashcard_rows)

        recent_activity: List[Dict[str, Any]] = []

        for q in (questions_res.data or []):
            recent_activity.append({
                "type": "question",
                "label": f'Asked: {q["question"]}',
                "created_at": q.get("created_at"),
            })

        for f in flashcard_rows:
            recent_activity.append({
                "type": "flashcards",
                "label": f'Generated {f.get("cards_generated", 0)} flashcards',
                "created_at": f.get("created_at"),
            })

        for d in (docs_res.data or [])[:10]:
            recent_activity.append({
                "type": "document",
                "label": f'Uploaded: {d["title"]}',
                "created_at": d.get("created_at"),
            })

        recent_activity.sort(
            key=lambda x: x.get("created_at") or "",
            reverse=True,
        )

        return {
            "documents_uploaded": documents_uploaded,
            "questions_asked": questions_asked,
            "flashcards_created": flashcards_created,
            "recent_activity": recent_activity[:10],
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load dashboard: {e}")