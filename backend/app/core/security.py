"""
Security & Authorization Utilities.

Centralized role-based access control (RBAC), permission checks,
and rate-limiting helpers. Designed for scalable SaaS architecture.

Role hierarchy:
    admin > premium > student > anonymous
"""

from typing import Dict, Any, Callable, Optional
from functools import wraps

from fastapi import HTTPException, Depends

from app.core.auth import get_current_user


class Roles:
    STUDENT = "student"
    PREMIUM = "premium"
    ADMIN = "admin"
    ANONYMOUS = "anonymous"


ROLE_HIERARCHY = {
    Roles.ADMIN: 100,
    Roles.PREMIUM: 50,
    Roles.STUDENT: 10,
    Roles.ANONYMOUS: 0,
}


def get_user_role(user: Dict[str, Any]) -> str:
    """
    Extract the user's role from the auth context.

    Defaults to 'student' if no role is set.
    Maps Supabase's 'authenticated' role to 'student'.
    """
    raw_role = user.get("role", "student")

    if raw_role == "authenticated":
        return Roles.STUDENT
    if raw_role in ROLE_HIERARCHY:
        return raw_role

    return Roles.STUDENT


def has_role(user: Dict[str, Any], required_roles: list[str]) -> bool:
    """
    Check if user has at least one of the required roles.

    Args:
        user: The authenticated user dict from get_current_user
        required_roles: List of acceptable roles (e.g., ['premium', 'admin'])

    Returns:
        True if user's role meets or exceeds any required role
    """
    user_role = get_user_role(user)
    user_level = ROLE_HIERARCHY.get(user_role, 0)

    for role in required_roles:
        required_level = ROLE_HIERARCHY.get(role, 0)
        if user_level >= required_level:
            return True

    return False


def require_role(*roles: str):
    """
    FastAPI dependency that requires the user to have at least one
    of the specified roles.

    Usage:
        @router.get("/admin")
        async def admin_endpoint(user = Depends(require_role("admin"))):
            ...

        @router.get("/premium-feature")
        async def premium_feature(user = Depends(require_role("admin", "premium"))):
            ...
    """

    async def dependency(user: Dict[str, Any] = Depends(get_current_user)):
        if not has_role(user, list(roles)):
            raise HTTPException(
                status_code=403,
                detail=f"This endpoint requires one of these roles: {', '.join(roles)}",
            )
        return user

    return dependency


def require_premium(user: Dict[str, Any] = Depends(get_current_user)):
    """
    Dependency that requires premium or admin role.
    Used to gate AI-heavy features behind a subscription.
    """
    if not has_role(user, [Roles.PREMIUM, Roles.ADMIN]):
        raise HTTPException(
            status_code=403,
            detail="Premium subscription required for this feature.",
        )
    return user


def require_admin(user: Dict[str, Any] = Depends(get_current_user)):
    """
    Dependency that requires admin role.
    Used for administrative dashboards and management endpoints.
    """
    if not has_role(user, [Roles.ADMIN]):
        raise HTTPException(
            status_code=403,
            detail="Admin access required.",
        )
    return user
