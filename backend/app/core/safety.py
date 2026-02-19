def public_health_guardrails(text: str) -> str:
    # Basic MVP filtering. Later you’ll add more rules + logging.
    lowered = text.lower()

    # If user mentions emergency-like warning signs, we don't diagnose; we escalate.
    emergency_terms = ["chest pain", "trouble breathing", "fainting", "seizure", "unconscious"]
    if any(t in lowered for t in emergency_terms):
        return "User reports potentially serious symptoms. Provide urgent-care guidance and referral suggestion."

    return text.strip()
