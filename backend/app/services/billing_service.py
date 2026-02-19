from app.core.supabase import supabase_admin

def get_plan_status(user_id: str):
    sb = supabase_admin()
    sub = sb.table("subscriptions").select("plan,active").eq("owner_id", user_id).single().execute()
    return sub.data if sub.data else {"plan": "free", "active": False}

def is_paid_user(user_id: str) -> bool:
    sb = supabase_admin()
    res = sb.table("subscriptions").select("active").eq("owner_id", user_id).execute().data
    return bool(res and res[0].get("active") is True)
