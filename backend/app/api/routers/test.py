from fastapi import APIRouter
from fastapi import Depends
from app.core.config import settings
from app.core.auth import get_current_user
from app.services.llm_service import generate_llm_response

router = APIRouter()

@router.get("/db-ping")
def db_ping():
    """Test endpoint to verify Supabase connection.
    
    Returns:
    - If env vars are set: connects to Supabase and returns row count
    - If env vars are missing: returns warning message
    """
    if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_ROLE_KEY:
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

@router.post("/llm")
async def test_llm():
    """Test endpoint to verify DeepSeek connection.

    Returns:
    - If API key is set: makes a test call to DeepSeek
    - If API key is missing: returns warning message
    """
    if not settings.DEEPSEEK_API_KEY:
        return {
            "status": "warning",
            "message": "DeepSeek API key not configured in .env",
            "next_steps": [
                "1. Get your API key from https://platform.deepseek.com/",
                "2. Add DEEPSEEK_API_KEY to backend/.env",
                "3. Restart the server"
            ]
        }

    try:
        system_prompt = "You are a helpful AI assistant."
        user_prompt = "Say 'Hello from DeepSeek!' and nothing else."

        response = await generate_llm_response(system_prompt, user_prompt)

        return {
            "ok": True,
            "response": response,
            "model": settings.DEEPSEEK_MODEL
        }
    except Exception as e:
        return {"ok": False, "error": str(e)}

@router.get("/whoami")
def whoami(user=Depends(get_current_user)):
    return user