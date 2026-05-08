from pydantic import BaseModel, EmailStr
from typing import Optional


class AuthUserOut(BaseModel):
    """Public user profile returned by auth endpoints."""
    id: str
    email: Optional[str] = None
    role: str = "student"


class SessionStatusOut(BaseModel):
    """Session validation response."""
    authenticated: bool
    user: Optional[AuthUserOut] = None
    message: str


class TokenRefreshIn(BaseModel):
    """Request to refresh an access token."""
    refresh_token: str
