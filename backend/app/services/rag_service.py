from fastapi import HTTPException
from typing import List, Dict, Any, Optional
import re

from app.core.supabase import supabase_admin
from app.services.embeddings_service import embed_text


def clean_chunk_text(text: str) -> str:
    """
    Clean noisy PDF/OCR text before sentence extraction.
    """
    if not text:
        return ""

    # normalize line breaks and tabs
    text = text.replace("\r", " ").replace("\n", " ").replace("\t", " ")

    # fix broken hyphenation across wrapped words:
    # recom- mended -> recommended
    # pa- tients -> patients
    text = re.sub(r"([A-Za-z])-\s+([A-Za-z])", r"\1\2", text)

    # remove obvious page markers like P1:, P2:, etc.
    text = re.sub(r"\bP\d+\s*:\s*", " ", text)

    # remove "Char Count= 0" and similar noise
    text = re.sub(r"Char\s*Count\s*=\s*\d+", " ", text, flags=re.IGNORECASE)

    # remove timestamps / scan metadata patterns like:
    # Kendall May 12, 2005 17:17
    text = re.sub(
        r"\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},\s+\d{4}\s+\d{1,2}:\d{2}\b",
        " ",
        text,
        flags=re.IGNORECASE,
    )

    # remove repeated code-like document labels if present
    text = re.sub(r"\b[A-Z]{2,}[A-Z0-9\-]{4,}\b", " ", text)

    # remove isolated page numbers / header fragments at start like "9 The highest..."
    text = re.sub(r"^\s*\d+\s+", "", text)

    # normalize weird spacing around punctuation
    text = re.sub(r"\s+([,.;:!?])", r"\1", text)

    # collapse repeated spaces
    text = re.sub(r"\s{2,}", " ", text)

    return text.strip()


def split_sentences(text: str) -> List[str]:
    """
    Split cleaned text into sentences.
    """
    text = clean_chunk_text(text)
    if not text:
        return []

    sentences = re.split(r"(?<=[.!?])\s+", text)
    return [s.strip() for s in sentences if s.strip()]


def keyword_score(question: str, sentence: str) -> int:
    """
    Basic lexical overlap score between question and sentence.
    """
    q_words = set(re.findall(r"[a-zA-Z0-9']+", question.lower()))
    s_words = set(re.findall(r"[a-zA-Z0-9']+", sentence.lower()))

    # ignore short words
    q_words = {w for w in q_words if len(w) > 2}
    s_words = {w for w in s_words if len(w) > 2}

    overlap = q_words.intersection(s_words)
    return len(overlap)


def extract_relevant_sentences(
    question: str,
    chunk_text: str,
    max_sentences: int = 2,
) -> List[str]:
    """
    Extract the most relevant sentences from a chunk.
    Falls back to first sentences if no overlap is found.
    """
    sentences = split_sentences(chunk_text)
    if not sentences:
        return []

    scored = sorted(
        sentences,
        key=lambda s: keyword_score(question, s),
        reverse=True,
    )

    best = [s for s in scored if keyword_score(question, s) > 0][:max_sentences]

    if not best:
        best = sentences[:max_sentences]

    return best


def deduplicate_sentences(sentences: List[str]) -> List[str]:
    """
    Remove duplicate or near-identical sentences while preserving order.
    """
    seen = set()
    unique = []

    for s in sentences:
        normalized = re.sub(r"\s+", " ", s.strip().lower())
        if normalized and normalized not in seen:
            seen.add(normalized)
            unique.append(s.strip())

    return unique


def clean_answer_sentence(sentence: str) -> str:
    """
    Final cleanup for answer sentences.
    """
    sentence = sentence.strip()

    # remove leftover leading numbering fragments
    sentence = re.sub(r"^\d+\s+", "", sentence)

    # collapse spaces
    sentence = re.sub(r"\s{2,}", " ", sentence)

    return sentence.strip()


def build_answer(question: str, matches: List[Dict[str, Any]]) -> str:
    """
    Build a concise and cleaner answer from top retrieved chunks.
    """
    candidate_sentences: List[str] = []

    for match in matches[:3]:
        chunk_text = match.get("chunk_text", "")
        extracted = extract_relevant_sentences(question, chunk_text, max_sentences=2)
        candidate_sentences.extend(extracted)

    candidate_sentences = [clean_answer_sentence(s) for s in candidate_sentences]
    candidate_sentences = deduplicate_sentences(candidate_sentences)

    if not candidate_sentences:
        return "I found relevant notes, but I could not extract a clear answer. Try asking a more specific question."

    # Keep only the most useful few sentences
    answer_sentences = candidate_sentences[:3]

    return " ".join(answer_sentences)


async def answer_from_notes(
    user_id: str,
    question: str,
    document_id: Optional[str] = None,
    top_k: int = 5,
) -> Dict[str, Any]:
    sb = supabase_admin()

    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid user")

    if not document_id:
        raise HTTPException(
            status_code=400,
            detail="document_id is required for vector similarity search.",
        )

    # 1) Embed question
    try:
        query_vec = embed_text(question)
        if hasattr(query_vec, "tolist"):
            query_vec = query_vec.tolist()
        if not isinstance(query_vec, list) or not query_vec:
            raise ValueError("embed_text() returned an empty or invalid vector")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to embed question: {e}")

    # 2) Vector search
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

    # 3) Filter low-quality matches
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

    # 4) Build answer
    answer = build_answer(question, matches)

    # 5) Build cleaner sources
    sources = []
    for m in matches[:3]:
        cleaned_chunk = clean_chunk_text(m.get("chunk_text", ""))
        sources.append(
            {
                "chunk_index": m.get("chunk_index"),
                "preview": cleaned_chunk[:220] + ("..." if len(cleaned_chunk) > 220 else ""),
                "similarity": m.get("similarity"),
            }
        )

    meta = {
        "document_id": document_id,
        "top_k": top_k,
        "matches_found": len(matches),
        "llm_used": False,
        "retrieval": "pgvector",
        "similarities": [m.get("similarity") for m in matches],
    }

    return {
        "answer": answer,
        "sources": sources,
        "meta": meta,
    }