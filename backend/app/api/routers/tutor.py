"""
AI Tutoring API Router.

Endpoints:
- POST /tutor/chat           — send message (supports mode param)
- GET  /tutor/sessions        — list sessions
- GET  /tutor/session/{id}    — get session with messages
- DELETE /tutor/session/{sid} — delete session
- GET  /tutor/modes           — list available tutoring modes
- GET  /tutor/analytics       — tutoring usage analytics
"""

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from typing import Optional

from app.core.auth import get_current_user
from app.core.plans import Feature
from app.services.usage_service import enforce_feature_access, increment_usage
from app.services.tutoring_service import (
    VALID_MODES, MODE_LABELS, MODE_DESCRIPTIONS, BEGINNER, NORMAL,
    tutor_chat, tutor_chat_streaming, list_sessions, get_session,
    delete_session, get_tutor_analytics,
)

router = APIRouter(prefix="/tutor", tags=["Tutor"])


class TutorChatIn(BaseModel):
    message: str
    session_id: Optional[str] = None
    mode: str = Field(default="beginner", description="beginner | exam | clinical | rapid_review | socratic")
    response_length: str = Field(default="normal", description="concise | normal | detailed")
    document_id: Optional[str] = None
    stream: bool = False


@router.post("/chat")
async def chat(payload: TutorChatIn, user=Depends(get_current_user)):
    """
    Chat with your AI medical tutor.

    **Modes:**
    - `beginner` — Simplified explanations for foundational learning
    - `exam` — High-yield facts, mnemonics, exam traps, practice questions
    - `clinical` — Patient scenarios, differentials, investigations, management
    - `rapid_review` — Ultra-concise bullet-point revision format
    - `socratic` — Guided discovery through questioning (tutor asks you questions)

    Set `stream=true` for real-time streaming responses via Server-Sent Events.
    """
    mode = payload.mode if payload.mode in VALID_MODES else BEGINNER
    await enforce_feature_access(user["id"], Feature.TUTORING_SESSIONS)
    await increment_usage(user["id"], Feature.TUTORING_SESSIONS)

    if payload.stream:
        async def event_stream():
            async for chunk in tutor_chat_streaming(
                user_id=user["id"],
                session_id=payload.session_id,
                message=payload.message,
                mode=mode,
                document_id=payload.document_id,
                response_length=payload.response_length,
            ):
                yield f"data: {chunk}\n\n"
            yield "data: [DONE]\n\n"

        return StreamingResponse(
            event_stream(),
            media_type="text/event-stream",
            headers={"Cache-Control": "no-cache", "Connection": "keep-alive"},
        )

    result = await tutor_chat(
        user_id=user["id"],
        session_id=payload.session_id,
        message=payload.message,
        mode=mode,
        document_id=payload.document_id,
        response_length=payload.response_length,
    )
    return result


@router.get("/sessions")
async def sessions(user=Depends(get_current_user)):
    """List all tutoring sessions with mode info."""
    return await list_sessions(user["id"])


@router.get("/session/{session_id}")
async def session_detail(session_id: str, user=Depends(get_current_user)):
    """Get a tutoring session with all messages."""
    return await get_session(user["id"], session_id)


@router.delete("/session/{session_id}")
async def remove_session(session_id: str, user=Depends(get_current_user)):
    """Delete a tutoring session."""
    return await delete_session(user["id"], session_id)


@router.get("/modes")
async def list_modes():
    """List all available tutoring modes with descriptions."""
    return {
        "modes": [
            {"id": m, "label": MODE_LABELS[m], "description": MODE_DESCRIPTIONS[m]}
            for m in VALID_MODES
        ]
    }


@router.get("/analytics")
async def analytics(user=Depends(get_current_user)):
    """Get tutoring usage analytics — session count, mode usage breakdown."""
    return await get_tutor_analytics(user["id"])
