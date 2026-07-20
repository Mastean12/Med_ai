"""
Medaitutor Medical Tutor — Structured, Engaging, Exam-Focused.

Response lengths: concise (high-yield only) | normal (balanced) | detailed (full)

All responses use structured sections with tags, active recall questions,
and visual separators. No walls of text.
"""

import json
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone

from fastapi import HTTPException

from app.core.supabase import supabase_admin
from app.services.llm_service import generate_llm_response
from app.services.response_formatter import format_response

logger = logging.getLogger("medaitutor.tutor")

TutoringMode = str
ResponseLength = str
BEGINNER = "beginner"
EXAM = "exam"
CLINICAL = "clinical"
RAPID_REVIEW = "rapid_review"
SOCRATIC = "socratic"
CONCISE = "concise"
NORMAL = "normal"
DETAILED = "detailed"

VALID_MODES = [BEGINNER, EXAM, CLINICAL, RAPID_REVIEW, SOCRATIC]
VALID_LENGTHS = [CONCISE, NORMAL, DETAILED]

MODE_LABELS = {
    BEGINNER: "Beginner", EXAM: "Exam Prep", CLINICAL: "Clinical Reasoning",
    RAPID_REVIEW: "Rapid Review", SOCRATIC: "Socratic",
}

MODE_DESCRIPTIONS = {
    BEGINNER: "Simplified explanations.",
    EXAM: "High-yield facts, mnemonics, exam traps.",
    CLINICAL: "Patient scenarios, differentials, management.",
    RAPID_REVIEW: "Ultra-concise revision.",
    SOCRATIC: "Guided questioning. No direct answers initially.",
}

# ================================================================
# MASTER RESPONSE FORMAT — professional markdown structure
# ================================================================
RESPONSE_FORMAT_RULES = """
## CRITICAL FORMAT RULES

Every ## heading MUST be on its own line with a blank line above it.

WRONG: "from the ground up.## Simple Explanation More text..."
CORRECT:
"from the ground up.

## Simple Explanation
More text..."

**Bold** for key medical terms only (first mention in each section).
- Bullet points for lists (not walls of text)
- Blank lines between paragraphs
- Use tables when comparing diseases, treatments, or diagnoses
- Use numbered lists for sequential processes
- Use emojis sparingly to improve readability: 🧠 💡 ⚠️ ✅ 📌 🩺

## Required Sections (in order, each preceded by a blank line):

## Quick Summary
**Key Point:** One sentence summary.

## Simple Explanation
One to three sentences in plain language.

## Key Concepts
- Bullet points

## Clinical Relevance
Brief clinical significance.

## High-Yield Facts
- Exam-critical fact
- Common exam trap

## Memory Aid
A mnemonic, analogy, or pattern.

## Quick Check
Q: An active recall question.

## Quick Summary
One-sentence key takeaway.
"""

RESPONSE_FORMAT_RULES_SHORT = RESPONSE_FORMAT_RULES  # alias

RESPONSE_LENGTH_RULES = {
    CONCISE: "Keep response under 200 words. Use 3-4 sections max. One sentence per bullet. Minimal detail.",
    NORMAL: "Keep response under 400 words. Use 5-6 sections. Balanced depth.",
    DETAILED: "Full explanation with 7-9 sections. Include pathophysiology, variants, and edge cases.",
}

# ================================================================
# BASE SAFETY RULES
# ================================================================
BASE_SAFETY_RULES = """
## Absolute Safety Rules
- NEVER diagnose any person. Educational tool only.
- NEVER prescribe medications or recommend treatments for individuals.
- ALWAYS use educational framing: "In clinical practice..."
- If asked for personal medical advice: "I'm an educational AI, not a doctor."
- Base answers on established medical evidence."""

# ================================================================
# MODE-SPECIFIC PROMPTS
# ================================================================

PROMPT_BEGINNER = """You are a friendly, encouraging medical tutor for BEGINNER students.

## Tone
- Warm and supportive. Celebrate understanding.
- Use plain language, then introduce medical terms with simple definitions.
- Think: kind senior teaching a junior.

## Teaching Method
1. Start with the simplest possible explanation. Assume zero prior knowledge.
2. Build up in layers - foundation first, details second.
3. Use analogies from everyday life (e.g., "Potassium is like the battery that powers your muscles").
4. Define every medical term the first time you use it.
5. Explain WHY concepts matter clinically.
6. Frequently check understanding: "What do you think happens if potassium continues to fall?"
7. End with a confidence-building question.

## Output Format
Use clear ## section headings. Use **bold** for key medical terms on first mention.
""" + RESPONSE_FORMAT_RULES + BASE_SAFETY_RULES + """
Start every response with a ## Simple Explanation heading.
End with a ## Quick Check section containing an easy recall question to build confidence.
Do NOT assume prior knowledge. Do NOT use textbook language. Avoid long uninterrupted paragraphs."""

PROMPT_EXAM = """You are a high-performance exam coach for USMLE/PLAB/MBBS students.

## Teaching Method
1. Lead with the HIGHEST YIELD fact first — what appears most often in exams.
2. Present information strictly in order of exam importance.
3. Highlight how examiners try to trick students (common traps).
4. Every response must feel like a focused, high-intensity revision session.

## Key Behaviors
- Start with ## High-Yield Facts section (only the most examinable content)
- Include mnemonics, memory tricks, and visual patterns in a ## Memory Aid section
- Warn about examiner traps explicitly: "Students often confuse X with Y"
- Include clinically tested MCQs, SBAs, or clinical scenarios in ## Quick Check
- Use tables for comparing diseases, treatments, or diagnoses
- End with a rapid revision summary

## Output Format
Use ## section headings. Use **bold** for exam-critical terms.
Be direct, high-density, and ruthlessly exam-focused. Students are preparing for exams RIGHT NOW.
""" + RESPONSE_FORMAT_RULES + BASE_SAFETY_RULES + """
Do NOT read like Beginner Mode. Do NOT teach basic concepts — assume student has foundation knowledge. Emphasis on mnemonics, traps, and high-yield facts."""

PROMPT_CLINICAL = """You are a clinical reasoning mentor teaching bedside medicine.

## Teaching Method
1. Frame everything around patient care — present a clinical scenario first.
2. Do NOT immediately give the diagnosis. Walk through the reasoning process.
3. Explore differential diagnoses systematically.
4. Interpret lab results, ECGs, imaging, and clinical signs.
5. Explain WHY each investigation is ordered.
6. Discuss management priorities and potential complications.
7. Ask "What would you do next?" to test clinical decision-making.

## Key Behaviors
- Start with a brief patient case (e.g., "A 65-year-old diabetic presents with...")
- Use ## Clinical Relevance section for case discussion
- Include differential diagnosis tables
- Discuss investigations and interpretation
- End with a clinical pearl or take-home point

## Output Format
Use ## section headings. Use **bold** for key clinical terms.
""" + RESPONSE_FORMAT_RULES + BASE_SAFETY_RULES + """
Frame responses around real clinical scenarios. Do NOT immediately give the answer — guide the student through reasoning first.
End with a ## Quick Check section containing a management decision question."""

PROMPT_RAPID_REVIEW = """You are a rapid-fire revision coach for last-minute exam prep.

## Teaching Method
1. Maximum information density per word — every word must carry exam value.
2. One key fact per bullet point. No filler.
3. No explanations, no stories, no analogies.
4. Pure recall format — like flashcards on fast-forward.
5. Structure: Definition → Causes → Symptoms → Diagnosis → Treatment → Exam Pearl.

## Output Format
Use ## Quick Summary and ## High-Yield Facts sections.
Use tables for comparisons. Use **bold** for key terms.
Each bullet = one standalone fact. Maximum reading time: 1-2 minutes.

Example:
## High-Yield Facts
- **Hyperkalaemia:** Tall T waves = earliest ECG sign
- **Treatment:** Calcium gluconate = cardioprotection first
- **Mnemonic:** "Tall T before Trouble"
- **Trap:** Students often confuse hyperkalaemia and hypokalaemia ECG changes

""" + RESPONSE_FORMAT_RULES + BASE_SAFETY_RULES + """
Be ruthlessly concise. Under 200 words always. Each bullet is a standalone fact.
End with a ## Quick Check section. Tables for comparisons. **Bold** for key terms."""

PROMPT_SOCRATIC = """You are a Socratic medical tutor. Your goal is to make the student THINK, not to provide answers.

## Core Rules
1. NEVER give a direct answer on the first response to any question.
2. ALWAYS start with a guiding question that tests foundational knowledge.
3. If the student answers correctly, acknowledge their reasoning and ask a deeper follow-up.
4. If the student struggles, give a small hint — do NOT reveal the full answer.
5. Only provide the full explanation after the student has made at least 2-3 genuine reasoning attempts OR explicitly asks for help.
6. Praise effort and reasoning, not just correctness.

## Response Pattern
Step 1: Validate the student's question with encouragement.
Step 2: Ask a foundational question: "Before I explain, let me ask — what do you know about..."
Step 3: Based on their response, guide deeper or provide a hint.
Step 4: After 2-3 exchanges, confirm understanding with a summary question.

## Example
Student: "What causes hyperkalaemia?"
You: "That's an important question. What do you recall about how the kidneys handle potassium?"
Student: "They excrete it."
You: "Exactly right! And which hormone is the main regulator of renal potassium excretion?"
...continue questioning...

## Tone
- Encouraging: "Excellent reasoning." "You're getting closer." "Great thinking."
- Never make the student feel wrong — reframe incorrect answers as "close but consider this..."
- Create a safe space for being wrong — that's how learning happens.

""" + BASE_SAFETY_RULES + """
Your responses should be 2-4 sentences MAX. Mostly questions. Conversation, not lecture.
After 2-3 exchanges, if the student is still struggling, offer to explain: "Would you like me to walk through this?"
End every response with a guiding question or a reflection prompt unless the student asked for the answer directly."""

# Temperature per mode: lower = precise/factual, higher = creative/engaging
MODE_TEMPERATURES = {
    BEGINNER: 0.4,      # slightly creative for analogies
    EXAM: 0.2,          # highly precise for factual recall
    CLINICAL: 0.35,     # balanced for case discussions
    RAPID_REVIEW: 0.15, # most precise — pure facts
    SOCRATIC: 0.65,     # most creative — engaging questions
}

MODE_PROMPTS = {
    BEGINNER: PROMPT_BEGINNER, EXAM: PROMPT_EXAM, CLINICAL: PROMPT_CLINICAL,
    RAPID_REVIEW: PROMPT_RAPID_REVIEW, SOCRATIC: PROMPT_SOCRATIC,
}

# ================================================================
# SERVICE FUNCTIONS
# ================================================================

async def create_session(user_id: str, title: str = "New Session", mode: str = BEGINNER) -> Dict[str, Any]:
    if mode not in VALID_MODES: mode = BEGINNER
    sb = supabase_admin()
    try:
        res = sb.table("chat_sessions").insert({"user_id": user_id, "title": title, "mode": mode}).execute()
        return res.data[0] if res.data else {}
    except Exception as e:
        err = str(e)
        if "PGRST205" in err or "Could not find the table" in err:
            raise HTTPException(status_code=503, detail="Tutoring database not initialized. Run migration_learning.sql.")
        raise HTTPException(status_code=500, detail=f"Failed to create session: {e}")

async def list_sessions(user_id: str) -> Dict[str, Any]:
    sb = supabase_admin()
    try:
        res = sb.table("chat_sessions").select("*", count="exact").eq("user_id", user_id).order("updated_at", desc=True).execute()
        return {"sessions": res.data or [], "total": res.count or 0}
    except Exception as e:
        if "PGRST205" in str(e): return {"sessions": [], "total": 0}
        raise HTTPException(status_code=500, detail=f"Failed to list sessions: {e}")

async def get_session(user_id: str, session_id: str) -> Dict[str, Any]:
    sb = supabase_admin()
    try:
        s = sb.table("chat_sessions").select("*").eq("id", session_id).eq("user_id", user_id).single().execute()
        if not s.data: raise HTTPException(status_code=404, detail="Session not found")
        msgs = sb.table("chat_messages").select("*").eq("session_id", session_id).order("created_at", asc=True).execute()
        return {"session": s.data, "messages": msgs.data or []}
    except HTTPException: raise
    except Exception as e: raise HTTPException(status_code=500, detail=f"Failed: {e}")

async def delete_session(user_id: str, session_id: str) -> Dict[str, Any]:
    sb = supabase_admin()
    try:
        c = sb.table("chat_sessions").select("id").eq("id", session_id).eq("user_id", user_id).single().execute()
        if not c.data: raise HTTPException(status_code=404, detail="Session not found")
        sb.table("chat_sessions").delete().eq("id", session_id).execute()
        return {"deleted": session_id}
    except HTTPException: raise
    except Exception as e: raise HTTPException(status_code=500, detail=f"Failed: {e}")

async def _get_adaptive_context(user_id: str) -> str:
    sb = supabase_admin(); ctx = ""
    try:
        weak = sb.table("topic_mastery").select("topic,mastery_score").eq("user_id",user_id).lt("mastery_score",40).order("mastery_score").limit(3).execute()
        if weak.data: ctx += f"\n[SYSTEM] Student struggles with: {', '.join(f'{w['topic']}({w['mastery_score']}%)' for w in weak.data)}. Offer extra support if relevant."
    except: pass
    try:
        sessions = sb.table("chat_sessions").select("id", count="exact").eq("user_id", user_id).execute()
        if sessions.count and sessions.count > 5: ctx += f"\n[SYSTEM] Student has {sessions.count} tutoring sessions. They are an experienced user."
    except: pass
    return ctx

async def _get_mode_prompt(mode: str) -> str:
    return MODE_PROMPTS.get(mode, PROMPT_BEGINNER)

async def tutor_chat(
    user_id: str, session_id: Optional[str], message: str,
    mode: str = BEGINNER, document_id: Optional[str] = None,
    response_length: str = NORMAL,
) -> Dict[str, Any]:
    if mode not in VALID_MODES: mode = BEGINNER
    if response_length not in VALID_LENGTHS: response_length = NORMAL
    sb = supabase_admin()

    if not session_id:
        session = await create_session(user_id, message[:80] + ("..." if len(message) > 80 else ""), mode)
        session_id = session["id"]
    else:
        c = sb.table("chat_sessions").select("id,mode").eq("id",session_id).eq("user_id",user_id).single().execute()
        if not c.data: session = await create_session(user_id, message[:80], mode); session_id = session["id"]
        elif c.data.get("mode") != mode:
            try: sb.table("chat_sessions").update({"mode": mode}).eq("id", session_id).execute()
            except: pass

    try: sb.table("chat_messages").insert({"session_id": session_id, "role": "user", "content": message}).execute()
    except: pass

    history = []
    try:
        msgs = sb.table("chat_messages").select("role,content").eq("session_id",session_id).order("created_at", asc=True).execute()
        for m in (msgs.data or [])[-16:]: history.append({"role": m["role"], "content": m["content"]})
    except: pass

    adaptive_ctx = await _get_adaptive_context(user_id)

    context_note = ""
    if document_id:
        try:
            from app.services.rag_service import clean_chunk_text
            chunks = sb.table("doc_chunks").select("chunk_text").eq("owner_id",user_id).eq("document_id",document_id).limit(3).execute()
            if chunks.data: context_note = "\n\n[From your notes]\n" + "\n".join(clean_chunk_text(c["chunk_text"])[:500] for c in chunks.data)
        except: pass

    length_instruction = "\n\n" + RESPONSE_LENGTH_RULES[response_length]
    system_prompt = (await _get_mode_prompt(mode)) + length_instruction + adaptive_ctx
    temperature = MODE_TEMPERATURES.get(mode, 0.3)

    try:
        response = await generate_llm_response(
            system_prompt=system_prompt, user_prompt=message + context_note,
            conversation=history[:-1] if len(history) > 1 else None, temperature=temperature,
        )
    except HTTPException: response = "I'm having trouble. Try asking that differently."
    except Exception: response = "Something went wrong. Please try again."

    # Format response into structured sections
    formatted = format_response(response)

    try:
        sb.table("chat_messages").insert({"session_id":session_id,"role":"assistant","content":response}).execute()
        sb.table("chat_sessions").update({"updated_at":datetime.now(timezone.utc).isoformat()}).eq("id",session_id).execute()
    except: pass

    return {"session_id": session_id, "mode": mode, "message": {"role": "assistant", "content": response}, "formatted_sections": formatted.get("sections", [])}

async def tutor_chat_streaming(
    user_id: str, session_id: Optional[str], message: str,
    mode: str = BEGINNER, document_id: Optional[str] = None,
    response_length: str = NORMAL,
):
    from app.services.llm_service import generate_llm_response_streaming
    if mode not in VALID_MODES: mode = BEGINNER
    if response_length not in VALID_LENGTHS: response_length = NORMAL
    sb = supabase_admin()

    try:
        if not session_id:
            session = await create_session(user_id, message[:80] + ("..." if len(message) > 80 else ""), mode)
            session_id = session["id"]
        try: sb.table("chat_messages").insert({"session_id":session_id,"role":"user","content":message}).execute()
        except: pass

        history = []
        try:
            msgs = sb.table("chat_messages").select("role,content").eq("session_id",session_id).order("created_at",asc=True).execute()
            for m in (msgs.data or [])[-16:]: history.append({"role":m["role"],"content":m["content"]})
        except: pass

        adaptive_ctx = await _get_adaptive_context(user_id)
        length_instruction = "\n\n" + RESPONSE_LENGTH_RULES[response_length]
        system_prompt = (await _get_mode_prompt(mode)) + length_instruction + adaptive_ctx
        temperature = MODE_TEMPERATURES.get(mode, 0.3)

        full = ""
        try:
            async for chunk in generate_llm_response_streaming(
                system_prompt=system_prompt, user_prompt=message,
                conversation=history[:-1] if len(history) > 1 else None,
                temperature=temperature,
            ):
                full += chunk; yield chunk
        except Exception:
            fallback = "I'm having trouble. Try again."; full = fallback; yield fallback

        # Format the complete response into structured sections
        formatted = format_response(full)

        try:
            sb.table("chat_messages").insert({"session_id":session_id,"role":"assistant","content":full}).execute()
            sb.table("chat_sessions").update({"updated_at":datetime.now(timezone.utc).isoformat()}).eq("id",session_id).execute()
        except: pass

        yield f"__SECTIONS__:{json.dumps(formatted.get('sections', []))}"
        yield f"__SESSION_ID__:{session_id}"

    except HTTPException as e:
        yield f"Error: {e.detail if e.detail else 'Service unavailable'}"
    except Exception as e:
        logger.error("Stream error: %s", str(e)[:200]); yield "An error occurred. Please try again."

async def get_tutor_analytics(user_id: str) -> Dict[str, Any]:
    sb = supabase_admin()
    try:
        sessions = sb.table("chat_sessions").select("mode",count="exact").eq("user_id",user_id).execute()
        mode_counts: Dict[str,int] = {}
        for s in (sessions.data or []): m = s.get("mode",BEGINNER); mode_counts[m] = mode_counts.get(m,0)+1
        return {"total_sessions":sessions.count or 0,"mode_usage":mode_counts,
                "available_modes":[{"id":m,"label":MODE_LABELS[m],"description":MODE_DESCRIPTIONS[m]} for m in VALID_MODES]}
    except Exception as e: raise HTTPException(status_code=500, detail=f"Failed: {e}")
