"""
Settings API Router — Profile, Preferences, Account.
"""
import logging
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, field_validator
from typing import Optional
from datetime import datetime, timezone

from app.core.auth import get_current_user
from app.core.supabase import supabase_admin

logger = logging.getLogger("medaitutor.settings")

router = APIRouter(prefix="/settings", tags=["Settings"])


VALID_LEARNING_LEVELS = {"beginner", "intermediate", "advanced"}
VALID_COUNTRY_CODES = {
    "US", "GB", "CA", "AU", "IN", "DE", "FR", "ES", "IT", "NL",
    "BR", "JP", "CN", "KR", "SG", "KE", "NG", "ZA", "EG", "PK",
    "BD", "PH", "VN", "TH", "MY", "ID", "TR", "RU", "MX", "AR",
}
VALID_MODES = {"beginner", "exam", "clinical", "rapid_review", "socratic"}
VALID_LENGTHS = {"concise", "normal", "detailed"}
VALID_TONES = {"balanced", "motivating", "concise", "exam", "socratic"}


class ProfileUpdate(BaseModel):
    display_name: Optional[str] = Field(None, min_length=1, max_length=100)
    bio: Optional[str] = Field(None, max_length=500)
    institution: Optional[str] = Field(None, max_length=200)
    learning_level: Optional[str] = None
    country: Optional[str] = Field(None, max_length=100)

    @field_validator("learning_level")
    @classmethod
    def validate_learning_level(cls, v):
        if v is not None and v not in VALID_LEARNING_LEVELS:
            raise ValueError(f"Must be one of: {', '.join(sorted(VALID_LEARNING_LEVELS))}")
        return v


class PreferencesUpdate(BaseModel):
    preferred_mode: Optional[str] = None
    response_length: Optional[str] = None
    ai_tone: Optional[str] = None
    exam_difficulty: Optional[str] = None
    notif_reminders: Optional[bool] = None
    notif_streaks: Optional[bool] = None
    notif_reports: Optional[bool] = None
    notif_billing: Optional[bool] = None

    @field_validator("preferred_mode")
    @classmethod
    def validate_mode(cls, v):
        if v is not None and v not in VALID_MODES:
            raise ValueError(f"Must be one of: {', '.join(sorted(VALID_MODES))}")
        return v

    @field_validator("response_length")
    @classmethod
    def validate_length(cls, v):
        if v is not None and v not in VALID_LENGTHS:
            raise ValueError(f"Must be one of: {', '.join(sorted(VALID_LENGTHS))}")
        return v

    @field_validator("ai_tone")
    @classmethod
    def validate_tone(cls, v):
        if v is not None and v not in VALID_TONES:
            raise ValueError(f"Must be one of: {', '.join(sorted(VALID_TONES))}")
        return v


@router.get("/profile")
async def get_profile(user=Depends(get_current_user)):
    sb = supabase_admin()
    try:
        res = sb.table("user_profiles").select("*").eq("user_id", user["id"]).single().execute()
        if res.data:
            return {"profile": res.data}
    except Exception as exc:
        logger.warning("Profile fetch failed for user %s: %s", user["id"], str(exc)[:200])
    return {
        "profile": {
            "display_name": user.get("email", "").split("@")[0] if user.get("email") else "",
            "bio": "", "institution": "", "learning_level": "beginner", "country": "",
            "email": user.get("email", ""),
        }
    }


@router.put("/profile")
async def update_profile(payload: ProfileUpdate, user=Depends(get_current_user)):
    sb = supabase_admin()
    updates = {k: v for k, v in payload.model_dump(exclude_none=True).items() if v is not None}
    if not updates:
        return {"updated": False, "message": "No fields to update"}
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()

    try:
        existing = sb.table("user_profiles").select("id").eq("user_id", user["id"]).single().execute()
        if existing.data:
            sb.table("user_profiles").update(updates).eq("user_id", user["id"]).execute()
        else:
            updates["user_id"] = user["id"]
            sb.table("user_profiles").insert(updates).execute()
        return {"updated": True}
    except Exception as e:
        logger.error("Profile update failed for user %s: %s", user["id"], str(e)[:200])
        raise HTTPException(status_code=500, detail="Failed to update profile")


@router.put("/preferences")
async def update_preferences(payload: PreferencesUpdate, user=Depends(get_current_user)):
    sb = supabase_admin()
    prefs = {k: v for k, v in payload.model_dump(exclude_none=True).items() if v is not None}
    if not prefs:
        return {"updated": False}

    try:
        existing = sb.table("user_profiles").select("id,preferences").eq("user_id", user["id"]).single().execute()
        current_prefs = (existing.data.get("preferences") or {}) if existing.data else {}
        merged = {**current_prefs, **prefs}

        if existing.data:
            sb.table("user_profiles").update({"preferences": merged, "updated_at": datetime.now(timezone.utc).isoformat()}).eq("user_id", user["id"]).execute()
        else:
            sb.table("user_profiles").insert({"user_id": user["id"], "preferences": merged}).execute()
        return {"updated": True, "preferences": merged}
    except Exception as e:
        logger.error("Preferences update failed for user %s: %s", user["id"], str(e)[:200])
        raise HTTPException(status_code=500, detail="Failed to update preferences")


@router.post("/reset-password")
async def reset_password(user=Depends(get_current_user)):
    sb = supabase_admin()
    email = user.get("email")
    if not email:
        raise HTTPException(status_code=400, detail="No email on account")
    try:
        sb.auth.admin.generate_link(type="recovery", email=email)
        return {"sent": True}
    except Exception as e:
        logger.error("Password reset failed for %s: %s", user["id"], str(e)[:200])
        raise HTTPException(status_code=500, detail="Failed to send reset email")


@router.delete("/account")
async def delete_account(user=Depends(get_current_user)):
    sb = supabase_admin()
    uid = user["id"]
    try:
        sb.table("user_profiles").delete().eq("user_id", uid).execute()
        sb.auth.admin.delete_user(uid)
        return {"deleted": True}
    except Exception as e:
        logger.error("Account deletion failed for %s: %s", uid, str(e)[:200])
        raise HTTPException(status_code=500, detail="Failed to delete account")


@router.get("/export")
async def export_data(user=Depends(get_current_user)):
    sb = supabase_admin()
    uid = user["id"]
    try:
        profile = sb.table("user_profiles").select("*").eq("user_id", uid).single().execute()
        sessions = sb.table("chat_sessions").select("id,title,mode,created_at").eq("user_id", uid).order("created_at", desc=True).execute()
        session_ids = [s["id"] for s in (sessions.data or [])]
        messages = []
        if session_ids:
            msgs = sb.table("chat_messages").select("role,content,created_at").in_("session_id", session_ids).order("created_at", asc=True).execute()
            messages = msgs.data or []
        return {
            "exported_at": datetime.now(timezone.utc).isoformat(),
            "profile": profile.data or {},
            "sessions": sessions.data or [],
            "messages_count": len(messages),
        }
    except Exception as e:
        logger.error("Data export failed for %s: %s", uid, str(e)[:200])
        raise HTTPException(status_code=500, detail="Failed to export data")
