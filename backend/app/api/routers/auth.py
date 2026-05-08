"""
Auth Management Router.

Provides session validation, user profile, and auth health endpoints.
All token operations are handled by Supabase Auth — this router
serves as the backend-side auth verification layer.
"""

import logging
from fastapi import APIRouter, Depends

from app.core.auth import get_current_user, get_optional_user
from app.core.security import get_user_role, require_admin
from app.schemas.auth import AuthUserOut, SessionStatusOut

logger = logging.getLogger("noctual.auth_router")

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.get("/me", response_model=AuthUserOut)
async def get_my_profile(user=Depends(get_current_user)):
    """
    Return the authenticated user's profile.
    Requires valid JWT.
    """
    return AuthUserOut(
        id=user["id"],
        email=user.get("email"),
        role=get_user_role(user),
    )


@router.get("/session", response_model=SessionStatusOut)
async def validate_session(user=Depends(get_optional_user)):
    """
    Validate the current session and return auth status.

    Used by the frontend to check if the user is logged in
    and to retrieve basic profile info on page load.
    """
    if user is None:
        return SessionStatusOut(
            authenticated=False,
            user=None,
            message="No valid session found.",
        )

    return SessionStatusOut(
        authenticated=True,
        user=AuthUserOut(
            id=user["id"],
            email=user.get("email"),
            role=get_user_role(user),
        ),
        message="Session is valid.",
    )


@router.get("/admin-test")
async def admin_test(user=Depends(require_admin)):
    """
    Test endpoint — only accessible by admin users.
    Verifies the role-based access control system.
    """
    return {
        "message": "Admin access verified.",
        "user_id": user["id"],
        "role": get_user_role(user),
    }
