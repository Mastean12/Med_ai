from fastapi import Header, HTTPException
from app.core.supabase import supabase_anon
from app.core.config import ENV


def get_current_user(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing Authorization Bearer token")

    token = authorization.split(" ", 1)[1]
    sb = supabase_anon()
    
    try:
        user_resp = sb.auth.get_user(token)
        print(f"[DEBUG] Supabase get_user response: {user_resp}")
        
        if not user_resp or not getattr(user_resp, "user", None):
            print(f"[DEBUG] Invalid response or no user in response")
            raise HTTPException(status_code=401, detail="Invalid token")

        return {"id": user_resp.user.id, "email": user_resp.user.email}
    except Exception as e:
        print(f"[DEBUG] Auth error: {e}")
        raise HTTPException(status_code=401, detail=f"Auth failed: {str(e)}")
