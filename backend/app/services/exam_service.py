"""
Exam Mode Service.

Generates AI-powered medical exam questions (MCQs, case studies),
manages timed quizzes, scores answers, and tracks performance.
"""

import json
import logging
import random
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone

from fastapi import HTTPException

from app.core.supabase import supabase_admin
from app.services.llm_service import generate_llm_json

logger = logging.getLogger("noctual.exam")

EXAM_SYSTEM_PROMPT = """You are creating high-quality medical exam questions for students preparing for USMLE, PLAB, and MBBS exams.

## Question Types
- MCQ (Multiple Choice) — one correct answer, three plausible distractors
- Case Study — clinical vignette followed by a question
- True/False — clear statement

## Quality Standards
- Questions must test understanding, not just recall.
- Distractors must be plausible — common misconceptions or similar conditions.
- Include a clear, educational explanation for each answer.
- Tag difficulty: easy, medium, or hard.
- Tag topic: cardiology, respiratory, neurology, etc.

## Output Format (JSON array of questions)
[
  {
    "type": "mcq",
    "question": "A 45-year-old man presents with...",
    "option_a": "...",
    "option_b": "...",
    "option_c": "...",
    "option_d": "...",
    "correct_answer": "B",
    "explanation": "The correct answer is B because...",
    "difficulty": "medium",
    "topic": "cardiology"
  }
]

Generate {count} questions. Make them exam-realistic."""


async def generate_exam(
    user_id: str,
    document_id: Optional[str] = None,
    topic: Optional[str] = None,
    count: int = 10,
    difficulty: str = "mixed",
    exam_type: str = "mcq",
) -> Dict[str, Any]:
    """
    Generate an AI-powered exam.

    Args:
        document_id: Optional — generate from specific uploaded notes
        topic: Optional — e.g., "cardiology", "renal"
        count: Number of questions (default 10)
        difficulty: "easy", "medium", "hard", or "mixed"
        exam_type: "mcq" or "case_study"
    """
    sb = supabase_admin()

    context = ""
    if document_id:
        try:
            chunks = (
                sb.table("doc_chunks")
                .select("chunk_text")
                .eq("owner_id", user_id)
                .eq("document_id", document_id)
                .order("chunk_index")
                .limit(20)
                .execute()
            )
            if chunks.data:
                context = "Based on these notes:\n\n" + "\n\n".join(
                    c["chunk_text"][:800] for c in chunks.data
                )
        except Exception:
            pass

    topic_instruction = f"Focus on the topic: {topic}." if topic else ""
    difficulty_instruction = f"Difficulty level: {difficulty}." if difficulty != "mixed" else "Mix easy, medium, and hard questions."
    type_instruction = "Generate as clinical case studies with a single best answer." if exam_type == "case_study" else "Generate standard multiple choice questions."

    prompt = f"{context}\n\nCreate {count} medical exam questions. {topic_instruction} {difficulty_instruction} {type_instruction}"

    try:
        result = await generate_llm_json(
            system_prompt=EXAM_SYSTEM_PROMPT.format(count=count),
            user_prompt=prompt,
            temperature=0.3,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Exam generation failed: {e}")

    questions = result if isinstance(result, list) else result.get("questions", [])
    if not questions:
        raise HTTPException(status_code=500, detail="Failed to generate questions")

    try:
        attempt = (
            sb.table("exam_attempts")
            .insert({
                "user_id": user_id,
                "document_id": document_id,
                "exam_type": exam_type,
                "total_questions": len(questions),
                "time_limit_seconds": len(questions) * 90,
                "metadata": {"topic": topic, "difficulty": difficulty},
            })
            .execute()
        )
        attempt_id = attempt.data[0]["id"] if attempt.data else None
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create exam attempt: {e}")

    saved_questions = []
    for q in questions:
        try:
            q_row = (
                sb.table("quiz_questions")
                .insert({
                    "attempt_id": attempt_id,
                    "user_id": user_id,
                    "question": q.get("question", q.get("text", "")),
                    "option_a": q.get("option_a", q.get("options", {}).get("A", "")),
                    "option_b": q.get("option_b", q.get("options", {}).get("B", "")),
                    "option_c": q.get("option_c", q.get("options", {}).get("C", "")),
                    "option_d": q.get("option_d", q.get("options", {}).get("D", "")),
                    "correct_answer": q.get("correct_answer", q.get("answer", "")).upper(),
                    "explanation": q.get("explanation", ""),
                    "difficulty": q.get("difficulty", "medium"),
                    "topic": q.get("topic", ""),
                })
                .execute()
            )
            if q_row.data:
                saved_questions.append(q_row.data[0])
        except Exception:
            continue

    return {
        "attempt_id": attempt_id,
        "total_questions": len(saved_questions),
        "time_limit_seconds": len(saved_questions) * 90,
        "questions": [
            {
                "id": q["id"],
                "question": q["question"],
                "option_a": q["option_a"],
                "option_b": q["option_b"],
                "option_c": q["option_c"],
                "option_d": q["option_d"],
            }
            for q in saved_questions
        ],
    }


async def submit_answers(
    user_id: str,
    attempt_id: str,
    answers: List[Dict[str, str]],
) -> Dict[str, Any]:
    """
    Submit answers and calculate score.

    Args:
        answers: [{"question_id": "...", "answer": "B"}, ...]
    """
    sb = supabase_admin()

    try:
        attempt = (
            sb.table("exam_attempts")
            .select("*")
            .eq("id", attempt_id)
            .eq("user_id", user_id)
            .single()
            .execute()
        )
        if not attempt.data:
            raise HTTPException(status_code=404, detail="Attempt not found")
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=404, detail="Attempt not found")

    correct_count = 0
    results = []

    for ans in answers:
        qid = ans.get("question_id")
        selected = ans.get("answer", "").upper().strip()

        try:
            q = (
                sb.table("quiz_questions")
                .select("correct_answer, explanation, topic, difficulty")
                .eq("id", qid)
                .single()
                .execute()
            )
            if not q.data:
                continue

            correct = selected == q.data["correct_answer"]
            if correct:
                correct_count += 1

            sb.table("quiz_answers").insert({
                "attempt_id": attempt_id,
                "question_id": qid,
                "user_id": user_id,
                "selected_answer": selected,
                "is_correct": correct,
            }).execute()

            results.append({
                "question_id": qid,
                "your_answer": selected,
                "correct_answer": q.data["correct_answer"],
                "is_correct": correct,
                "explanation": q.data["explanation"],
                "topic": q.data.get("topic"),
                "difficulty": q.data.get("difficulty"),
            })
        except Exception:
            continue

    total = len(answers)
    score = round((correct_count / total) * 100, 1) if total > 0 else 0

    try:
        sb.table("exam_attempts").update({
            "correct_answers": correct_count,
            "score": score,
            "completed_at": datetime.now(timezone.utc).isoformat(),
        }).eq("id", attempt_id).execute()
    except Exception:
        pass

    return {
        "attempt_id": attempt_id,
        "score": score,
        "correct": correct_count,
        "total": total,
        "results": results,
    }


async def get_exam_history(user_id: str) -> Dict[str, Any]:
    """Get all exam attempts for a user."""
    sb = supabase_admin()
    try:
        res = (
            sb.table("exam_attempts")
            .select("*", count="exact")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .limit(20)
            .execute()
        )
        return {"attempts": res.data or [], "total": res.count or 0}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get history: {e}")


async def get_exam_result(user_id: str, attempt_id: str) -> Dict[str, Any]:
    """Get detailed results for an exam attempt."""
    sb = supabase_admin()
    try:
        attempt = (
            sb.table("exam_attempts")
            .select("*")
            .eq("id", attempt_id)
            .eq("user_id", user_id)
            .single()
            .execute()
        )
        if not attempt.data:
            raise HTTPException(status_code=404, detail="Attempt not found")

        questions = (
            sb.table("quiz_questions")
            .select("*")
            .eq("attempt_id", attempt_id)
            .execute()
        )

        answers = (
            sb.table("quiz_answers")
            .select("*")
            .eq("attempt_id", attempt_id)
            .execute()
        )

        answers_map = {a["question_id"]: a for a in (answers.data or [])}

        q_with_answers = []
        for q in (questions.data or []):
            a = answers_map.get(q["id"], {})
            q_with_answers.append({
                "id": q["id"],
                "question": q["question"],
                "options": {
                    "A": q["option_a"], "B": q["option_b"],
                    "C": q["option_c"], "D": q["option_d"],
                },
                "correct_answer": q["correct_answer"],
                "your_answer": a.get("selected_answer"),
                "is_correct": a.get("is_correct"),
                "explanation": q["explanation"],
                "topic": q.get("topic"),
                "difficulty": q.get("difficulty"),
            })

        return {
            "attempt": attempt.data,
            "questions": q_with_answers,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get result: {e}")
