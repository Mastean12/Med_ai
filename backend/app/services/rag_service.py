import re
import logging
from typing import List, Dict, Any, Optional

from fastapi import HTTPException

from app.core.supabase import supabase_admin
from app.services.embeddings_service import embed_text
from app.services.llm_service import generate_llm_response

logger = logging.getLogger("noctual.rag")

RAG_SYSTEM_PROMPT = """You are a professional medical tutor helping a student understand their study notes. Your answers must be grounded ONLY in the provided context.

## Core Rules
- Answer based SOLELY on the retrieved note excerpts provided below.
- If the notes don't contain enough information to answer, say so clearly.
- NEVER invent, extrapolate, or guess information not in the context.
- Use a conversational yet academic tone — think of a friendly professor.
- Structure your answer clearly but concisely (3–6 sentences ideal).
- Use standard medical terminology.
- Include key facts, numbers, or percentages when present in the notes.
- If multiple relevant facts exist, present them in logical order.

## Format
- Start with a direct answer to the question.
- Follow with supporting detail from the notes.
- End with a brief summary if helpful.

## Safety
- This is for study/education purposes only.
- If the question asks for personal medical advice, respond: "I can only help with information from your study notes. For personal medical advice, consult a healthcare professional."

## Context (your study notes)
{context}

Now answer the student's question using only the information above."""


def clean_chunk_text(text: str) -> str:
    if not text:
        return ""
    text = text.replace("\r", " ").replace("\n", " ").replace("\t", " ")
    text = re.sub(r"([A-Za-z])-\s+([A-Za-z])", r"\1\2", text)
    text = re.sub(r"\bP\d+\s*:\s*", " ", text)
    text = re.sub(r"Char\s*Count\s*=\s*\d+", " ", text, flags=re.IGNORECASE)
    text = re.sub(
        r"\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},\s+\d{4}\s+\d{1,2}:\d{2}\b",
        " ", text, flags=re.IGNORECASE,
    )
    text = re.sub(r"\b[A-Z]{2,}[A-Z0-9\-]{4,}\b", " ", text)
    text = re.sub(r"^\s*\d+\s+", "", text)
    text = re.sub(r"\s+([,.;:!?])", r"\1", text)
    text = re.sub(r"\s{2,}", " ", text)
    return text.strip()


def split_sentences(text: str) -> List[str]:
    text = clean_chunk_text(text)
    if not text:
        return []
    sentences = re.split(r"(?<=[.!?])\s+", text)
    return [s.strip() for s in sentences if s.strip()]


def keyword_score(question: str, sentence: str) -> int:
    q_words = set(re.findall(r"[a-zA-Z0-9']+", question.lower()))
    s_words = set(re.findall(r"[a-zA-Z0-9']+", sentence.lower()))
    q_words = {w for w in q_words if len(w) > 2}
    s_words = {w for w in s_words if len(w) > 2}
    overlap = q_words.intersection(s_words)
    return len(overlap)


def extract_relevant_sentences(
    question: str,
    chunk_text: str,
    max_sentences: int = 2,
) -> List[str]:
    sentences = split_sentences(chunk_text)
    if not sentences:
        return []
    scored = sorted(
        sentences, key=lambda s: keyword_score(question, s), reverse=True
    )
    best = [s for s in scored if keyword_score(question, s) > 0][:max_sentences]
    if not best:
        best = sentences[:max_sentences]
    return best


def deduplicate_sentences(sentences: List[str]) -> List[str]:
    seen = set()
    unique = []
    for s in sentences:
        normalized = re.sub(r"\s+", " ", s.strip().lower())
        if normalized and normalized not in seen:
            seen.add(normalized)
            unique.append(s.strip())
    return unique


def clean_answer_sentence(sentence: str) -> str:
    sentence = sentence.strip()
    sentence = re.sub(r"^\d+\s+", "", sentence)
    sentence = re.sub(r"\s{2,}", " ", sentence)
    return sentence.strip()


def build_answer_from_extraction(
    question: str, matches: List[Dict[str, Any]]
) -> str:
    """Rule-based answer construction — fallback when LLM is unavailable."""
    candidate_sentences: List[str] = []
    for match in matches[:3]:
        chunk_text = match.get("chunk_text", "")
        extracted = extract_relevant_sentences(question, chunk_text, max_sentences=2)
        candidate_sentences.extend(extracted)

    candidate_sentences = [clean_answer_sentence(s) for s in candidate_sentences]
    candidate_sentences = deduplicate_sentences(candidate_sentences)

    if not candidate_sentences:
        return (
            "I found relevant notes, but I could not extract a clear answer. "
            "Try asking a more specific question."
        )

    answer_sentences = candidate_sentences[:3]
    return " ".join(answer_sentences)


async def synthesize_answer_with_llm(
    question: str,
    matches: List[Dict[str, Any]],
) -> Optional[str]:
    """
    Use DeepSeek to synthesize a coherent answer from retrieved chunks.

    Returns the synthesized answer string, or None if LLM fails
    (caller should fall back to rule-based extraction).
    """
    if not matches:
        return None

    context_parts = []
    for i, m in enumerate(matches[:5]):
        cleaned = clean_chunk_text(m.get("chunk_text", ""))
        if cleaned:
            context_parts.append(f"[Chunk {m.get('chunk_index', i)}] {cleaned}")

    context = "\n\n".join(context_parts)

    if not context.strip():
        return None

    try:
        system_prompt = RAG_SYSTEM_PROMPT.format(context=context)
        response = await generate_llm_response(
            system_prompt=system_prompt,
            user_prompt=question,
            temperature=0.3,
        )
        return response.strip()
    except HTTPException:
        logger.warning("LLM synthesis failed, falling back to extraction")
        return None
    except Exception as e:
        logger.warning("LLM synthesis failed: %s", str(e)[:200])
        return None


async def answer_from_notes(
    user_id: str,
    question: str,
    document_id: Optional[str] = None,
    top_k: int = 5,
    use_llm: bool = True,
) -> Dict[str, Any]:
    """
    Answer a student question using RAG over their uploaded notes.

    Architecture:
    1. Embed the question
    2. Vector search for relevant chunks
    3. Synthesize answer (LLM if available, otherwise extraction)
    4. Return answer + sources + metadata

    Args:
        user_id: The authenticated user's ID
        question: The natural language question
        document_id: Which document to search (required)
        top_k: Number of chunks to retrieve
        use_llm: Whether to use LLM for synthesis (falls back gracefully)

    Returns:
        Dict with answer, sources, and meta
    """
    sb = supabase_admin()

    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid user")

    if not document_id:
        raise HTTPException(
            status_code=400,
            detail="document_id is required for vector similarity search.",
        )

    try:
        query_vec = embed_text(question)
        if hasattr(query_vec, "tolist"):
            query_vec = query_vec.tolist()
        if not isinstance(query_vec, list) or not query_vec:
            raise ValueError("embed_text() returned an empty or invalid vector")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to embed question: {e}")

    try:
        res = sb.rpc(
            "match_doc_chunks",
            {
                "p_owner_id": user_id,
                "p_document_id": document_id,
                "p_match_count": top_k,
                "p_query_embedding": query_vec,
            },
        ).execute()
        matches = res.data or []
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Vector search RPC failed: {e}")

    SIM_THRESHOLD = 0.25
    matches = [
        m for m in matches
        if (m.get("similarity") is None or m.get("similarity", 0) >= SIM_THRESHOLD)
    ]

    if not matches:
        return {
            "answer": "No strong matches found in your notes. Try rephrasing or ask a more specific question.",
            "sources": [],
            "meta": {
                "document_id": document_id,
                "top_k": top_k,
                "matches_found": 0,
                "llm_used": False,
            },
        }

    llm_used = False
    answer: Optional[str] = None

    if use_llm:
        answer = await synthesize_answer_with_llm(question, matches)
        llm_used = answer is not None

    if answer is None:
        answer = build_answer_from_extraction(question, matches)

    sources = []
    for m in matches[:3]:
        cleaned_chunk = clean_chunk_text(m.get("chunk_text", ""))
        sources.append({
            "chunk_index": m.get("chunk_index"),
            "preview": cleaned_chunk[:220] + ("..." if len(cleaned_chunk) > 220 else ""),
            "similarity": m.get("similarity"),
        })

    meta = {
        "document_id": document_id,
        "top_k": top_k,
        "matches_found": len(matches),
        "llm_used": llm_used,
        "retrieval": "pgvector",
        "similarities": [m.get("similarity") for m in matches],
    }

    return {
        "answer": answer,
        "sources": sources,
        "meta": meta,
    }
