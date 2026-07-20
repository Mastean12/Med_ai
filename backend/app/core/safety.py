"""
Public Health Safety Guardrails.

Filters user input before it reaches the LLM or response layer.
Detects emergency keywords, self-harm indicators, and abuse patterns.
"""

import re
import logging

logger = logging.getLogger("medaitutor.safety")

EMERGENCY_KEYWORDS = [
    "chest pain", "trouble breathing", "fainting", "seizure",
    "unconscious", "can't breathe", "heart attack", "stroke",
    "severe bleeding", "overdose", "suicide", "kill myself",
    "want to die", "end my life",
]

ESCALATION_TRIGGERS = [
    "severe pain", "high fever", "head injury", "broken bone",
    "poison", "allergic reaction", "swelling face", "swelling throat",
    "anaphylaxis", "passed out", "blacked out",
]

NON_MEDICAL_TOPICS = [
    "weather", "stock", "crypto", "bitcoin", "politics",
    "election", "vote", "religion", "hack", "exploit",
    "sql injection", "xss", "prompt injection",
]


def public_health_guardrails(text: str) -> str:
    """
    Screen user input for safety concerns before processing.

    Returns modified text with safety flags if emergency keywords detected,
    or the original text if it passes all checks.
    """
    if not text or len(text.strip()) < 2:
        return "User submitted empty or very short query."

    lowered = text.lower()

    for keyword in EMERGENCY_KEYWORDS:
        if keyword in lowered:
            logger.warning(
                "Emergency keyword detected in public health input: %s",
                keyword,
            )
            return (
                "User reports potentially life-threatening symptoms: "
                f'"{text[:200]}". '
                "Provide urgent-care guidance and emergency service referral."
            )

    for trigger in ESCALATION_TRIGGERS:
        if trigger in lowered:
            logger.info(
                "Escalation trigger detected: %s in public health input",
                trigger,
            )
            return (
                f"User reports concerning symptoms: \"{text[:200]}\". "
                "Provide guidance and recommend seeking professional care."
            )

    for topic in NON_MEDICAL_TOPICS:
        if topic in lowered:
            logger.info(
                "Non-medical topic detected in public health: %s", topic
            )
            return (
                "User query appears to be non-medical. "
                "Remind user this service is for general health information only."
            )

    return text.strip()


def sanitize_llm_input(text: str, max_length: int = 1500) -> str:
    """
    Sanitize user input before sending to LLM.
    Truncates excessively long input and removes PII-like patterns.
    """
    if not text:
        return ""

    text = text.strip()

    if len(text) > max_length:
        text = text[:max_length] + "..."

    text = re.sub(r"\b\d{3}[-.]?\d{3}[-.]?\d{4}\b", "[PHONE]", text)
    text = re.sub(
        r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b",
        "[EMAIL]",
        text,
    )
    text = re.sub(
        r"\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b", "[IP]", text
    )

    return text
