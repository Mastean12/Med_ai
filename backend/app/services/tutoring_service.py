"""
AI Tutoring Service.

Personalized medical AI tutor with conversational memory,
session persistence, and exam-oriented teaching prompts.
"""

import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone

from fastapi import HTTPException

from app.core.supabase import supabase_admin
from app.services.llm_service import generate_llm_response

logger = logging.getLogger("noctual.tutor")

TUTOR_SYSTEM_PROMPT = """You are an expert AI medical tutor for Noctual AI, an AI-powered medical education platform. Your students are medical students preparing for exams (USMLE, PLAB, MBBS, etc.).

## Your Teaching Style
- Explain clearly and concisely — aim for 3–6 sentences per answer unless asked for depth.
- Use simple language first, then introduce medical terminology with definitions.
- Think like a friendly senior doctor teaching a junior — supportive, patient, encouraging.
- Structure responses: definition → causes → clinical features → investigations → management.
- Provide memory aids: mnemonics, analogies, pattern recognition tips.
- Connect to clinical practice: "This is important because..."
- Highlight high-yield exam points: "Examiners often test..."

## Absolute Rules
- NEVER diagnose the student or anyone else.
- NEVER prescribe medication or recommend specific treatments for individuals.
- ALWAYS maintain an educational framing: "In clinical practice..." NOT "You should..."
- If asked for personal medical advice, respond: "I'm an educational tool, not a doctor. For personal health concerns, please consult a healthcare professional."
- Base answers on established medical knowledge. If you're unsure, say so.
- Keep responses factual and evidence-based.

## Context Awareness
When the student has uploaded notes, you'll receive relevant excerpts. Use them to ground your answers. If the notes don't cover the topic, teach from general medical knowledge but be clear about the source.

## Follow-up Style
- End some responses with a follow-up question to check understanding.
- Offer to dive deeper: "Would you like me to explain the management in more detail?"

## Exam Preparation
- When asked about a condition, include: typical presentation, key investigations, first-line management, and classic exam associations.
- Mention common exam traps and how to avoid them."""


async def create_session(user_id: str, title: str = "New Session") -> Dict[str, Any]:
    """Create a new tutoring session."""
    sb = supabase_admin()
    try:
        res = (
            sb.table("chat_sessions")
            .insert({"user_id": user_id, "title": title})
            .execute()
        )
        return res.data[0] if res.data else {}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create session: {e}")


async def list_sessions(user_id: str) -> Dict[str, Any]:
    """List all tutoring sessions for a user."""
    sb = supabase_admin()
    try:
        res = (
            sb.table("chat_sessions")
            .select("*", count="exact")
            .eq("user_id", user_id)
            .order("updated_at", desc=True)
            .execute()
        )
        return {"sessions": res.data or [], "total": res.count or 0}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list sessions: {e}")


async def get_session(user_id: str, session_id: str) -> Dict[str, Any]:
    """Get a session with all messages."""
    sb = supabase_admin()
    try:
        session = (
            sb.table("chat_sessions")
            .select("*")
            .eq("id", session_id)
            .eq("user_id", user_id)
            .single()
            .execute()
        )
        if not session.data:
            raise HTTPException(status_code=404, detail="Session not found")

        messages = (
            sb.table("chat_messages")
            .select("*")
            .eq("session_id", session_id)
            .order("created_at", asc=True)
            .execute()
        )

        return {"session": session.data, "messages": messages.data or []}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get session: {e}")


async def delete_session(user_id: str, session_id: str) -> Dict[str, Any]:
    """Delete a tutoring session and all its messages."""
    sb = supabase_admin()
    try:
        check = (
            sb.table("chat_sessions")
            .select("id")
            .eq("id", session_id)
            .eq("user_id", user_id)
            .single()
            .execute()
        )
        if not check.data:
            raise HTTPException(status_code=404, detail="Session not found")

        sb.table("chat_sessions").delete().eq("id", session_id).execute()
        return {"deleted": session_id}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete session: {e}")


async def tutor_chat(
    user_id: str,
    session_id: Optional[str],
    message: str,
    document_id: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Main tutoring chat endpoint.

    If session_id is None, creates a new session.
    Retrieves conversation history for context.
    Optionally grounds answers in uploaded document.
    """
    sb = supabase_admin()

    if not session_id:
        title = message[:80] + ("..." if len(message) > 80 else "")
        session = await create_session(user_id, title)
        session_id = session["id"]
    else:
        check = (
            sb.table("chat_sessions")
            .select("id")
            .eq("id", session_id)
            .eq("user_id", user_id)
            .single()
            .execute()
        )
        if not check.data:
            session = await create_session(user_id, message[:80])
            session_id = session["id"]

    try:
        sb.table("chat_messages").insert({
            "session_id": session_id,
            "role": "user",
            "content": message,
        }).execute()
    except Exception:
        pass

    history = []
    try:
        msgs = (
            sb.table("chat_messages")
            .select("role, content")
            .eq("session_id", session_id)
            .order("created_at", asc=True)
            .execute()
        )
        for m in (msgs.data or [])[-12:]:
            history.append({"role": m["role"], "content": m["content"]})
    except Exception:
        pass

    context_note = ""
    if document_id:
        try:
            from app.services.rag_service import clean_chunk_text
            chunks = (
                sb.table("doc_chunks")
                .select("chunk_text")
                .eq("owner_id", user_id)
                .eq("document_id", document_id)
                .limit(3)
                .execute()
            )
            if chunks.data:
                context_note = "\n\nRelevant notes from your uploaded document:\n" + "\n".join(
                    clean_chunk_text(c["chunk_text"])[:500] for c in chunks.data
                )
        except Exception:
            pass

    try:
        response = await generate_llm_response(
            system_prompt=TUTOR_SYSTEM_PROMPT,
            user_prompt=message + context_note,
            conversation=history[:-1] if len(history) > 1 else None,
            temperature=0.3,
        )
    except HTTPException:
        response = "I'm having trouble processing that right now. Please try again in a moment."
    except Exception:
        response = "Something went wrong. Please try rephrasing your question."

    try:
        sb.table("chat_messages").insert({
            "session_id": session_id,
            "role": "assistant",
            "content": response,
        }).execute()
        sb.table("chat_sessions").update({
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }).eq("id", session_id).execute()
    except Exception:
        pass

    return {
        "session_id": session_id,
        "message": {
            "role": "assistant",
            "content": response,
        },
    }


async def tutor_chat_streaming(
    user_id: str,
    session_id: Optional[str],
    message: str,
    document_id: Optional[str] = None,
):
    """Streaming variant of tutor_chat."""
    from app.services.llm_service import generate_llm_response_streaming

    sb = supabase_admin()

    if not session_id:
        title = message[:80] + ("..." if len(message) > 80 else "")
        session = await create_session(user_id, title)
        session_id = session["id"]

    try:
        sb.table("chat_messages").insert({
            "session_id": session_id, "role": "user", "content": message,
        }).execute()
    except Exception:
        pass

    history = []
    try:
        msgs = (
            sb.table("chat_messages")
            .select("role, content")
            .eq("session_id", session_id)
            .order("created_at", asc=True)
            .execute()
        )
        for m in (msgs.data or [])[-12:]:
            history.append({"role": m["role"], "content": m["content"]})
    except Exception:
        pass

    full_response = ""
    try:
        async for chunk in generate_llm_response_streaming(
            system_prompt=TUTOR_SYSTEM_PROMPT,
            user_prompt=message,
            conversation=history[:-1] if len(history) > 1 else None,
        ):
            full_response += chunk
            yield chunk
    except Exception:
        fallback = "I'm having trouble processing that. Please try again."
        full_response = fallback
        yield fallback

    try:
        sb.table("chat_messages").insert({
            "session_id": session_id, "role": "assistant", "content": full_response,
        }).execute()
        sb.table("chat_sessions").update({
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }).eq("id", session_id).execute()
    except Exception:
        pass
