import re
import json
import logging
from typing import List, Dict, Any, Optional

from fastapi import HTTPException

from app.core.supabase import supabase_admin
from app.services.llm_service import generate_llm_response, generate_llm_json

logger = logging.getLogger("noctual.flashcards")

MEDICAL_HINTS = {
    "disease", "condition", "symptom", "sign", "symptoms", "signs",
    "treatment", "management", "therapy", "diagnosis", "diagnostic",
    "cause", "causes", "complication", "complications", "risk", "risks",
    "indication", "indications", "contraindication", "presentation",
    "features", "clinical", "patient", "patients", "hyperkalaemia",
    "hypokalaemia", "hyponatraemia", "hypernatraemia", "potassium",
    "sodium", "electrolyte", "arrhythmia", "arrhythmias", "intravenous",
    "oral", "supplement", "monitoring", "severe", "mild", "moderate",
    "acute", "chronic", "infection", "pain", "fever", "blood", "urine",
    "cardiac", "respiratory", "renal", "hepatic", "dialysis", "oedema",
    "haemorrhage", "failure", "replacement", "fluid", "balance",
    "pharmacology", "dosage", "adverse", "prognosis", "epidemiology",
    "pathophysiology", "aetiology", "etiology", "examination",
    "investigation", "radiology", "surgery", "prophylaxis",
    "vaccination", "screening", "prevention",
}

NOISE_PATTERNS = [
    r"\babout the cover\b", r"\bportrait of\b", r"\bmuseum\b",
    r"\bcanvas\b", r"\bgift of\b", r"\baccession number\b",
    r"\bphiladelphia\b", r"\bpennsylvania academy\b", r"\bedition\b",
    r"\bcontents\b", r"\bindex\b", r"\btable of contents\b",
    r"\bcopyright\b", r"\bisbn\b", r"\bpublished by\b",
    r"\bprinted in\b", r"\ball rights reserved\b",
    r"\bwww\.", r"\bhttp\b",
]

FLASHCARD_SYSTEM_PROMPT = """You are a senior medical educator creating high-quality study flashcards for medical students preparing for exams (USMLE, PLAB, MBBS, etc.).

## Core Rules
- Generate ONE flashcard from the provided medical note.
- The question MUST sound like a real exam question — clear, specific, and testable.
- The answer MUST be factually accurate and derived ONLY from the provided note.
- Keep answers concise: 1–3 sentences maximum. No bullet points.
- Use standard medical terminology.
- If the note is too short, trivial, or non-medical, return {"skip": true}.
- NEVER invent information not present in the note.
- NEVER include patient-identifying information.

## Question Style Guidelines
- "What is the first-line treatment for..." (management questions)
- "Which of the following is a characteristic feature of..." (diagnosis questions)
- "What is the most common cause of..." (epidemiology questions)
- "Define..." (definition questions)
- "What are the clinical features of..." (presentation questions)
- "What investigation is used to diagnose..." (investigation questions)

## Answer Style Guidelines
- Begin with the core fact directly.
- Use "It is..." or "The..." sentence structure.
- Include key numbers/doses/percentages if present in the note.
- One to three sentences only.

Return ONLY valid JSON:
{"question": "exact question text", "answer": "exact answer text"}
or {"skip": true}

Do NOT include explanations, markdown, or extra text."""


def clean_text(text: str) -> str:
    if not text:
        return ""
    text = text.replace("\r", " ").replace("\n", " ").replace("\t", " ")
    text = re.sub(r"([A-Za-z])-\s+([A-Za-z])", r"\1\2", text)
    text = re.sub(r"([a-z])([A-Z])", r"\1. \2", text)
    text = re.sub(r"Char\s*Count\s*=\s*\d+", " ", text, flags=re.IGNORECASE)
    text = re.sub(r"\bP\d+\s*:\s*", " ", text)
    text = re.sub(r"\s+([,.;:!?])", r"\1", text)
    text = re.sub(r"\s{2,}", " ", text)
    return text.strip()


def split_sentences(text: str) -> List[str]:
    text = clean_text(text)
    if not text:
        return []
    parts = re.split(r"(?<=[.!?])\s+", text)
    return [p.strip() for p in parts if p.strip()]


def normalize_for_compare(text: str) -> str:
    return re.sub(r"\s+", " ", text.strip().lower())


def is_noisy_sentence(sentence: str) -> bool:
    s = normalize_for_compare(sentence)
    if len(s) < 30 or len(s.split()) < 5:
        return True
    for pattern in NOISE_PATTERNS:
        if re.search(pattern, s, flags=re.IGNORECASE):
            return True
    digit_count = sum(ch.isdigit() for ch in s)
    if digit_count >= 8:
        return True
    if "oil on canvas" in s or "museum of art" in s:
        return True
    return False


def has_medical_signal(sentence: str) -> bool:
    words = set(re.findall(r"[a-zA-Z']+", sentence.lower()))
    return len(words.intersection(MEDICAL_HINTS)) > 0


def looks_malformed(sentence: str) -> bool:
    s = clean_text(sentence)
    if len(s) > 260:
        return True
    if s.count(",") > 4 or s.count(";") > 2:
        return True
    if re.search(r"\b(clinical features clinical|management management|treatment treatment)\b", s.lower()):
        return True
    capital_tokens = re.findall(r"\b[A-Z][a-zA-Z]{2,}\b", s)
    if len(capital_tokens) >= 8 and len(s.split()) < 20:
        return True
    return False


def sentence_score(sentence: str) -> int:
    s = sentence.lower()
    score = 0
    score += sum(2 for hint in MEDICAL_HINTS if hint in s)
    if "defined as" in s:
        score += 8
    if " is " in s:
        score += 5
    if " are " in s:
        score += 3
    if "caused by" in s or "causes of" in s or "cause of" in s:
        score += 7
    if "symptoms of" in s or "signs of" in s or "clinical features" in s:
        score += 7
    if "treated with" in s or "treatment of" in s or "management of" in s:
        score += 8
    if "requires" in s:
        score += 3
    if "complication" in s:
        score += 5
    if "indication" in s:
        score += 4
    if "diagnosis" in s or "diagnosed" in s:
        score += 6
    if "prognosis" in s:
        score += 5
    if "first-line" in s or "first line" in s:
        score += 10
    if "gold standard" in s:
        score += 10
    if re.search(r"\bchapter\b|\bedition\b|\bcopyright\b", s):
        score -= 10
    word_count = len(s.split())
    if 8 <= word_count <= 24:
        score += 4
    elif word_count > 30:
        score -= 4
    return score


async def generate_flashcard_llm(cleaned_note: str) -> Optional[Dict[str, str]]:
    """
    Generate a single high-quality medical flashcard using DeepSeek.

    Returns {"question": str, "answer": str} or None if the note
    should be skipped (non-medical, too short, etc.).
    """
    if not cleaned_note or len(cleaned_note) < 40:
        return None

    user_prompt = f"Medical note:\n\n{cleaned_note}"

    try:
        result = await generate_llm_json(
            system_prompt=FLASHCARD_SYSTEM_PROMPT,
            user_prompt=user_prompt,
            temperature=0.1,
            fallback_parse=True,
        )
    except HTTPException:
        logger.warning("LLM flashcard generation failed, skipping sentence")
        return None
    except Exception as e:
        logger.warning("LLM flashcard generation failed: %s", str(e)[:200])
        return None

    if not isinstance(result, dict):
        return None

    if result.get("skip"):
        return None

    question = (result.get("question") or "").strip()
    answer = (result.get("answer") or "").strip()

    if not question or not answer:
        return None

    if len(question) < 10 or len(answer) < 5:
        return None

    if len(answer.split()) > 80:
        return None

    question_lower = question.lower()
    generic_questions = {
        "what does the note say",
        "what is this about",
        "what is the content",
        "what does this mean",
        "tell me about",
    }
    if any(gq in question_lower for gq in generic_questions):
        return None

    return {"question": question, "answer": answer}


def deduplicate_flashcards(cards: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    seen = set()
    unique = []
    for card in cards:
        key = (
            normalize_for_compare(card["question"]),
            normalize_for_compare(card["answer"]),
        )
        if key not in seen:
            seen.add(key)
            unique.append(card)
    return unique


async def generate_flashcards_from_document(
    user_id: str,
    document_id: str,
    max_cards: int = 10,
) -> Dict[str, Any]:
    sb = supabase_admin()

    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid user")
    if not document_id:
        raise HTTPException(status_code=400, detail="document_id is required")

    try:
        res = (
            sb.table("doc_chunks")
            .select("chunk_index, chunk_text")
            .eq("owner_id", user_id)
            .eq("document_id", document_id)
            .order("chunk_index")
            .execute()
        )
        chunks = res.data or []
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load chunks: {e}")

    if not chunks:
        return {"document_id": document_id, "flashcards": [], "total": 0}

    candidate_sentences: List[Dict[str, Any]] = []

    for chunk in chunks:
        chunk_index = chunk["chunk_index"]
        chunk_text = clean_text(chunk["chunk_text"])

        sentences = split_sentences(chunk_text)
        if not sentences:
            continue

        for sentence in sentences:
            if is_noisy_sentence(sentence):
                continue
            if looks_malformed(sentence):
                continue
            if not has_medical_signal(sentence):
                continue

            score = sentence_score(sentence)
            if score < 5:
                continue

            candidate_sentences.append({
                "sentence": sentence,
                "chunk_index": chunk_index,
                "_score": score,
            })

    if not candidate_sentences:
        return {"document_id": document_id, "flashcards": [], "total": 0}

    candidate_sentences.sort(key=lambda x: x["_score"], reverse=True)

    final_cards = []
    generated_count = 0

    for candidate in candidate_sentences[: max_cards * 2]:
        if generated_count >= max_cards:
            break

        card = await generate_flashcard_llm(candidate["sentence"])
        if card:
            final_cards.append({
                "question": card["question"],
                "answer": card["answer"],
                "chunk_index": candidate["chunk_index"],
            })
            generated_count += 1

    if not final_cards:
        return {"document_id": document_id, "flashcards": [], "total": 0}

    if final_cards:
        try:
            sb.table("flashcard_sessions").insert({
                "owner_id": user_id,
                "document_id": document_id,
                "cards_generated": len(final_cards),
            }).execute()
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to log flashcard session: {e}",
            )

    return {
        "document_id": document_id,
        "flashcards": final_cards,
        "total": len(final_cards),
    }
