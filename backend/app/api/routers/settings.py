"""
Settings API Router — Profile, Preferences, Account.
"""
from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from typing import Optional

from app.core.auth import get_current_user
from app.core.supabase import supabase_admin

router = APIRouter(prefix="/settings", tags=["Settings"])


class ProfileUpdate(BaseModel):
    display_name: Optional[str] = None
    bio: Optional[str] = None
    institution: Optional[str] = None
    learning_level: Optional[str] = None
    country: Optional[str] = None


class PreferencesUpdate(BaseModel):
    preferred_mode: Optional[str] = None
    response_length: Optional[str] = None
    ai_tone: Optional[str] = None
    exam_difficulty: Optional[str] = None
    notif_reminders: Optional[bool] = None
    notif_streaks: Optional[bool] = None
    notif_reports: Optional[bool] = None
    notif_billing: Optional[bool] = None


@router.get("/profile")
async def get_profile(user=Depends(get_current_user)):
    sb = supabase_admin()
    try:
        res = sb.table("user_profiles").select("*").eq("user_id", user["id"]).single().execute()
        if res.data:
            return {"profile": res.data}
    except Exception:
        pass
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
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not updates:
        return {"updated": False, "message": "No fields to update"}

    try:
        existing = sb.table("user_profiles").select("id").eq("user_id", user["id"]).single().execute()
        if existing.data:
            sb.table("user_profiles").update(updates).eq("user_id", user["id"]).execute()
        else:
            updates["user_id"] = user["id"]
            sb.table("user_profiles").insert(updates).execute()
        return {"updated": True}
    except Exception as e:
        return {"updated": False, "error": str(e)[:200]}


@router.put("/preferences")
async def update_preferences(payload: PreferencesUpdate, user=Depends(get_current_user)):
    sb = supabase_admin()
    prefs = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not prefs:
        return {"updated": False}

    try:
        existing = sb.table("user_profiles").select("id,preferences").eq("user_id", user["id"]).single().execute()
        current_prefs = (existing.data.get("preferences") or {}) if existing.data else {}
        merged = {**current_prefs, **prefs}

        if existing.data:
            sb.table("user_profiles").update({"preferences": merged}).eq("user_id", user["id"]).execute()
        else:
            sb.table("user_profiles").insert({"user_id": user["id"], "preferences": merged}).execute()
        return {"updated": True, "preferences": merged}
    except Exception:
        return {"updated": False}
