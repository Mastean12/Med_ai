"""
Note Simplification Service.

Converts complex medical text into beginner-friendly explanations.
Preserves factual accuracy while making content accessible.
"""

import logging
from typing import Dict, Any

from fastapi import HTTPException

from app.core.supabase import supabase_admin
from app.services.llm_service import generate_llm_response

logger = logging.getLogger("medaitutor.simplification")


SIMPLIFY_SYSTEM_PROMPT = """You are a medical educator specializing in simplifying complex concepts for students.

## Your Task
Take the provided medical text and rewrite it to be easily understandable by a beginner medical student.

## Rules
- Replace complex medical jargon with plain language explanations.
- When using a technical term, define it immediately in parentheses.
- Break long, complex sentences into shorter ones (max 20 words).
- Use analogies and real-world comparisons to explain abstract concepts.
- Maintain 100% factual accuracy — never simplify by removing important detail.
- Structure the response with clear paragraph breaks.
- Begin with a 1-sentence plain-language summary.

## Format
**In simple terms:** [one sentence plain summary]

[Simplified explanation with definitions and analogies]

**Why this matters:** [clinical or exam relevance in simple language]"""


async def simplify_text(user_id: str, text: str) -> Dict[str, Any]:
    """
    Simplify complex medical text into beginner-friendly language.

    Accepts free text input — not tied to a document.
    """
    if not text or len(text.strip()) < 20:
        raise HTTPException(status_code=400, detail="Text must be at least 20 characters")

    if len(text) > 5000:
        text = text[:5000]

    try:
        simplified = await generate_llm_response(
            system_prompt=SIMPLIFY_SYSTEM_PROMPT,
            user_prompt=f"Simplify this medical text:\n\n{text}",
            temperature=0.2,
            max_tokens=1500,
        )
        return {"original_length": len(text), "simplified": simplified.strip()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Simplification failed: {e}")


async def explain_concept(user_id: str, concept: str) -> Dict[str, Any]:
    """
    Explain a medical concept in simple, beginner-friendly language.

    e.g., "explain the Krebs cycle" or "what is hypertension"
    """
    if not concept or len(concept.strip()) < 3:
        raise HTTPException(status_code=400, detail="Concept must be at least 3 characters")

    system = """You are a friendly medical educator explaining concepts to beginners.

Structure your explanation:
1. **What is [concept]?** — One sentence plain-language definition.
2. **Why does it matter?** — Clinical or biological relevance.
3. **How does it work?** — Simple step-by-step explanation with analogies.
4. **Key terms to know** — Define 2-3 related medical terms.
5. **Memory aid** — A mnemonic or pattern to remember this.

Keep it friendly, encouraging, and under 300 words."""

    try:
        explanation = await generate_llm_response(
            system_prompt=system,
            user_prompt=f"Explain: {concept}",
            temperature=0.3,
            max_tokens=800,
        )
        return {"concept": concept.strip(), "explanation": explanation.strip()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Explanation failed: {e}")
