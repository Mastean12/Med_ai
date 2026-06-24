"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { studentChat, listDocuments } from "@/lib/api";
import { MessageSquare, Send, FileText, ChevronDown, ChevronRight, BookOpen, Brain, Sparkles, ExternalLink } from "lucide-react";
import ResponseCard from "@/components/ResponseCard";

type Source = { chunk_index: number; preview: string; similarity?: number };
type Msg = { role: "user" | "assistant"; text: string; sources?: Source[]; response_badge?: string; confidence?: number; related_questions?: string[]; formatted_sections?: any[] };
type DocRow = { id: string; title: string; status?: string };

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:8000";

export default function StudentChatPage() {
  const { user, loading: authLoading } = useAuth();
  const bottomRef = useRef<HTMLDivElement>(null);

  const [documents, setDocuments] = useState<DocRow[]>([]);
  const [documentId, setDocumentId] = useState("");
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [err, setErr] = useState("");

  const scrollToBottom = () => bottomRef.current?.scrollIntoView({ behavior: "smooth" });

  const loadDocs = async () => {
    if (!user) return;
    setErr(""); setLoadingDocs(true);
    try {
      const res = await listDocuments();
      const docs = res.documents;
      setDocuments(docs);
      if (!documentId && docs.length > 0) setDocumentId(docs[0].id);
    } catch (e: unknown) { setErr(e instanceof Error ? e.message : "Failed"); }
    finally { setLoadingDocs(false); }
  };

  useEffect(() => { if (user) loadDocs(); }, [user]);
  useEffect(() => { scrollToBottom(); }, [messages]);

  const send = async () => {
    setErr("");
    if (!user) return setErr("Please sign in.");
    if (!documentId.trim()) return setErr("Select a document first.");
    if (question.trim().length < 2) return setErr("Type a question.");
    const q = question.trim();
    setQuestion("");
    setMessages((m) => [...m, { role: "user", text: q }]);
    setLoading(true);
    try {
      const token = await getToken();
      const res = await fetch(`${BACKEND}/student/chat`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ question: q, document_id: documentId.trim(), top_k: 5 }),
      });
      const data = await res.json();
      setMessages((m) => [...m, {
        role: "assistant",
        text: data.answer,
        sources: data.sources || [],
        response_badge: data.response_badge,
        confidence: data.confidence,
        related_questions: data.related_questions,
        formatted_sections: data.formatted_sections,
      }]);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Chat failed");
    } finally { setLoading(false); }
  };

  const askRelated = (q: string) => {
    setQuestion(q);
    setTimeout(() => send(), 50);
  };

  if (authLoading) return <div className="mx-auto max-w-4xl px-6 py-20"><div className="mx-auto h-8 w-48 animate-shimmer rounded-xl" /></div>;
  if (!user) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-20 text-center">
        <div className="mx-auto max-w-md rounded-2xl border border-surface-200 bg-white p-10 shadow-sm">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50"><BookOpen className="h-8 w-8 text-brand-600" /></div>
          <h1 className="text-2xl font-bold text-surface-900">AI Study Chat</h1>
          <p className="mt-2 text-surface-500">Sign in to chat with your notes.</p>
          <Link href="/login" className="mt-6 inline-flex rounded-xl bg-brand-600 px-6 py-3 text-sm font-semibold text-white hover:bg-brand-700">Sign in</Link>
        </div>
      </div>
    );
  }

  const badgeColors: Record<string, string> = {
    "From Your Notes": "bg-green-50 text-green-700 border-green-200",
    "Hybrid Explanation": "bg-amber-50 text-amber-700 border-amber-200",
    "AI Medical Knowledge": "bg-brand-50 text-brand-700 border-brand-200",
  };

  return (
    <main className="mx-auto flex h-[calc(100vh-65px)] max-w-5xl flex-col px-4 py-4">
      <div className="mb-4 shrink-0 flex flex-wrap items-center gap-3 rounded-2xl border border-surface-200 bg-white px-4 py-3 shadow-sm">
        <span className="text-sm font-medium text-surface-500"><FileText className="inline h-4 w-4 mr-1" /></span>
        <select value={documentId} onChange={(e) => setDocumentId(e.target.value)} className="rounded-xl border border-surface-200 bg-surface-50 px-3 py-2 text-sm text-surface-700">
          <option value="">Select document</option>
          {documents.map((d) => <option key={d.id} value={d.id}>{d.title}</option>)}
        </select>
        <button onClick={loadDocs} disabled={loadingDocs} className="rounded-lg border border-surface-200 px-3 py-2 text-xs font-medium text-surface-500 hover:bg-surface-50 disabled:opacity-50">
          {loadingDocs ? "..." : "Reload"}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto rounded-2xl border border-surface-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 p-4">
          {messages.length === 0 && (
            <div className="flex flex-1 flex-col items-center justify-center py-20 text-center">
              <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-brand-50"><MessageSquare className="h-10 w-10 text-brand-600" /></div>
              <h2 className="text-xl font-semibold text-surface-800">Ask about your notes</h2>
              <p className="mt-2 max-w-sm text-sm text-surface-500">Select a document above, then ask a question about its content.</p>
              {documents.length === 0 && (
                <Link href="/student/upload" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-700">Upload your first PDF</Link>
              )}
            </div>
          )}

          {messages.map((m, idx) => (
            <motion.div key={idx} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              {m.role === "user" ? (
                <div className="max-w-[75%] rounded-2xl rounded-br-md bg-brand-600 px-5 py-3 text-sm leading-relaxed text-white shadow-sm">{m.text}</div>
              ) : (
                <div className="max-w-[90%]">
                  <div className="rounded-2xl rounded-bl-md border border-surface-200 bg-white px-6 py-5 shadow-sm">

                    {m.response_badge && (
                      <div className={`mb-3 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${badgeColors[m.response_badge] || "bg-surface-50 text-surface-500 border-surface-200"}`}>
                        {m.response_badge === "From Your Notes" ? <BookOpen className="h-3 w-3" /> : m.response_badge === "Hybrid Explanation" ? <Brain className="h-3 w-3" /> : <Sparkles className="h-3 w-3" />}
                        {m.response_badge}
                      </div>
                    )}

                    <ResponseCard content={m.text} formattedSections={m.formatted_sections} />

                    {m.sources && m.sources.length > 0 && (
                      <details className="mt-4 group">
                        <summary className="cursor-pointer text-xs font-medium text-surface-400 hover:text-brand-500 select-none inline-flex items-center gap-1">
                          <ExternalLink className="h-3 w-3" /> {m.sources.length} source reference{m.sources.length > 1 ? "s" : ""}
                        </summary>
                        <div className="mt-3 space-y-2">
                          {m.sources.map((s, i) => (
                            <div key={i} className="rounded-xl border border-surface-100 bg-surface-50 p-3 text-xs leading-relaxed text-surface-600">
                              <p>{s.preview}</p>
                            </div>
                          ))}
                        </div>
                      </details>
                    )}

                    {m.related_questions && m.related_questions.length > 0 && (
                      <div className="mt-4 border-t border-surface-100 pt-4">
                        <p className="mb-2 text-xs font-semibold text-surface-400 uppercase tracking-wide">Related Questions</p>
                        <div className="flex flex-wrap gap-2">
                          {m.related_questions.map((q, i) => (
                            <button key={i} onClick={() => askRelated(q)} className="rounded-full border border-surface-200 bg-white px-3 py-1.5 text-xs text-surface-500 transition-all hover:border-brand-300 hover:text-brand-600 hover:shadow-sm">{q}</button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          ))}

          {loading && (
            <div className="flex justify-start animate-fade-in">
              <div className="flex items-center gap-2 rounded-2xl rounded-bl-md border border-surface-200 bg-surface-50 px-5 py-4">
                <span className="flex gap-1"><span className="h-2 w-2 animate-pulse rounded-full bg-brand-400" /><span className="h-2 w-2 animate-pulse rounded-full bg-brand-400" style={{ animationDelay: "150ms" }} /><span className="h-2 w-2 animate-pulse rounded-full bg-brand-400" style={{ animationDelay: "300ms" }} /></span>
                <span className="text-xs text-surface-400">Searching your notes...</span>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      <div className="mt-3 shrink-0 flex gap-2">
        <input value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Ask a question about your notes..."
          className="flex-1 rounded-2xl border border-surface-200 bg-white px-5 py-3.5 text-sm text-surface-800 placeholder-surface-400 shadow-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/20"
          onKeyDown={(e) => { if (e.key === "Enter" && !loading) send(); }} />
        <button onClick={send} disabled={loading || !question.trim()} className="rounded-2xl bg-brand-600 px-6 py-3.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 disabled:opacity-40">
          {loading ? "..." : <Send className="h-4 w-4" />}
        </button>
      </div>
      {err && <p className="mt-2 text-xs text-red-500">{err}</p>}
    </main>
  );
}

async function getToken(): Promise<string | null> {
  try { const mod = await import("@/lib/auth"); return await mod.getAccessToken(); } catch { return null; }
}
