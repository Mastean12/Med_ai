from fastapi import UploadFile, HTTPException
import re

from app.core.supabase import supabase_admin
from app.utils.pdf_extract import extract_text_from_pdf
from app.utils.text_chunker import chunk_text
from app.services.embeddings_service import embed_text

BUCKET_NAME = "notes"


def clean_extracted_text(text: str) -> str:
    """
    Clean raw PDF-extracted text before chunking and embedding.
    This improves retrieval quality and answer readability.
    """
    if not text:
        return ""

    # normalize whitespace characters
    text = text.replace("\r", " ").replace("\n", " ").replace("\t", " ")

    # fix wrapped hyphenated words: recom- mended -> recommended
    text = re.sub(r"([A-Za-z])-\s+([A-Za-z])", r"\1\2", text)

    # remove page markers like P1:, P2:
    text = re.sub(r"\bP\d+\s*:\s*", " ", text)

    # remove OCR noise like Char Count= 0
    text = re.sub(r"Char\s*Count\s*=\s*\d+", " ", text, flags=re.IGNORECASE)

    # remove timestamps like May 12, 2005 17:17
    text = re.sub(
        r"\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},\s+\d{4}\s+\d{1,2}:\d{2}\b",
        " ",
        text,
        flags=re.IGNORECASE,
    )

    # remove long code-like OCR fragments
    text = re.sub(r"\b[A-Z]{2,}[A-Z0-9\-]{4,}\b", " ", text)

    # remove repeated page-start numbers like "9 The highest..."
    text = re.sub(r"\b\d+\s+(?=[A-Z])", " ", text)

    # normalize spaces around punctuation
    text = re.sub(r"\s+([,.;:!?])", r"\1", text)

    # collapse multiple spaces
    text = re.sub(r"\s{2,}", " ", text)

    return text.strip()


async def upload_pdf_to_supabase(user: dict, file: UploadFile):
    sb = supabase_admin()

    user_id = user.get("id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid user: missing id")

    # 1) Create document row first
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

    # 2) Read content once + upload to Storage
    try:
        content = await file.read()
        if not content:
            raise HTTPException(status_code=400, detail="Uploaded file is empty")

        storage_path = f"{user_id}/{document_id}/{file.filename}"

        sb.storage.from_(BUCKET_NAME).upload(
            storage_path,
            content,
            {"content-type": "application/pdf"}
        )

    except HTTPException:
        sb.table("documents").update({"status": "failed"}).eq("id", document_id).execute()
        raise
    except Exception as e:
        sb.table("documents").update({"status": "failed"}).eq("id", document_id).execute()
        raise HTTPException(status_code=500, detail=f"Storage upload failed: {e}")

    # 3) Update document after storage is successful
    sb.table("documents").update({
        "storage_path": storage_path,
        "status": "stored"
    }).eq("id", document_id).execute()

    # 4) Extract text + clean + chunk + insert into doc_chunks
    try:
        raw_text = extract_text_from_pdf(content)
        cleaned_text = clean_extracted_text(raw_text)

        if not cleaned_text:
            raise HTTPException(status_code=400, detail="No readable text could be extracted from this PDF")

        chunks = chunk_text(cleaned_text, chunk_size=1000, overlap=200)

        # clear existing chunks for this document to avoid duplicates
        sb.table("doc_chunks").delete().eq("document_id", document_id).execute()

        if chunks:
            rows = []
            for i, c in enumerate(chunks):
                cleaned_chunk = c.strip()
                if not cleaned_chunk:
                    continue

                rows.append({
                    "owner_id": user_id,
                    "document_id": document_id,
                    "chunk_index": i,
                    "chunk_text": cleaned_chunk,
                    "embedding": embed_text(cleaned_chunk),
                })

            if rows:
                sb.table("doc_chunks").insert(rows).execute()

        sb.table("documents").update({
            "status": "chunked"
        }).eq("id", document_id).execute()

    except Exception as e:
        sb.table("documents").update({"status": "processing_failed"}).eq("id", document_id).execute()
        raise HTTPException(status_code=500, detail=f"Chunking failed: {e}")

    return {
        "document_id": document_id,
        "status": "chunked",
        "storage_path": storage_path,
        "chunks_created": len(chunks) if chunks else 0
    }