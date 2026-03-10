from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.core.supabase import supabase_anon

bearer = HTTPBearer(auto_error=False)

def get_current_user(
    creds: HTTPAuthorizationCredentials = Depends(bearer),
):
    if not creds or not creds.credentials:
        raise HTTPException(status_code=401, detail="Missing Authorization Bearer token")

    token = creds.credentials  # this is the JWT only (no "Bearer ")

    sb = supabase_anon()
    try:
        user_resp = sb.auth.get_user(token)
        if not user_resp or not getattr(user_resp, "user", None):
            raise HTTPException(status_code=401, detail="Invalid token")
        return {"id": user_resp.user.id, "email": user_resp.user.email}
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Auth failed: {e}")
