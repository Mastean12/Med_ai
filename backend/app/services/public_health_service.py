"""
Public Health Service — LLM-Powered Health Guidance.

Provides general health information with strict safety guardrails.
All responses include medical disclaimers and escalation guidance.

IMPORTANT: This is NOT a medical diagnosis tool. It provides
general educational information only.
"""

import logging
from typing import Optional

from app.core.safety import public_health_guardrails
from app.services.llm_service import generate_llm_response

logger = logging.getLogger("noctual.public_health")

PUBLIC_HEALTH_SYSTEM_PROMPT = """You are a general health information assistant for the Noctual AI platform. Your role is to provide educational health information — NOT medical diagnosis or treatment recommendations.

## ABSOLUTE RULES (violate these and you will harm users):

1. NEVER diagnose any condition. Say "Only a healthcare professional can provide a diagnosis."
2. NEVER prescribe medication or suggest specific dosages.
3. NEVER tell someone they don't need to see a doctor.
4. NEVER downplay symptoms. If unsure, recommend seeking professional care.
5. ALWAYS include a disclaimer with every response.
6. If the user describes severe symptoms (chest pain, difficulty breathing, severe bleeding, loss of consciousness, sudden confusion, seizure, stroke symptoms), IMMEDIATELY instruct them to call emergency services (911/999/112).

## Response Structure:
1. Acknowledge the user's concern empathetically.
2. Provide general educational information about the topic (not specific to their case).
3. List general self-care suggestions where appropriate (rest, hydration, OTC options with disclaimer).
4. Include warning signs to watch for.
5. End with the mandatory disclaimer.

## Tone:
- Warm, professional, educational
- Never alarming unless emergency criteria are met
- Evidence-based when possible

## Mandatory Disclaimer (MUST appear in every response):
"Disclaimer: This is general health information, not medical advice. Consult a healthcare professional for personal medical concerns. If you're experiencing a medical emergency, call your local emergency number immediately."

## Example Topics (respond helpfully):
- General wellness tips
- Nutrition and exercise guidance
- Stress management
- Sleep hygiene
- Common condition overviews (explain what a condition is, not whether the user has it)
- Preventive health information"""


async def generate_public_guidance(
    symptoms_text: str,
    use_llm: bool = True,
) -> str:
    """
    Generate safe, educational health guidance.

    Strategy:
    1. Run guardrails to detect emergency/urgent keywords
    2. If LLM is enabled and available, use DeepSeek for nuanced responses
    3. Fall back to pre-written safe messaging if LLM is unavailable

    Args:
        symptoms_text: The user's description
        use_llm: Whether to try LLM response (falls back gracefully)

    Returns:
        Safe guidance string with mandatory disclaimers
    """
    safe_input = public_health_guardrails(symptoms_text)

    emergency_detected = "urgent-care guidance" in safe_input

    DEFAULT_SAFE_RESPONSE = (
        "General guidance: monitor your symptoms, rest, stay hydrated, "
        "and consider seeking care if symptoms are severe, persistent, or worsening. "
        "If you have urgent warning signs, seek immediate help. "
        "\n\nDisclaimer: This is general health information, not medical advice. "
        "Consult a healthcare professional for personal medical concerns."
    )

    EMERGENCY_RESPONSE = (
        "IMPORTANT: Based on what you described, you may need immediate medical attention. "
        "Please call your local emergency services (911 in the US, 999 in the UK, 112 in the EU) "
        "or go to your nearest emergency department right away.\n\n"
        "Do not drive yourself if you're experiencing severe symptoms.\n\n"
        "Disclaimer: This is an automated response. If you're experiencing a medical "
        "emergency, seek immediate professional help."
    )

    if emergency_detected:
        return EMERGENCY_RESPONSE

    if not use_llm:
        return DEFAULT_SAFE_RESPONSE

    try:
        response = await generate_llm_response(
            system_prompt=PUBLIC_HEALTH_SYSTEM_PROMPT,
            user_prompt=safe_input,
            temperature=0.3,
            max_tokens=500,
        )
        return response.strip()
    except Exception as e:
        logger.warning(
            "LLM public health response failed, using fallback: %s",
            str(e)[:200],
        )
        return DEFAULT_SAFE_RESPONSE


async def generate_health_tips(topic: str) -> str:
    """
    Generate general health tips on a specific topic.
    e.g., "sleep hygiene", "stress management", "hydration"
    """
    prompt = f"""Provide 3-5 concise, evidence-based tips about {topic}.
Keep each tip to one sentence. Be practical and actionable.
Include the mandatory disclaimer at the end."""

    try:
        response = await generate_llm_response(
            system_prompt=PUBLIC_HEALTH_SYSTEM_PROMPT,
            user_prompt=prompt,
            temperature=0.3,
            max_tokens=400,
        )
        return response.strip()
    except Exception:
        return (
            f"I'm unable to generate tips about {topic} right now. "
            "Please try again later or consult a healthcare professional.\n\n"
            "Disclaimer: This is general health information, not medical advice."
        )
