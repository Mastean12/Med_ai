"""
AI Tutoring API Router.

Endpoints:
- POST /tutor/chat       — send message to AI tutor
- GET  /tutor/sessions    — list tutoring sessions
- GET  /tutor/session/{id}— get session with messages
- DELETE /tutor/session/{id} — delete session
"""

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional

from app.core.auth import get_current_user
from app.services.tutoring_service import (
    tutor_chat,
    tutor_chat_streaming,
    list_sessions,
    get_session,
    delete_session,
)

router = APIRouter(prefix="/tutor", tags=["Tutor"])


class TutorChatIn(BaseModel):
    message: str
    session_id: Optional[str] = None
    document_id: Optional[str] = None
    stream: bool = False


class TutorChatOut(BaseModel):
    session_id: str
    message: dict


@router.post("/chat")
async def chat(payload: TutorChatIn, user=Depends(get_current_user)):
    """
    Chat with your personal AI medical tutor.

    Creates a new session if no session_id is provided.
    Supports optional context from uploaded documents.
    Set stream=true for streaming responses.
    """
    if payload.stream:
        async def event_stream():
            async for chunk in tutor_chat_streaming(
                user_id=user["id"],
                session_id=payload.session_id,
                message=payload.message,
                document_id=payload.document_id,
            ):
                yield f"data: {chunk}\n\n"
            yield "data: [DONE]\n\n"

        return StreamingResponse(
            event_stream(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
            },
        )

    result = await tutor_chat(
        user_id=user["id"],
        session_id=payload.session_id,
        message=payload.message,
        document_id=payload.document_id,
    )

    return result


@router.get("/sessions")
async def sessions(user=Depends(get_current_user)):
    """List all your tutoring sessions."""
    return await list_sessions(user["id"])


@router.get("/session/{session_id}")
async def session_detail(session_id: str, user=Depends(get_current_user)):
    """Get a tutoring session with all messages."""
    return await get_session(user["id"], session_id)


@router.delete("/session/{session_id}")
async def remove_session(session_id: str, user=Depends(get_current_user)):
    """Delete a tutoring session."""
    return await delete_session(user["id"], session_id)
