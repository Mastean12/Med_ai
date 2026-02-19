from fastapi import APIRouter
from fastapi import Depends
from app.core.config import SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
from app.core.auth import get_current_user

router = APIRouter()

@router.get("/db-ping")
def db_ping():
    """Test endpoint to verify Supabase connection.
    
    Returns:
    - If env vars are set: connects to Supabase and returns row count
    - If env vars are missing: returns warning message
    """
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        return {
            "status": "warning",
            "message": "Supabase credentials not configured in .env",
            "next_steps": [
                "1. Go to https://app.supabase.com/projects",
                "2. Open your project → Settings → API",
                "3. Copy SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY",
                "4. Add them to backend/.env",
                "5. Restart the server"
            ]
        }
    
    try:
        from app.core.supabase import supabase_admin
        sb = supabase_admin()
        res = sb.table("documents").select("id").limit(1).execute()
        return {"ok": True, "rows_returned": len(res.data)}
    except Exception as e:
        return {"ok": False, "error": str(e)}

@router.get("/whoami")
def whoami(user=Depends(get_current_user)):
    return user