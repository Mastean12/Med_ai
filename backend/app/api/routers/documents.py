from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from app.core.auth import get_current_user
from app.core.supabase import supabase_admin
from app.services.documents_service import upload_document_to_supabase
from app.utils.text_extract import get_supported_extensions

router = APIRouter()

ALLOWED_EXTENSIONS = get_supported_extensions()


@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    user=Depends(get_current_user),
):
    import os
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type. Allowed: {', '.join(ALLOWED_EXTENSIONS)}",
        )

    return await upload_document_to_supabase(user=user, file=file)


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