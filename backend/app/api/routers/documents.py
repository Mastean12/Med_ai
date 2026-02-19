from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from app.core.auth import get_current_user
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
