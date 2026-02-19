from datetime import date
from fastapi import HTTPException
from app.core.config import FREE_DAILY_AI_LIMIT
from app.core.supabase import supabase_admin
from app.services.billing_service import is_paid_user

def enforce_ai_usage(user_id: str):
    if is_paid_user(user_id):
        return

    sb = supabase_admin()
    today = str(date.today())

    row = sb.table("usage_counters").select("*").eq("owner_id", user_id).eq("day", today).execute().data
    if not row:
        sb.table("usage_counters").insert({"owner_id": user_id, "day": today, "ai_requests": 1}).execute()
        return

    current = row[0]["ai_requests"]
    if current >= FREE_DAILY_AI_LIMIT:
        raise HTTPException(status_code=402, detail="Free tier limit reached. Subscribe for more access.")

    sb.table("usage_counters").update({"ai_requests": current + 1}).eq("id", row[0]["id"]).execute()
