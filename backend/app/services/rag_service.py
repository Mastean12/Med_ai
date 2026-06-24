"""
Hybrid RAG + LLM Answer Pipeline.

Confidence levels:
- HIGH (≥0.35): Grounded in notes, show sources
- MEDIUM (≥0.20): Hybrid — notes + general knowledge
- LOW (<0.20): General AI medical education response

Never returns empty/failure messages. Always helps the learner.
"""

import re, logging, statistics
from typing import Dict, Any, List, Optional

from fastapi import HTTPException

from app.core.supabase import supabase_admin
from app.services.embeddings_service import embed_text
from app.services.llm_service import generate_llm_response, generate_llm_json
from app.services.response_formatter import format_response

logger = logging.getLogger("noctual.rag")

GROUNDED_SYSTEM_PROMPT = """You are a medical tutor helping a student. Answer based on their uploaded notes.

## Rules
- Use ONLY the provided context from the student's notes.
- Start with ## Quick Summary — one key takeaway sentence.
- Then use ## Simple Explanation, ## Key Concepts, ## Quick Check sections.
- Never invent information not in the context.
- Use standard medical terminology.

## Context (student's notes)
{context}

Answer the student's question using these notes."""

HYBRID_SYSTEM_PROMPT = """You are a medical tutor helping a student. Some relevant notes were found, but they may not fully answer the question.

## Rules
- Start with what WAS found in the student's notes.
- Then supplement with general medical knowledge where notes are incomplete.
- Clearly indicate which parts come from notes vs general knowledge.
- Structure with ## From Your Notes, ## General Knowledge, ## Quick Check sections.
- Be honest about gaps — never pretend notes contain information they don't.

## Retrieved Notes (partial match)
{context}

Answer the student's question. If notes are insufficient, supplement responsibly."""

FALLBACK_SYSTEM_PROMPT = """You are a medical tutor. No specific notes were found for this question, so provide a general medical education response.

## Rules
- Provide a helpful, accurate medical explanation.
- Start with ## Quick Summary — one-sentence key takeaway.
- Then use ## Simple Explanation, ## Key Concepts, ## Clinical Relevance, ## Quick Check sections.
- Note that this is general medical knowledge, not from the student's specific notes.
- End with ## Related Questions — 3-5 suggested follow-up questions as bullet points.

Answer the student's medical question educationally."""


def clean_chunk_text(text: str) -> str:
    if not text: return ""
    text = text.replace("\r"," ").replace("\n"," ").replace("\t"," ")
    text = re.sub(r"([A-Za-z])-\s+([A-Za-z])", r"\1\2", text)
    text = re.sub(r"\bP\d+\s*:\s*", " ", text)
    text = re.sub(r"Char\s*Count\s*=\s*\d+", " ", text, flags=re.IGNORECASE)
    text = re.sub(r"\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},\s+\d{4}\s+\d{1,2}:\d{2}\b"," ",text,flags=re.IGNORECASE)
    text = re.sub(r"\b[A-Z]{2,}[A-Z0-9\-]{4,}\b"," ",text)
    text = re.sub(r"^\s*\d+\s+","",text)
    text = re.sub(r"\s+([,.;:!?])",r"\1",text)
    text = re.sub(r"\s{2,}"," ",text)
    return text.strip()


def compute_confidence(matches: List[Dict[str, Any]]) -> tuple[str, float]:
    """Determine confidence level from match similarities."""
    if not matches: return "LOW", 0.0
    sims = [m.get("similarity", 0) for m in matches if m.get("similarity") is not None]
    if not sims: return "LOW", 0.0
    avg = statistics.mean(sims)
    if avg >= 0.35: return "HIGH", round(avg, 3)
    if avg >= 0.20: return "MEDIUM", round(avg, 3)
    return "LOW", round(avg, 3)


async def answer_from_notes(
    user_id: str, question: str,
    document_id: Optional[str] = None, top_k: int = 5, use_llm: bool = True,
) -> Dict[str, Any]:
    sb = supabase_admin()

    if not user_id: raise HTTPException(status_code=401, detail="Invalid user")
    if not document_id: raise HTTPException(status_code=400, detail="document_id is required")

    # 1. Embed + vector search
    try:
        query_vec = embed_text(question)
        if hasattr(query_vec,"tolist"): query_vec = query_vec.tolist()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Embed failed: {e}")

    matches = []
    try:
        res = sb.rpc("match_doc_chunks", {"p_owner_id":user_id,"p_document_id":document_id,"p_match_count":top_k,"p_query_embedding":query_vec}).execute()
        matches = res.data or []
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Vector search failed: {e}")

    # Filter very weak matches
    matches = [m for m in matches if m.get("similarity") is None or m.get("similarity",0) >= 0.15]

    confidence_level, avg_sim = compute_confidence(matches)

    # 2. Build context from matches
    context_parts = []
    for i, m in enumerate(matches[:5]):
        cleaned = clean_chunk_text(m.get("chunk_text",""))
        if cleaned: context_parts.append(cleaned)
    context = "\n\n".join(context_parts) if context_parts else ""

    # 3. Choose prompt + generate
    if confidence_level == "HIGH" and context:
        system_prompt = GROUNDED_SYSTEM_PROMPT.format(context=context)
        response_type = "grounded"
        response_badge = "From Your Notes"
    elif confidence_level == "MEDIUM" and context:
        system_prompt = HYBRID_SYSTEM_PROMPT.format(context=context)
        response_type = "hybrid"
        response_badge = "Hybrid Explanation"
    else:
        system_prompt = FALLBACK_SYSTEM_PROMPT
        response_type = "general"
        response_badge = "AI Medical Knowledge"

    answer = None
    related_questions: List[str] = []

    if use_llm:
        try:
            raw = await generate_llm_response(system_prompt=system_prompt, user_prompt=question, temperature=0.3)
            parts = raw.split("## Related Questions")
            answer = parts[0].strip()
            if len(parts) > 1:
                related = parts[1].strip()
                related_questions = [q.strip("- ").strip() for q in related.split("\n") if q.strip().startswith("-")]
        except Exception:
            answer = None

    if not answer:
        if context:
            answer = "Based on your notes: " + " ".join(context_parts[:2])[:800]
        else:
            answer = "I can help with that. Try uploading relevant medical notes for a more grounded answer, or rephrase your question."

    sources = []
    for m in matches[:3]:
        cleaned = clean_chunk_text(m.get("chunk_text",""))
        sources.append({
            "chunk_index": m.get("chunk_index"),
            "preview": cleaned[:200] + ("..." if len(cleaned) > 200 else ""),
            "similarity": m.get("similarity"),
        })

    # Format the answer into structured sections
    formatted = format_response(answer)

    return {
        "answer": answer,
        "response_type": response_type,
        "response_badge": response_badge,
        "confidence": avg_sim,
        "confidence_level": confidence_level,
        "sources": sources,
        "related_questions": related_questions,
        "formatted_sections": formatted.get("sections", []),
        "meta": {
            "document_id": document_id, "top_k": top_k,
            "matches_found": len(matches), "llm_used": use_llm,
            "retrieval": "pgvector", "avg_similarity": avg_sim,
        },
    }
