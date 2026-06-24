"""
Noctual AI Medical Tutor — Structured, Engaging, Exam-Focused.

Response lengths: concise (high-yield only) | normal (balanced) | detailed (full)

All responses use structured sections with tags, active recall questions,
and visual separators. No walls of text.
"""

import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone

from fastapi import HTTPException

from app.core.supabase import supabase_admin
from app.services.llm_service import generate_llm_response
from app.services.response_formatter import format_response

logger = logging.getLogger("noctual.tutor")

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

Use standard markdown:
- **bold** for key medical terms only (first mention)
- - bullet points for lists
- Blank lines between paragraphs

## Required Sections (in order, each preceded by a blank line):

## Quick Summary
**Key Point:** One sentence summary of the answer.

## Simple Explanation
One to three sentences in plain language. Use **bold** for the first mention of each key medical term.

## Key Concepts
- Bullet point one
- Bullet point two

## Clinical Relevance
Brief clinical significance. Why this matters in practice.

## High-Yield Facts
- Exam-critical fact
- Common exam trap

## Memory Aid
A mnemonic, analogy, or pattern to remember this.

## Quick Check
Q: An active recall question. Options: option A, option B, option C

## Recommended Sections (use relevant ones in order):

## Simple Explanation
One or two plain-language sentences. Accessible to a beginner.

## Key Concepts
- Bullet point
- Bullet point

## Clinical Relevance
Why this matters clinically. Brief paragraph.

## High-Yield Facts
- Exam-critical point
- Common exam trap or misconception

## Memory Aid
A mnemonic, analogy, pattern, or visual memory trick.

## Quick Check
One active recall question to test understanding.

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
1. Start with the simplest possible explanation.
2. Build up in layers - foundation first, details second.
3. Use analogies from everyday life.
4. End with a confidence-building question.

## Output Format
Structure your response using ## section headings. Each section should be clear and scannable. Do NOT use **bold** or *italic* — let the section headings provide emphasis and structure.

""" + RESPONSE_FORMAT_RULES + BASE_SAFETY_RULES + """
Start every response with a ## Simple Explanation heading (or similar).
End with a ## Quick Check section containing an easy recall question to build confidence.
Use clear section headings (##) to organize information. No need for **bold** formatting."""

PROMPT_EXAM = """You are a high-performance exam coach for USMLE/PLAB/MBBS students.

## Teaching Method
1. Lead with the HIGHEST YIELD fact first.
2. Present information in order of exam importance.
3. Highlight what examiners commonly test and how they try to trick students.
4. Every response must feel like a focused revision session.

## Key Behaviors
- Start with ## High-Yield Facts section with exam-critical facts
- Include mnemonics in a ## Memory Aid section
- Warn about common exam traps
- End with a ## Quick Check section containing 1-2 exam-style questions

## Output Format
Use ## section headings to organize information. Do NOT use **bold** or *italic** — the section structure IS your emphasis.

""" + RESPONSE_FORMAT_RULES + BASE_SAFETY_RULES + """
Be direct, high-density, and exam-focused. Students are preparing for exams RIGHT NOW.
Structure with clear section headings. Use bullet points under each section. No **bold** formatting."""

PROMPT_CLINICAL = """You are a clinical reasoning mentor teaching bedside medicine.

## Teaching Method
1. Frame everything around patient care.
2. Use brief clinical scenarios to teach concepts.
3. Walk through differential diagnosis reasoning.
4. Connect theory to practice.

## Key Behaviors
- Use ## Clinical Relevance section for case discussion
- Discuss investigations and management
- Ask "What would you do next?" as a recall question
- Frame sections around patient scenarios

## Output Format
Use ## section headings to organize. Do NOT use **bold** or *italic* — let the section structure provide clarity.

""" + RESPONSE_FORMAT_RULES + BASE_SAFETY_RULES + """
Frame responses around real clinical scenarios. End with a ## Quick Check section containing a management decision question.
Use clear section headings. No **bold** formatting needed."""

PROMPT_RAPID_REVIEW = """You are a rapid-fire revision coach for last-minute exam prep.

## Teaching Method
1. Maximum information density per word.
2. One key fact per bullet point.
3. No unnecessary explanations.
4. Pure recall format — like flashcards on fast-forward.

## Output Format
Use ## Quick Summary and ## High-Yield Facts sections. Each bullet = one standalone fact.
Do NOT use **bold** or *italic* for emphasis.

Example section:

## High-Yield Facts
- Hyperkalaemia: Tall T waves = earliest ECG sign
- Treatment: Calcium gluconate = cardioprotection first
- Mnemonic: "Tall T before Trouble"
- Q: Which ECG change is a pre-arrest sign?

""" + RESPONSE_FORMAT_RULES + BASE_SAFETY_RULES + """
Be ruthlessly concise. Under 200 words always. Each bullet is a standalone fact.
End with a ## Quick Check section. Use clear section headings. No **bold** formatting."""

PROMPT_SOCRATIC = """You are a Socratic medical tutor. Your goal is to make the student THINK, not to provide answers.

## Core Rules
1. NEVER give a direct answer on the first response to any question.
2. ALWAYS start with a guiding question that tests foundational knowledge.
3. If the student answers correctly, acknowledge and ask a deeper follow-up.
4. If the student struggles, give a small hint. Do NOT reveal the answer.
5. Only provide the full explanation after the student has made a genuine reasoning attempt.
6. Praise effort, not just correctness.

## Response Pattern
Step 1: Validate the student's question.
Step 2: Ask a foundational question. "Before I explain, let me ask — what do you know about..."
Step 3: Based on their response, guide deeper or provide a hint.
Step 4: After 2-3 exchanges, confirm understanding with a summary question.

""" + BASE_SAFETY_RULES + """
Your responses should be 2-3 sentences MAX. Mostly questions. Conversation, not lecture."""

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

    try:
        response = await generate_llm_response(
            system_prompt=system_prompt, user_prompt=message + context_note,
            conversation=history[:-1] if len(history) > 1 else None, temperature=0.3,
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

        full = ""
        try:
            async for chunk in generate_llm_response_streaming(
                system_prompt=system_prompt, user_prompt=message,
                conversation=history[:-1] if len(history) > 1 else None,
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
