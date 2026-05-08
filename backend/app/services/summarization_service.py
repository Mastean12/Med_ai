"""
Intelligent Summarization Service.

Generates multiple types of summaries from uploaded notes:
- Concise summary
- Detailed summary
- Exam-focused summary (high-yield points)
- Clinical summary
- Beginner summary (simplified)
"""

import logging
from typing import Dict, Any, Optional

from fastapi import HTTPException

from app.core.supabase import supabase_admin
from app.services.llm_service import generate_llm_response

logger = logging.getLogger("noctual.summaries")

SUMMARY_PROMPTS = {
    "concise": """You are creating a CONCISE summary of medical study notes.

## Rules
- Summarize in 3-5 short paragraphs.
- Include only the most important concepts.
- Use bullet points for key facts.
- Keep total length under 250 words.
- Maintain all medical accuracy.

## Format
**Key Concepts:**
- Point 1
- Point 2

**Summary:**
Brief paragraph summary.""",

    "detailed": """You are creating a DETAILED summary of medical study notes.

## Rules
- Cover all major topics in the notes thoroughly.
- Organize by topic/section.
- Include important details, numbers, and definitions.
- Use clear headings and subheadings.
- Maintain all medical accuracy.

## Format
# Topic Name
Detailed explanation with all key points.

# Next Topic
...""",

    "exam": """You are creating an EXAM-FOCUSED summary of medical study notes for students preparing for USMLE/PLAB/MBBS.

## Rules
- Structure around what examiners commonly test.
- Highlight "classic" presentations, "first-line" treatments, "gold standard" investigations.
- Include high-yield associations and clinical pearls.
- Use memory-friendly formatting: tables, comparisons, mnemonics.
- Flag common exam traps.

## Format
**High-Yield Points:**
- Classic presentation of X is...
- First-line treatment for Y is...
- Gold standard investigation for Z is...

**Clinical Pearls:**
- Remember: X often presents with Y
- Common mistake: confusing A with B

**Key Investigations:**
| Condition | First-line | Gold Standard |
|-----------|-----------|---------------|""",

    "clinical": """You are creating a CLINICALLY-ORIENTED summary of medical notes.

## Rules
- Focus on clinical presentation, diagnosis, and management.
- Structure: Clinical Features → Investigations → Management → Complications → Prognosis.
- Include relevant clinical guidelines.
- Highlight red flags and emergency presentations.
- Use practical, bedside-oriented language.

## Format
**Clinical Presentation:**
- Sign 1
- Symptom 2

**Investigations:**
- Bedside: ...
- Bloods: ...
- Imaging: ...

**Management:**
- Acute: ...
- Chronic: ...
- Surgical: (if applicable)

**Complications:**
- ...

**Prognosis:**
- ...""",

    "beginner": """You are simplifying medical content for a BEGINNER medical student.

## Rules
- Explain concepts as if teaching someone new to medicine.
- Define ALL medical terms in plain language.
- Use analogies and simple examples.
- Avoid jargon without explanation.
- Build understanding from fundamentals.
- Keep tone friendly and encouraging.

## Format
Start with: "Let's break this down simply..."

Explain each concept with:
1. What it means in plain English
2. Why it matters
3. A simple analogy or example

End with a brief recap."""
}


async def get_document_text(user_id: str, document_id: str) -> str:
    """Retrieve all chunk text for a document."""
    sb = supabase_admin()
    try:
        res = (
            sb.table("doc_chunks")
            .select("chunk_text")
            .eq("owner_id", user_id)
            .eq("document_id", document_id)
            .order("chunk_index")
            .execute()
        )
        if not res.data:
            raise HTTPException(status_code=404, detail="No content found in document")
        return "\n\n".join(c["chunk_text"] for c in res.data)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load document: {e}")


async def summarize_document(
    user_id: str,
    document_id: str,
    mode: str = "concise",
) -> Dict[str, Any]:
    """
    Generate a summary of uploaded notes.

    Modes: concise, detailed, exam, clinical, beginner
    """
    if mode not in SUMMARY_PROMPTS:
        raise HTTPException(status_code=400, detail=f"Invalid mode: {mode}. Choose from: {', '.join(SUMMARY_PROMPTS.keys())}")

    text = await get_document_text(user_id, document_id)

    if len(text) > 12000:
        text = text[:12000] + "\n\n[Note: document truncated for processing]"

    try:
        summary = await generate_llm_response(
            system_prompt=SUMMARY_PROMPTS[mode],
            user_prompt=f"Summarize the following medical study notes:\n\n{text}",
            temperature=0.2,
            max_tokens=2000,
        )
        return {"mode": mode, "document_id": document_id, "summary": summary.strip()}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Summarization failed: {e}")


async def extract_key_points(
    user_id: str,
    document_id: str,
    count: int = 10,
) -> Dict[str, Any]:
    """Extract high-yield key points from a document."""
    text = await get_document_text(user_id, document_id)

    if len(text) > 12000:
        text = text[:12000]

    system = """Extract the most important key points from these medical notes.

Rules:
- Return exactly the requested number of key points.
- Each point should be one clear, self-contained sentence.
- Focus on clinically relevant, exam-oriented facts.
- Include definitions, classic presentations, first-line treatments.
- Return as a JSON array of strings.

Format: {"points": ["point 1", "point 2", ...]}"""

    try:
        from app.services.llm_service import generate_llm_json
        result = await generate_llm_json(
            system_prompt=system,
            user_prompt=f"Extract {count} key points from:\n\n{text}",
            temperature=0.1,
        )
        points = result.get("points", [])
        return {"document_id": document_id, "count": len(points), "points": points}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Key point extraction failed: {e}")


async def generate_revision_sheet(
    user_id: str,
    document_id: str,
) -> Dict[str, Any]:
    """Generate a printable revision sheet from notes."""
    text = await get_document_text(user_id, document_id)
    if len(text) > 12000:
        text = text[:12000]

    system = """Create a printable revision sheet from these medical notes.

Format your response as a clean, structured study aid:

# Quick Reference: [Topic]

## Must-Know Facts
- [fact 1]
- [fact 2]
...

## Key Definitions
- [term]: [definition]
...

## Clinical Pearls
- [pearl 1]
...

## Memory Aids
- Mnemonic: [if applicable]
- Pattern: [if applicable]

## Common Exam Questions
- [typical question format]
- [what to remember]

Keep it concise. This should fit on 1-2 printed pages."""

    try:
        sheet = await generate_llm_response(
            system_prompt=system,
            user_prompt=text,
            temperature=0.2,
            max_tokens=2000,
        )
        return {"document_id": document_id, "revision_sheet": sheet.strip()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Revision sheet generation failed: {e}")
