from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from app.core.auth import get_current_user
from app.core.supabase import supabase_admin
from app.services.documents_service import upload_pdf_to_supabase

router = APIRouter()

@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    user=Depends(get_current_user),
):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")

    return await upload_pdf_to_supabase(user=user, file=file)

# ✅ NEW: list documents for the logged-in user
@router.get("")
def list_documents(user=Depends(get_current_user)):
    sb = supabase_admin()
    user_id = user.get("id")

    res = (
        sb.table("documents")
        .select("id,title,status,created_at,storage_path")
        .eq("owner_id", user_id)
        .order("created_at", desc=True)
        .limit(50)
        .execute()
    )

    return {"documents": res.data or []}