from fastapi import UploadFile, HTTPException
from app.core.supabase import supabase_admin
from app.core.config import ENV

BUCKET_NAME = "notes"


async def upload_pdf_to_supabase(user: dict, file: UploadFile):
    """Upload PDF, ensuring the owner user row exists in DB (helpful in dev).

    Accepts `user` dict with `id` and `email` keys.
    """
    sb = supabase_admin()

    user_id = user.get("id")
    user_email = user.get("email")

    # 1) Create DB row first (status=uploaded)
    try:
        insert_res = sb.table("documents").insert({
            "owner_id": user_id,
            "title": file.filename,
            "status": "uploaded",
        }).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create document: {e}")

    if not insert_res.data:
        raise HTTPException(status_code=500, detail="Failed to create document record")

    document_id = insert_res.data[0]["id"]

    # 2) Upload file to Supabase Storage
    content = await file.read()

    storage_path = f"{user_id}/{document_id}/{file.filename}"
    try:
        upload_res = sb.storage.from_(BUCKET_NAME).upload(
            storage_path,
            content,
            {"content-type": "application/pdf"}
        )
    except Exception as e:
        # mark as failed and re-raise
        sb.table("documents").update({"status": "failed"}).eq("id", document_id).execute()
        raise HTTPException(status_code=500, detail=f"Storage upload failed: {e}")

    # 3) Update document with storage path
    sb.table("documents").update({
        "storage_path": storage_path,
        "status": "stored"
    }).eq("id", document_id).execute()

    return {"document_id": document_id, "status": "stored", "storage_path": storage_path}
