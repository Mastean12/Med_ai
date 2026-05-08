"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:8000";

type Question = { id: string; question: string; option_a: string; option_b: string; option_c: string; option_d: string };
type Result = {
  attempt_id: string; score: number; correct: number; total: number;
  results: { question_id: string; your_answer: string; correct_answer: string; is_correct: boolean; explanation: string; topic?: string; difficulty?: string }[];
};

export default function ExamPage() {
  const { user, loading: authLoading } = useAuth();

  const [questions, setQuestions] = useState<Question[]>([]);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentQ, setCurrentQ] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [timerActive, setTimerActive] = useState(false);

  const generate = async () => {
    setLoading(true);
    setResult(null);
    setAnswers({});
    setCurrentQ(0);
    try {
      const token = await getToken();
      const res = await fetch(`${BACKEND}/exam/generate`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ count: 10, difficulty: "mixed", exam_type: "mcq" }),
      });
      const data = await res.json();
      setQuestions(data.questions || []);
      setAttemptId(data.attempt_id);
      setTimeLeft(data.time_limit_seconds || 900);
      setTimerActive(true);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => {
    if (!timerActive || timeLeft <= 0) return;
    const timer = setInterval(() => setTimeLeft((t) => { if (t <= 1) { setTimerActive(false); return 0; } return t - 1; }), 1000);
    return () => clearInterval(timer);
  }, [timerActive, timeLeft]);

  const selectAnswer = (qid: string, answer: string) => {
    setAnswers((a) => ({ ...a, [qid]: answer }));
  };

  const submit = async () => {
    setLoading(true);
    try {
      const token = await getToken();
      const res = await fetch(`${BACKEND}/exam/submit`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          attempt_id: attemptId,
          answers: Object.entries(answers).map(([question_id, answer]) => ({ question_id, answer })),
        }),
      });
      const data = await res.json();
      setResult(data);
      setTimerActive(false);
    } catch {} finally { setLoading(false); }
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  const answered = Object.keys(answers).length;

  if (authLoading) return <main className="mx-auto max-w-4xl px-6 py-20"><div className="mx-auto h-8 w-48 animate-pulse rounded-xl bg-surface-200" /></main>;
  if (!user) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-20 text-center">
        <div className="rounded-2xl border border-surface-200 bg-white p-10 shadow-sm">
          <span className="text-4xl">📝</span>
          <h1 className="mt-4 text-2xl font-bold text-surface-900">Exam Mode</h1>
          <p className="mt-2 text-surface-500">Sign in to practice with AI-generated exams.</p>
          <Link href="/login" className="mt-6 inline-flex rounded-xl bg-brand-600 px-6 py-3 text-sm font-semibold text-white hover:bg-brand-700">Sign in</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">Exam Mode</h1>
          <p className="mt-1 text-sm text-surface-500">AI-generated medical exam questions</p>
        </div>
        {!questions.length && (
          <button onClick={generate} disabled={loading}
            className="rounded-xl bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-brand-700 disabled:opacity-40">
            {loading ? "Generating..." : "Start Exam"}
          </button>
        )}
      </div>

      {questions.length > 0 && !result && (
        <div>
          <div className="mb-6 flex items-center justify-between rounded-2xl border border-surface-200 bg-white px-5 py-3 shadow-sm">
            <div className="flex items-center gap-4">
              <span className="text-sm font-semibold text-surface-700">Question {currentQ + 1}/{questions.length}</span>
              <div className="h-1.5 w-32 rounded-full bg-surface-200">
                <div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${(answered / questions.length) * 100}%` }} />
              </div>
              <span className="text-xs text-surface-400">{answered} answered</span>
            </div>
            <div className="flex items-center gap-4">
              <span className={`text-sm font-mono font-semibold ${timeLeft < 60 ? "text-red-500" : "text-surface-600"}`}>{formatTime(timeLeft)}</span>
              <button onClick={submit} disabled={loading || answered === 0}
                className="rounded-lg bg-accent-600 px-4 py-2 text-xs font-semibold text-white transition-all hover:bg-accent-700 disabled:opacity-40">
                Submit
              </button>
            </div>
          </div>

          {questions[currentQ] && (
            <div key={questions[currentQ].id} className="rounded-2xl border border-surface-200 bg-white p-6 shadow-sm animate-fade-in">
              <p className="mb-6 text-lg font-medium leading-relaxed text-surface-800">{questions[currentQ].question}</p>
              <div className="space-y-3">
                {(["A", "B", "C", "D"] as const).map((letter) => {
                  const q = questions[currentQ];
                  const key = `option_${letter.toLowerCase()}` as keyof Question;
                  const selected = answers[q.id] === letter;
                  return (
                    <button
                      key={letter}
                      onClick={() => selectAnswer(q.id, letter)}
                      className={`w-full rounded-xl border-2 px-5 py-4 text-left text-sm transition-all ${
                        selected ? "border-brand-500 bg-brand-50 text-brand-800" : "border-surface-200 bg-white text-surface-700 hover:border-surface-300 hover:bg-surface-50"
                      }`}
                    >
                      <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full border-2 text-xs font-bold mr-3 ${
                        selected ? "border-brand-500 bg-brand-500 text-white" : "border-surface-300 text-surface-400"
                      }`}>
                        {letter}
                      </span>
                      {q[key] as string}
                    </button>
                  );
                })}
              </div>
              <div className="mt-6 flex justify-between">
                <button onClick={() => setCurrentQ((c) => Math.max(0, c - 1))} disabled={currentQ === 0}
                  className="rounded-lg border border-surface-200 px-4 py-2 text-sm text-surface-500 transition-colors hover:bg-surface-50 disabled:opacity-30">← Previous</button>
                <button onClick={() => setCurrentQ((c) => Math.min(questions.length - 1, c + 1))} disabled={currentQ === questions.length - 1}
                  className="rounded-lg border border-surface-200 px-4 py-2 text-sm text-surface-500 transition-colors hover:bg-surface-50 disabled:opacity-30">Next →</button>
              </div>
            </div>
          )}
        </div>
      )}

      {result && (
        <div className="animate-fade-in space-y-6">
          <div className="rounded-2xl border border-surface-200 bg-white p-8 text-center shadow-sm">
            <span className="text-5xl">{result.score >= 70 ? "🎉" : result.score >= 40 ? "📚" : "💪"}</span>
            <p className="mt-4 text-3xl font-bold text-surface-900">{result.score}%</p>
            <p className="mt-1 text-surface-500">{result.correct} of {result.total} correct</p>
            <button onClick={generate} className="mt-6 rounded-xl bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-brand-700">
              New Exam
            </button>
          </div>

          <div className="space-y-4">
            {result.results.map((r, i) => (
              <div key={i} className={`rounded-2xl border-2 p-5 ${r.is_correct ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}>
                <div className="flex items-center gap-3 mb-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${r.is_correct ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                    {r.is_correct ? "✓" : "✗"}
                  </span>
                  <span className="text-sm font-medium text-surface-700">Your answer: {r.your_answer || "—"}</span>
                  {!r.is_correct && <span className="text-sm font-medium text-green-700">Correct: {r.correct_answer}</span>}
                  {r.topic && <span className="ml-auto text-xs text-surface-400 capitalize">{r.topic}</span>}
                </div>
                <p className="text-xs leading-relaxed text-surface-600">{r.explanation}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}

async function getToken(): Promise<string | null> {
  try { const mod = await import("@/lib/auth"); return await mod.getAccessToken(); } catch { return null; }
}
