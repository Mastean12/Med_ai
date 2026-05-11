"""
Authentication & Authorization Module.

Handles JWT validation via Supabase Auth, token extraction,
and optional session persistence readiness for frontend integration.

Upgraded: Better error messages, token expiration awareness,
and structured auth responses for frontend consumption.
"""

import time
import logging
from typing import Optional, Dict, Any

from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.core.supabase import supabase_anon
from app.core.config import settings

logger = logging.getLogger("noctual.auth")

bearer = HTTPBearer(auto_error=False)


def extract_token_from_request(request: Request) -> Optional[str]:
    """
    Extract Bearer token from Authorization header.
    Also checks cookies for 'sb-access-token' (used by Supabase client SDK).
    """
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        return auth_header[7:]

    cookie_token = request.cookies.get("sb-access-token")
    if cookie_token:
        return cookie_token

    return None


def get_current_user(
    creds: HTTPAuthorizationCredentials = Depends(bearer),
) -> Dict[str, Any]:
    """
    Validate JWT via Supabase and return user identity.

    Retries once on timeout. Returns 401 on failure.

    Returns:
        {"id": str, "email": str, "role": str, "last_sign_in_at": str}
    """
    if not creds or not creds.credentials:
        raise HTTPException(
            status_code=401,
            detail="Authentication required. Provide a valid Bearer token.",
        )

    token = creds.credentials
    sb = supabase_anon()

    for attempt in range(2):
        try:
            user_resp = sb.auth.get_user(token)

            if not user_resp or not getattr(user_resp, "user", None):
                raise HTTPException(
                    status_code=401,
                    detail="Invalid access token. Please log in again.",
                )

            user = user_resp.user
            return {
                "id": user.id,
                "email": user.email,
                "role": getattr(user, "role", "authenticated"),
                "last_sign_in_at": getattr(user, "last_sign_in_at", None),
            }
        except HTTPException:
            raise
        except Exception as e:
            error_msg = str(e).lower()

            if "expired" in error_msg or "jwt expired" in error_msg:
                raise HTTPException(status_code=401, detail="Access token has expired. Please refresh your session.")
            if "invalid" in error_msg or "malformed" in error_msg:
                raise HTTPException(status_code=401, detail="Invalid access token format.")

            is_timeout = any(kw in error_msg for kw in ["timed out", "timeout", "timedout", "read operation"])
            if is_timeout and attempt == 0:
                logger.warning("Auth timeout on attempt 1, retrying...")
                time.sleep(1)
                continue

            logger.error("Auth validation failed: %s", str(e)[:200])
            if is_timeout:
                raise HTTPException(status_code=503, detail="Authentication service temporarily unavailable. Please try again.")
            raise HTTPException(status_code=401, detail="Unable to validate authentication. Please try again.")


def get_optional_user(
    creds: HTTPAuthorizationCredentials = Depends(bearer),
) -> Optional[Dict[str, Any]]:
    """
    Optional authentication — returns None if no token is provided.
    Useful for public endpoints that can optionally personalize content.
    """
    if not creds or not creds.credentials:
        return None

    try:
        return get_current_user(creds)
    except HTTPException:
        return None
