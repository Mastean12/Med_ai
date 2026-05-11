"""
Noctual AI — Professional Exam Engine.

Generates board-style medical questions with structured clinical
reasoning explanations. Supports 6 exam modes, adaptive difficulty,
and per-question topic tracking for mastery computation.

Exam modes: beginner | exam_prep | clinical | rapid_review | viva | adaptive
"""

import json, logging, random
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone

from fastapi import HTTPException

from app.core.supabase import supabase_admin
from app.services.llm_service import generate_llm_json

logger = logging.getLogger("noctual.exam")

BEGINNER = "beginner"
EXAM_PREP = "exam_prep"
CLINICAL = "clinical"
RAPID_REVIEW = "rapid_review"
VIVA = "viva"
ADAPTIVE = "adaptive"

VALID_MODES = [BEGINNER, EXAM_PREP, CLINICAL, RAPID_REVIEW, VIVA, ADAPTIVE]

MODE_LABELS = {
    BEGINNER: "Beginner", EXAM_PREP: "Exam Prep", CLINICAL: "Clinical Reasoning",
    RAPID_REVIEW: "Rapid Review", VIVA: "Viva Practice", ADAPTIVE: "Adaptive",
}

EXPLANATION_FORMAT = """
## Explanation Format (MANDATORY)
For every question, structure the explanation field exactly as follows:

[HY] — High-yield fact (one sentence)
[EP] — Exam Pearl (what examiners test)
[CM] — Common Mistake (exam trap)
[MM] — Memory Aid / Mnemonic
[CL] — Clinical Pearl (bedside relevance)

Use these exact tags. One sentence per tag. No more than 2 sentences per tag.
"""

EXAM_SYSTEM_PROMPT = """You are a senior medical examiner creating board-quality questions for USMLE, PLAB, and MBBS.

## Quality Standards
- Questions must test clinical understanding, not just recall.
- Distractors must be plausible — common misconceptions or similar conditions.
- Every question includes a structured explanation with tagged sections.

## Question Types
- MCQ: Single best answer with 4 options
- Case: Clinical vignette followed by a single question
- Viva: Open-ended oral exam prompt (no options, student types answer)

## Output Format (JSON array of objects)
Each object must have these fields: type, question, option_a, option_b, option_c, option_d, correct_answer, explanation, difficulty, topic.

## Count
Generate exactly {count} questions. Make them exam-realistic and clinically relevant.""" + EXPLANATION_FORMAT

MODE_INSTRUCTIONS = {
    BEGINNER: "Create questions for BEGINNER medical students. Use simpler clinical scenarios. Focus on core concepts. No complex multi-step reasoning.",
    EXAM_PREP: "Create high-stakes board exam questions. Include multi-step reasoning. Focus on high-yield topics that examiners love. Make distractors tricky.",
    CLINICAL: "Create clinical reasoning cases. Each question should be a brief patient scenario. Focus on: what next? differential? investigation? management?",
    RAPID_REVIEW: "Create rapid-fire recall questions. Each question tests one key fact. Short vignettes. Quick to answer. High density.",
    VIVA: "Create VIVA / oral exam style prompts. These are open-ended questions without options. Student must reason aloud. Include expected answer points in explanation.",
    ADAPTIVE: "Create a MIX of questions at varying difficulty. Some easy (confidence builders), some medium, some hard (stretch). Cover multiple topics.",
}


async def _get_weak_topics(user_id: str) -> List[str]:
    """Get user's weakest topics for adaptive exam generation."""
    sb = supabase_admin()
    try:
        res = sb.table("topic_mastery").select("topic").eq("user_id", user_id).lt("mastery_score", 40).order("mastery_score").limit(5).execute()
        return [r["topic"] for r in (res.data or [])]
    except:
        return []


def _sanitize_answer(answer: str) -> str:
    """Extract A/B/C/D from LLM response formats like 'B.', 'Option B', 'Answer: C'."""
    cleaned = answer.strip().upper()
    for ch in cleaned:
        if ch in "ABCD":
            return ch
    return cleaned[:1] if cleaned else "A"


async def generate_exam(
    user_id: str, document_id: Optional[str] = None, topic: Optional[str] = None,
    count: int = 10, difficulty: str = "mixed", exam_mode: str = EXAM_PREP,
) -> Dict[str, Any]:
    if exam_mode not in VALID_MODES: exam_mode = EXAM_PREP
    sb = supabase_admin()

    context = ""
    if document_id:
        try:
            chunks = sb.table("doc_chunks").select("chunk_text").eq("owner_id", user_id).eq("document_id", document_id).order("chunk_index").limit(15).execute()
            if chunks.data: context = "Based on these notes:\n\n" + "\n\n".join(c["chunk_text"][:700] for c in chunks.data)
        except: pass

    topic_instruction = ""
    if topic:
        topic_instruction = f"Focus EXCLUSIVELY on: {topic}."
    elif exam_mode == ADAPTIVE:
        weak = await _get_weak_topics(user_id)
        if weak: topic_instruction = f"Focus on these weak topics: {', '.join(weak[:5])}. Target the student's specific gaps."

    mode_instruction = MODE_INSTRUCTIONS.get(exam_mode, MODE_INSTRUCTIONS[EXAM_PREP])
    diff = f"Difficulty: {difficulty}." if difficulty != "mixed" else "Mix easy, medium, and hard questions."
    prompt = f"{context}\n\nCreate {count} medical exam questions. {topic_instruction}\n{mode_instruction}\n{diff}"

    try:
        result = await generate_llm_json(system_prompt=EXAM_SYSTEM_PROMPT.format(count=count), user_prompt=prompt, temperature=0.3)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Exam generation failed: {e}")

    questions = result if isinstance(result, list) else result.get("questions", [])
    if not questions: raise HTTPException(status_code=500, detail="Failed to generate questions")

    try:
        attempt = sb.table("exam_attempts").insert({
            "user_id": user_id, "document_id": document_id, "exam_type": exam_mode,
            "total_questions": len(questions), "time_limit_seconds": len(questions) * 90,
            "metadata": {"topic": topic, "difficulty": difficulty, "mode": exam_mode},
        }).execute()
        attempt_id = attempt.data[0]["id"] if attempt.data else None
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create exam attempt: {e}")

    saved = []
    for q in questions:
        try:
            raw_ans = q.get("correct_answer", q.get("answer", ""))
            clean_ans = _sanitize_answer(raw_ans)
            if clean_ans not in ("A", "B", "C", "D"):
                logger.warning("Invalid answer after sanitize: raw=%s cleaned=%s", raw_ans, clean_ans)
                continue
            row = sb.table("quiz_questions").insert({
                "attempt_id": attempt_id, "user_id": user_id,
                "question": q.get("question", q.get("text", "")),
                "option_a": q.get("option_a", q.get("options", {}).get("A", "")),
                "option_b": q.get("option_b", q.get("options", {}).get("B", "")),
                "option_c": q.get("option_c", q.get("options", {}).get("C", "")),
                "option_d": q.get("option_d", q.get("options", {}).get("D", "")),
                "correct_answer": _sanitize_answer(q.get("correct_answer", q.get("answer", ""))),
                "explanation": q.get("explanation", ""),
                "difficulty": (q.get("difficulty", "medium") or "medium").lower(),
                "topic": q.get("topic", ""),
            }).execute()
            if row.data: saved.append(row.data[0])
        except Exception as e:
            logger.warning("Question insert failed: %s", str(e)[:200])
            continue

    return {
        "attempt_id": attempt_id, "total_questions": len(saved),
        "time_limit_seconds": len(saved) * 90, "exam_mode": exam_mode,
        "questions": [{"id": q["id"], "question": q["question"], "option_a": q["option_a"],
                        "option_b": q["option_b"], "option_c": q["option_c"], "option_d": q["option_d"]}
                       for q in saved],
    }


async def submit_answers(user_id: str, attempt_id: str, answers: List[Dict[str, str]]) -> Dict[str, Any]:
    sb = supabase_admin()
    try:
        attempt = sb.table("exam_attempts").select("*").eq("id", attempt_id).eq("user_id", user_id).single().execute()
        if not attempt.data: raise HTTPException(status_code=404, detail="Attempt not found")
    except HTTPException: raise
    except Exception: raise HTTPException(status_code=404, detail="Attempt not found")

    correct_count, results = 0, []
    topic_performance: Dict[str, Dict[str, int]] = {}
    for ans in answers:
        qid = ans.get("question_id"); selected = ans.get("answer", "").upper().strip()
        try:
            q = sb.table("quiz_questions").select("correct_answer,explanation,topic,difficulty").eq("id", qid).single().execute()
            if not q.data: continue
            correct = selected == q.data["correct_answer"]
            if correct: correct_count += 1

            sb.table("quiz_answers").insert({"attempt_id": attempt_id, "question_id": qid, "user_id": user_id,
                                              "selected_answer": selected, "is_correct": correct}).execute()

            topic = q.data.get("topic", "unknown")
            if topic not in topic_performance: topic_performance[topic] = {"correct": 0, "total": 0}
            topic_performance[topic]["total"] += 1
            if correct: topic_performance[topic]["correct"] += 1

            results.append({"question_id": qid, "your_answer": selected, "correct_answer": q.data["correct_answer"],
                            "is_correct": correct, "explanation": q.data["explanation"],
                            "topic": topic, "difficulty": q.data.get("difficulty")})
        except: continue

    total = len(answers); score = round((correct_count / total) * 100, 1) if total > 0 else 0
    try:
        sb.table("exam_attempts").update({"correct_answers": correct_count, "score": score,
                                           "completed_at": datetime.now(timezone.utc).isoformat()}).eq("id", attempt_id).execute()
    except: pass

    # Update topic mastery for adaptive learning
    for t, perf in topic_performance.items():
        try:
            from app.services.adaptive_service import update_topic_mastery
            for _ in range(perf["total"]):
                await update_topic_mastery(user_id, t, perf["correct"] > 0)
        except: pass

    return {"attempt_id": attempt_id, "score": score, "correct": correct_count, "total": total, "results": results,
            "topic_breakdown": {t: {"correct": p["correct"], "total": p["total"],
                                     "pct": round(p["correct"] / max(p["total"], 1) * 100)} for t, p in topic_performance.items()}}


async def get_exam_history(user_id: str) -> Dict[str, Any]:
    sb = supabase_admin()
    try:
        res = sb.table("exam_attempts").select("*", count="exact").eq("user_id", user_id).order("started_at", desc=True).limit(20).execute()
        return {"attempts": res.data or [], "total": res.count or 0}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed: {e}")


async def get_exam_result(user_id: str, attempt_id: str) -> Dict[str, Any]:
    sb = supabase_admin()
    try:
        a = sb.table("exam_attempts").select("*").eq("id", attempt_id).eq("user_id", user_id).single().execute()
        if not a.data: raise HTTPException(status_code=404, detail="Attempt not found")
        questions = sb.table("quiz_questions").select("*").eq("attempt_id", attempt_id).execute()
        answers = sb.table("quiz_answers").select("*").eq("attempt_id", attempt_id).execute()
        am = {x["question_id"]: x for x in (answers.data or [])}

        qs = []
        for q in (questions.data or []):
            ans = am.get(q["id"], {})
            qs.append({"id": q["id"], "question": q["question"],
                       "options": {"A": q["option_a"], "B": q["option_b"], "C": q["option_c"], "D": q["option_d"]},
                       "correct_answer": q["correct_answer"], "your_answer": ans.get("selected_answer"),
                       "is_correct": ans.get("is_correct"), "explanation": q["explanation"],
                       "topic": q.get("topic"), "difficulty": q.get("difficulty")})
        return {"attempt": a.data, "questions": qs}
    except HTTPException: raise
    except Exception as e: raise HTTPException(status_code=500, detail=f"Failed: {e}")


async def get_exam_dashboard(user_id: str) -> Dict[str, Any]:
    sb = supabase_admin()
    try:
        attempts = sb.table("exam_attempts").select("score,total_questions,correct_answers,started_at").eq("user_id", user_id).order("started_at", desc=True).limit(50).execute()
        all_attempts = attempts.data or []
        completed = [a for a in all_attempts if a.get("score") is not None]
        scores = [a["score"] for a in completed]
        avg_score = round(sum(scores) / len(scores), 1) if scores else 0
        total_qs = sum(a.get("total_questions", 0) for a in all_attempts)
        total_correct = sum(a.get("correct_answers", 0) for a in completed)

        # Topic breakdown
        topics = sb.table("quiz_questions").select("topic,difficulty").eq("user_id", user_id).execute()
        topic_counts: Dict[str, int] = {}
        for t in (topics.data or []):
            tp = t.get("topic", "unknown")
            topic_counts[tp] = topic_counts.get(tp, 0) + 1
        sorted_topics = sorted(topic_counts.items(), key=lambda x: x[1], reverse=True)

        weak_topics = await _get_weak_topics(user_id)

        return {
            "exams_completed": len(completed), "total_questions_answered": total_qs,
            "total_correct": total_correct, "average_score": avg_score,
            "recent_scores": scores[:10], "top_topics": sorted_topics[:8],
            "weak_topics": weak_topics[:5],
            "exam_modes": [{"id": m, "label": MODE_LABELS[m]} for m in VALID_MODES],
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed: {e}")
