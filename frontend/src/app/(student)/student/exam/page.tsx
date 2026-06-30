"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { PenTool, Clock, Target, TrendingUp, ChevronRight, BarChart3, Sparkles, Play, BookOpen, Zap, Brain, HelpCircle, Check, X, Heart } from "lucide-react";

import { API_BASE_URL } from "@/lib/apiClient";

type Question = { id: string; question: string; option_a: string; option_b: string; option_c: string; option_d: string };
type Result = { attempt_id: string; score: number; correct: number; total: number; topic_breakdown?: Record<string, { correct: number; total: number; pct: number }>; results: { question_id: string; your_answer: string; correct_answer: string; is_correct: boolean; explanation: string; topic?: string }[] };
type Dashboard = { exams_completed: number; total_questions_answered: number; average_score: number; recent_scores: number[]; top_topics: [string, number][]; weak_topics: string[]; exam_modes: { id: string; label: string }[] };

const MODE_ICONS: Record<string, typeof PenTool> = { beginner: BookOpen, exam_prep: PenTool, clinical: Heart, rapid_review: Zap, viva: HelpCircle, adaptive: Brain };
const MODE_DESCRIPTIONS: Record<string, string> = {
  beginner: "Core concepts, simpler scenarios.", exam_prep: "Board-style MCQs with exam traps.",
  clinical: "Patient cases, differentials, management.", rapid_review: "Rapid-fire high-yield recall.",
  viva: "Open-ended oral exam practice.", adaptive: "Auto-targets your weak areas.",
};

export default function ExamPage() {
  const { user, loading: authLoading } = useAuth();
  const [view, setView] = useState<"dashboard" | "exam" | "result">("dashboard");
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentQ, setCurrentQ] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const [selectedMode, setSelectedMode] = useState("exam_prep");
  const [selectedTopic, setSelectedTopic] = useState("");
  const [questionCount, setQuestionCount] = useState(10);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetchDashboard();
  }, [user]);

  useEffect(() => {
    if (!timerActive || timeLeft <= 0) return;
    const t = setInterval(() => setTimeLeft((p) => { if (p <= 1) { setTimerActive(false); return 0; } return p - 1; }), 1000);
    return () => clearInterval(t);
  }, [timerActive, timeLeft]);

  const fetchDashboard = async () => {
    try {
      const token = await getToken();
      const res = await fetch(`${API_BASE_URL}/exam/dashboard`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setDashboard(await res.json());
    } catch {}
  };

  const generate = async () => {
    setGenerating(true);
    setResult(null); setAnswers({}); setCurrentQ(0);
    try {
      const token = await getToken();
      const res = await fetch(`${API_BASE_URL}/exam/generate`, {
        method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ count: questionCount, exam_mode: selectedMode, topic: selectedTopic || undefined, difficulty: "mixed" }),
      });
      const data = await res.json();
      setQuestions(data.questions || []);
      setAttemptId(data.attempt_id);
      setTimeLeft(data.time_limit_seconds || 900);
      setTimerActive(true);
      setView("exam");
    } catch {} finally { setGenerating(false); }
  };

  const submit = async () => {
    setLoading(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API_BASE_URL}/exam/submit`, {
        method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ attempt_id: attemptId, answers: Object.entries(answers).map(([q,a]) => ({ question_id: q, answer: a })) }),
      });
      const data = await res.json();
      setResult(data); setTimerActive(false); setView("result");
      fetchDashboard();
    } catch {} finally { setLoading(false); }
  };

  const selectAnswer = (qid: string, a: string) => setAnswers((p) => ({ ...p, [qid]: a }));
  const formatTime = (s: number) => `${Math.floor(s/60)}:${String(s%60).padStart(2,"0")}`;
  const answered = Object.keys(answers).length;
  const scoreColor = (s: number) => s >= 70 ? "text-green-600" : s >= 50 ? "text-amber-600" : "text-red-500";
  const scoreBg = (s: number) => s >= 70 ? "bg-green-50 border-green-200" : s >= 50 ? "bg-amber-50 border-amber-200" : "bg-red-50 border-red-200";

  if (authLoading) return <div className="p-8"><div className="h-8 w-48 animate-shimmer rounded-xl" /></div>;
  if (!user) return <div className="p-8 text-center"><PenTool className="mx-auto h-10 w-10 text-surface-300" /><h1 className="mt-4 text-xl font-bold">Exam Mode</h1><p className="mt-2 text-surface-500">Please <Link href="/login" className="text-brand-600 hover:underline">sign in</Link>.</p></div>;

  if (view === "dashboard") return (
    <div className="space-y-6 p-6 lg:p-8">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
        <h1 className="text-2xl font-bold tracking-tight text-surface-900">Exam Mode</h1>
        <p className="mt-1 text-sm text-surface-500">AI-powered medical exam preparation.</p>
      </motion.div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[{ label: "Exams Done", value: dashboard?.exams_completed ?? 0, icon: PenTool, color: "text-brand-600 bg-brand-50" },
          { label: "Questions", value: dashboard?.total_questions_answered ?? 0, icon: Target, color: "text-accent-600 bg-accent-50" },
          { label: "Avg Score", value: `${dashboard?.average_score ?? 0}%`, icon: TrendingUp, color: "text-purple-600 bg-purple-50" },
          { label: "Topics", value: dashboard?.top_topics?.length ?? 0, icon: BarChart3, color: "text-amber-600 bg-amber-50" } as const].map((s) => (
          <div key={s.label} className="rounded-2xl border border-surface-200 bg-white p-5 shadow-sm">
            <div className={`inline-flex h-9 w-9 items-center justify-center rounded-lg ${s.color.split(" ")[1]}`}>
              <s.icon className={`h-4 w-4 ${s.color.split(" ")[0]}`} />
            </div>
            <p className={`mt-3 text-2xl font-bold ${s.color.split(" ")[0]}`}>{s.value}</p>
            <p className="text-sm text-surface-500">{s.label}</p>
          </div>
        ))}
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.1 }}
        className="rounded-2xl border border-surface-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold text-surface-700 flex items-center gap-2"><Play className="h-4 w-4 text-brand-500" /> Start New Exam</h2>
        <div className="flex flex-wrap gap-3">
          {dashboard?.exam_modes?.map((m) => {
            const Icon = MODE_ICONS[m.id] || PenTool;
            return (
              <button key={m.id} onClick={() => setSelectedMode(m.id)}
                className={`flex items-center gap-2 rounded-xl border-2 px-4 py-3 text-sm font-medium transition-all ${selectedMode === m.id ? "border-brand-500 bg-brand-50 text-brand-700" : "border-surface-200 text-surface-500 hover:border-surface-300"}`}>
                <Icon className="h-4 w-4" />{m.label}
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-surface-400">{MODE_DESCRIPTIONS[selectedMode] || ""}</p>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <select value={questionCount} onChange={(e) => setQuestionCount(Number(e.target.value))}
            className="rounded-lg border border-surface-200 bg-surface-50 px-3 py-2 text-sm text-surface-600">
            <option value={5}>5 Questions</option><option value={10}>10 Questions</option>
            <option value={20}>20 Questions</option><option value={30}>30 Questions</option>
          </select>
          <input value={selectedTopic} onChange={(e) => setSelectedTopic(e.target.value)} placeholder="Topic (e.g. cardiology)..."
            className="rounded-lg border border-surface-200 bg-surface-50 px-3 py-2 text-sm text-surface-600 flex-1 min-w-[200px]" />
          <button onClick={generate} disabled={generating}
            className="rounded-xl bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-brand-700 disabled:opacity-40 flex items-center gap-2">
            <Sparkles className="h-4 w-4" />{generating ? "Generating..." : "Start Exam"}
          </button>
        </div>
      </motion.div>

      {dashboard?.weak_topics && dashboard.weak_topics.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <p className="text-sm font-semibold text-amber-800">Recommended Practice</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {dashboard.weak_topics.map((t) => (
              <button key={t} onClick={() => { setSelectedTopic(t); setSelectedMode("adaptive"); }}
                className="rounded-lg bg-white border border-amber-300 px-3 py-1.5 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-100">
                Review {t}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  if (view === "exam") return (
    <div className="mx-auto max-w-4xl space-y-4 p-6 lg:p-8">
      <div className="flex items-center justify-between rounded-2xl border border-surface-200 bg-white px-5 py-3 shadow-sm">
        <div className="flex items-center gap-4">
          <span className="text-sm font-semibold text-surface-700">Q {currentQ + 1}/{questions.length}</span>
          <div className="h-1.5 w-28 rounded-full bg-surface-200"><div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${(answered/questions.length)*100}%` }} /></div>
        </div>
        <div className="flex items-center gap-4">
          <span className={`text-sm font-mono font-semibold ${timeLeft < 60 ? "text-red-500" : "text-surface-600"}`}>{formatTime(timeLeft)}</span>
          <button onClick={submit} disabled={loading || answered === 0}
            className="rounded-lg bg-accent-600 px-4 py-2 text-xs font-semibold text-white hover:bg-accent-700 disabled:opacity-40">Submit</button>
        </div>
      </div>

      {questions[currentQ] && (
        <motion.div key={questions[currentQ].id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="rounded-2xl border border-surface-200 bg-white p-6 shadow-sm">
          <p className="mb-6 text-base font-medium leading-relaxed text-surface-800">{questions[currentQ].question}</p>
          <div className="space-y-3">
            {(["A","B","C","D"] as const).map((l) => {
              const q = questions[currentQ];
              const key = `option_${l.toLowerCase()}` as keyof Question;
              const sel = answers[q.id] === l;
              return (
                <button key={l} onClick={() => selectAnswer(q.id, l)}
                  className={`w-full rounded-xl border-2 px-5 py-4 text-left text-sm transition-all ${sel ? "border-brand-500 bg-brand-50 text-brand-800" : "border-surface-200 bg-white text-surface-700 hover:border-surface-300 hover:bg-surface-50"}`}>
                  <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full border-2 text-xs font-bold mr-3 ${sel ? "border-brand-500 bg-brand-500 text-white" : "border-surface-300 text-surface-400"}`}>{l}</span>
                  {q[key] as string}
                </button>
              );
            })}
          </div>
          <div className="mt-6 flex justify-between">
            <button onClick={() => setCurrentQ((c) => Math.max(0, c - 1))} disabled={currentQ === 0}
              className="rounded-lg border border-surface-200 px-4 py-2 text-sm text-surface-500 hover:bg-surface-50 disabled:opacity-30">Back</button>
            <span className="flex gap-1">{questions.map((_, i) => <div key={i} className={`h-1.5 w-1.5 rounded-full ${answers[questions[i]?.id] ? "bg-brand-500" : "bg-surface-200"}`} />)}</span>
            <button onClick={() => setCurrentQ((c) => Math.min(questions.length - 1, c + 1))} disabled={currentQ >= questions.length - 1}
              className="rounded-lg border border-surface-200 px-4 py-2 text-sm text-surface-500 hover:bg-surface-50 disabled:opacity-30">Next</button>
          </div>
        </motion.div>
      )}
    </div>
  );

  // view === "result"
  return (
    <div className="space-y-6 p-6 lg:p-8">
      {result && (
        <>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-surface-200 bg-white p-8 text-center shadow-sm">
            <div className={`mx-auto flex h-20 w-20 items-center justify-center rounded-2xl ${result.score >= 70 ? "bg-green-50" : result.score >= 50 ? "bg-amber-50" : "bg-red-50"}`}>
              {result.score >= 70 ? <Check className="h-10 w-10 text-green-600" /> : result.score >= 50 ? <Target className="h-10 w-10 text-amber-600" /> : <TrendingUp className="h-10 w-10 text-red-500" />}
            </div>
            <p className={`mt-4 text-4xl font-bold ${scoreColor(result.score)}`}>{result.score}%</p>
            <p className="mt-1 text-surface-500">{result.correct} of {result.total} correct</p>
            <div className="mt-4 flex justify-center gap-3">
              <button onClick={() => setView("dashboard")} className="rounded-xl border border-surface-200 px-5 py-2.5 text-sm font-medium text-surface-600 hover:bg-surface-50">Dashboard</button>
              <button onClick={generate} className="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-700">New Exam</button>
            </div>
          </motion.div>

          {result.topic_breakdown && Object.keys(result.topic_breakdown).length > 0 && (
            <div className="rounded-2xl border border-surface-200 bg-white p-5 shadow-sm">
              <h3 className="mb-3 text-sm font-semibold text-surface-700">Topic Performance</h3>
              <div className="grid gap-2 sm:grid-cols-2">
                {Object.entries(result.topic_breakdown).map(([t, p]) => (
                  <div key={t} className={`flex items-center justify-between rounded-xl border px-4 py-3 ${p.pct >= 70 ? "border-green-200 bg-green-50" : p.pct >= 40 ? "border-amber-200 bg-amber-50" : "border-red-200 bg-red-50"}`}>
                    <span className="text-sm font-medium text-surface-700 capitalize">{t}</span>
                    <span className={`text-sm font-bold ${p.pct >= 70 ? "text-green-700" : p.pct >= 40 ? "text-amber-700" : "text-red-700"}`}>{p.pct}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-3">
            {result.results.map((r, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                className={`rounded-2xl border-2 p-5 ${r.is_correct ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}>
                <div className="flex items-center gap-3 mb-2">
                  <span className={`rounded-full p-1 ${r.is_correct ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>{r.is_correct ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}</span>
                  <span className="text-sm font-medium text-surface-700">Your answer: {r.your_answer || "—"}</span>
                  {!r.is_correct && <span className="text-sm font-medium text-green-700">Correct: {r.correct_answer}</span>}
                </div>
                <div className="text-xs leading-relaxed text-surface-600 whitespace-pre-wrap">{r.explanation}</div>
              </motion.div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

async function getToken(): Promise<string | null> {
  try { const mod = await import("@/lib/auth"); return await mod.getAccessToken(); } catch { return null; }
}
