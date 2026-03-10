import re
from typing import List, Dict, Any, Optional
from fastapi import HTTPException

from app.core.supabase import supabase_admin


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
    "cardiac", "respiratory", "renal", "hepatic", "management",
    "dialysis", "oedema", "haemorrhage", "failure", "replacement",
    "fluid", "balance", "clinical"
}

NOISE_PATTERNS = [
    r"\babout the cover\b",
    r"\bportrait of\b",
    r"\bmuseum\b",
    r"\bcanvas\b",
    r"\bgift of\b",
    r"\baccession number\b",
    r"\bphiladelphia\b",
    r"\bpennsylvania academy\b",
    r"\bedition\b",
    r"\bcontents\b",
    r"\bindex\b",
    r"\btable of contents\b",
    r"\bcopyright\b",
    r"\bisbn\b",
    r"\bpublished by\b",
    r"\bprinted in\b",
    r"\ball rights reserved\b",
    r"\bwww\.",
    r"\bhttp\b",
]

STOP_TOPIC_WORDS = {
    "the", "a", "an", "this", "that", "these", "those", "clinical",
    "features", "feature", "management", "treatment", "causes",
    "cause", "symptoms", "symptom", "signs", "sign", "patients",
    "patient", "when", "with", "without", "and", "or", "of", "in", "on"
}


def clean_text(text: str) -> str:
    if not text:
        return ""

    text = text.replace("\r", " ").replace("\n", " ").replace("\t", " ")

    # fix wrapped hyphenation
    text = re.sub(r"([A-Za-z])-\s+([A-Za-z])", r"\1\2", text)

    # split accidental stuck lowercase-uppercase boundaries
    text = re.sub(r"([a-z])([A-Z])", r"\1. \2", text)

    # remove obvious OCR noise
    text = re.sub(r"Char\s*Count\s*=\s*\d+", " ", text, flags=re.IGNORECASE)
    text = re.sub(r"\bP\d+\s*:\s*", " ", text)

    # collapse spaces
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

    if len(s) < 30:
        return True

    if len(s.split()) < 5:
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

    # too long and likely merged
    if len(s) > 260:
        return True

    # too many commas/semicolons often means multiple merged ideas
    if s.count(",") > 4 or s.count(";") > 2:
        return True

    # repeated weird sentence starts
    if re.search(r"\b(clinical features clinical|management management|treatment treatment)\b", s.lower()):
        return True

    # reject if too many capitalized tokens in strange sequence
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

    if re.search(r"\bchapter\b|\bedition\b|\bcopyright\b", s):
        score -= 10

    # prefer moderate length
    word_count = len(s.split())
    if 8 <= word_count <= 24:
        score += 4
    elif word_count > 30:
        score -= 4

    return score


def shorten_answer(sentence: str, max_words: int = 28) -> str:
    s = clean_text(sentence)
    words = s.split()

    if len(words) <= max_words:
        return s

    shortened = " ".join(words[:max_words]).rstrip(" ,;:")
    return shortened + "..."


def extract_subject_after_phrase(sentence: str, phrase: str) -> Optional[str]:
    pattern = rf"{phrase}\s+([A-Za-z][A-Za-z0-9\- ]{{2,60}})"
    m = re.search(pattern, sentence, flags=re.IGNORECASE)
    if not m:
        return None

    subject = m.group(1).strip(" ,.;:")
    subject_words = [w for w in subject.split()[:6] if w.lower() not in STOP_TOPIC_WORDS]
    if not subject_words:
        return None

    return " ".join(subject_words)


def extract_topic(sentence: str) -> str:
    s = clean_text(sentence)

    # strongest topic patterns first
    patterns = [
        r"clinical features of ([A-Za-z][A-Za-z0-9\- ]{2,60})",
        r"management of ([A-Za-z][A-Za-z0-9\- ]{2,60})",
        r"treatment of ([A-Za-z][A-Za-z0-9\- ]{2,60})",
        r"causes of ([A-Za-z][A-Za-z0-9\- ]{2,60})",
        r"signs of ([A-Za-z][A-Za-z0-9\- ]{2,60})",
        r"symptoms of ([A-Za-z][A-Za-z0-9\- ]{2,60})",
        r"([A-Za-z][A-Za-z0-9\- ]{2,60}) is defined as",
        r"([A-Za-z][A-Za-z0-9\- ]{2,60}) is",
        r"([A-Za-z][A-Za-z0-9\- ]{2,60}) are",
    ]

    for pattern in patterns:
        m = re.search(pattern, s, flags=re.IGNORECASE)
        if m:
            topic = m.group(1).strip(" ,.;:")
            topic_words = [
                w for w in topic.split()[:6]
                if w.lower() not in STOP_TOPIC_WORDS
            ]
            if topic_words:
                return " ".join(topic_words)

    # fallback: choose medically meaningful words from the front
    words = re.findall(r"[A-Za-z][A-Za-z0-9\-]*", s)
    filtered = [w for w in words if w.lower() not in STOP_TOPIC_WORDS]

    if filtered:
        return " ".join(filtered[:4])

    return "this condition"


def make_question(sentence: str) -> str:
    lowered = sentence.lower()
    topic = extract_topic(sentence)

    if "clinical features of" in lowered or "symptoms of" in lowered or "signs of" in lowered:
        return f"What are the clinical features of {topic}?"

    if "management of" in lowered or "treatment of" in lowered or "treated with" in lowered:
        return f"What is the management of {topic}?"

    if "causes of" in lowered or "cause of" in lowered or "caused by" in lowered:
        return f"What are the causes of {topic}?"

    if "complication" in lowered:
        return f"What are the complications of {topic}?"

    if "indication" in lowered:
        return f"What are the indications for {topic}?"

    if "defined as" in lowered or " is " in lowered:
        return f"What is {topic}?"

    if " are " in lowered:
        return f"What are {topic}?"

    return f"What does the note say about {topic}?"


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
        return {
            "document_id": document_id,
            "flashcards": [],
            "total": 0,
        }

    candidate_cards: List[Dict[str, Any]] = []

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

            answer = shorten_answer(sentence, max_words=28)
            question = make_question(answer)
            score = sentence_score(sentence)

            # reject weak generic questions
            if "this condition" in question.lower():
                continue

            candidate_cards.append(
                {
                    "question": question,
                    "answer": answer,
                    "chunk_index": chunk_index,
                    "_score": score,
                }
            )

    if not candidate_cards:
        return {
            "document_id": document_id,
            "flashcards": [],
            "total": 0,
        }

    candidate_cards.sort(key=lambda x: x["_score"], reverse=True)
    deduped = deduplicate_flashcards(candidate_cards)

    final_cards = []
    for card in deduped[:max_cards]:
        final_cards.append(
            {
                "question": card["question"],
                "answer": card["answer"],
                "chunk_index": card["chunk_index"],
            }
        )

    # Log flashcard generation session
    if final_cards:
        try:
            sb.table("flashcard_sessions").insert({
                "owner_id": user_id,
                "document_id": document_id,
                "cards_generated": len(final_cards),
            }).execute()
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to log flashcard session: {e}")

    return {
        "document_id": document_id,
        "flashcards": final_cards,
        "total": len(final_cards),
    }