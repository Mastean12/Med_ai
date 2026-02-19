from app.core.supabase import supabase_admin

def answer_from_notes(user_id: str, document_id: str, question: str):
    sb = supabase_admin()

    # VERY SIMPLE MVP retrieval: get top chunks (later replace with vector search)
    chunks = sb.table("doc_chunks") \
        .select("id,chunk_text") \
        .eq("owner_id", user_id) \
        .eq("document_id", document_id) \
        .limit(6) \
        .execute().data

    # MVP answer (replace with actual LLM call later)
    # For now we return a structured response showing we used notes.
    citations = [c["id"] for c in chunks]
    answer = (
        "MVP response (grounded in your uploaded notes):\n\n"
        + "\n\n---\n\n".join([c["chunk_text"][:400] for c in chunks])
        + "\n\n(Next step: connect LLM to generate a proper explanation based on these chunks.)"
    )

    return {"answer": answer, "citations": citations}
