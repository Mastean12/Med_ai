"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import {
  Brain, Send, Plus, Trash2, MessageSquare,
  BookOpen, PenTool, Stethoscope,
  Zap, HelpCircle, ChevronDown,
  FileText, X, PanelLeft, PanelRight,
} from "lucide-react";
import { API_BASE_URL } from "@/lib/apiClient";
import ResponseCard from "@/components/ResponseCard";

type Session = { id: string; title: string; mode: string; created_at: string; updated_at: string };
type Message = { role: string; content: string; formatted_sections?: any[] };
type Mode = { id: string; label: string; description: string };
type DocRow = { id: string; title: string };

const MODE_ICONS: Record<string, typeof Brain> = {
  beginner: BookOpen,
  exam: PenTool,
  clinical: Stethoscope,
  rapid_review: Zap,
  socratic: HelpCircle,
};

const MODE_COLORS: Record<string, string> = {
  beginner: "bg-blue-50 text-blue-700 border-blue-200",
  exam: "bg-brand-50 text-brand-700 border-brand-200",
  clinical: "bg-accent-50 text-accent-700 border-accent-200",
  rapid_review: "bg-amber-50 text-amber-700 border-amber-200",
  socratic: "bg-purple-50 text-purple-700 border-purple-200",
};

export default function TutorPage() {
  const { user, loading: authLoading } = useAuth();
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [documents, setDocuments] = useState<DocRow[]>([]);
  const [documentId, setDocumentId] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mode, setMode] = useState("beginner");
  const [modes, setModes] = useState<Mode[]>([]);
  const [modeMenuOpen, setModeMenuOpen] = useState(false);

  const activeMode = modes.find((m) => m.id === mode);
  const ModeIcon = MODE_ICONS[mode] || Brain;

  const loadModes = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/tutor/modes`);
      if (res.ok) setModes((await res.json()).modes || []);
    } catch {}
  }, []);

  const loadSessions = useCallback(async () => {
    const token = await getToken();
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/tutor/sessions`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setSessions((await res.json()).sessions || []);
    } catch {}
  }, []);

  const loadSession = useCallback(async (sid: string) => {
    const token = await getToken();
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/tutor/session/${sid}`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
        setSessionId(sid);
        if (data.session?.mode) setMode(data.session.mode);
      }
    } catch {}
  }, []);

  const loadDocuments = useCallback(async () => {
    const token = await getToken();
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/documents`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setDocuments((await res.json()).documents || []);
    } catch {}
  }, []);

  useEffect(() => { loadModes(); }, [loadModes]);
  useEffect(() => { if (user) { loadSessions(); loadDocuments(); } }, [user, loadSessions, loadDocuments]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const msg = input.trim();
    setInput("");
    setMessages((m) => [...m, { role: "user", content: msg }]);
    setLoading(true);
    setStreaming(true);

    try {
      const token = await getToken();
      const res = await fetch(`${API_BASE_URL}/tutor/chat`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg, session_id: sessionId, mode, document_id: documentId || undefined, stream: true }),
      });

      if (!res.ok) throw new Error("Failed");

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No stream");

      let fullResponse = "";
      let streamSessionId: string | null = null;
      const decoder = new TextDecoder();
      setMessages((m) => [...m, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");
        for (const line of lines) {
          if (line.startsWith("data: ") && line !== "data: [DONE]") {
            const text = line.slice(6);

            if (text.startsWith("__SECTIONS__:")) {
              const sectionsJson = text.slice("__SECTIONS__:".length);
              try {
                const sections = JSON.parse(sectionsJson);
                setMessages((m) => {
                  const copy = [...m];
                  const last = copy[copy.length - 1];
                  if (last?.role === "assistant") {
                    last.formatted_sections = sections;
                  }
                  return [...copy];
                });
              } catch { /* ignore parse errors */ }
              continue;
            }

            if (text.startsWith("__SESSION_ID__:")) {
              streamSessionId = text.slice("__SESSION_ID__:".length);
              setSessionId(streamSessionId);
              continue;
            }

            fullResponse += text;
            setMessages((m) => {
              const copy = [...m];
              const last = copy[copy.length - 1];
              if (last?.role === "assistant") {
                last.content = fullResponse;
              }
              return [...copy];
            });
          }
        }
      }

      if (streamSessionId) {
        loadSessions();
      }
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: "Sorry, something went wrong. Please try again." }]);
    } finally {
      setLoading(false);
      setStreaming(false);
    }
  };

  const newSession = () => { setSessionId(null); setMessages([]); inputRef.current?.focus(); };
  const deleteSession = async (sid: string) => {
    const token = await getToken();
    if (!token) return;
    try {
      await fetch(`${API_BASE_URL}/tutor/session/${sid}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      setSessions((s) => s.filter((s) => s.id !== sid));
      if (sessionId === sid) newSession();
    } catch {}
  };

  if (authLoading) {
    return <div className="flex h-full items-center justify-center"><div className="h-8 w-48 animate-shimmer rounded-xl" /></div>;
  }

  if (!user) {
    return (
      <div className="flex min-h-full items-center justify-center p-8">
        <div className="w-full max-w-sm rounded-2xl border border-surface-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-50 to-brand-100">
            <Brain className="h-7 w-7 text-brand-600" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-surface-900">AI Medical Tutor</h1>
          <p className="mt-2 text-sm text-surface-500">Sign in to start learning with your personal AI tutor.</p>
          <Link href="/login" className="mt-6 inline-flex rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-brand-700">
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-0px)]">
      {sidebarOpen && (
        <aside className="w-72 shrink-0 border-r border-surface-200 bg-white flex flex-col">
          <div className="border-b border-surface-200 px-4 py-3 flex items-center justify-between">
            <button onClick={newSession} className="flex items-center gap-2 rounded-lg bg-brand-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:bg-brand-700">
              <Plus className="h-3.5 w-3.5" /> New Session
            </button>
            <button onClick={() => setSidebarOpen(false)} className="rounded-lg p-1.5 text-surface-400 hover:bg-surface-100 transition-colors" title="Close sidebar">
              <PanelLeft className="h-4 w-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {sessions.map((s) => (
              <div key={s.id} className="group flex items-center gap-1">
                <button
                  onClick={() => loadSession(s.id)}
                  className={`flex-1 truncate rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                    sessionId === s.id ? "bg-brand-50 text-brand-700 font-medium" : "text-surface-600 hover:bg-surface-50"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{s.title || "New Session"}</span>
                  </div>
                </button>
                <button
                  onClick={() => deleteSession(s.id)}
                  className="rounded-lg p-1 text-surface-300 opacity-0 transition-all hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
                  title="Delete"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            {!sessions.length && <p className="px-3 py-4 text-xs text-surface-400 text-center">No sessions yet.</p>}
          </div>
          {documents.length > 0 && (
            <div className="border-t border-surface-200 px-4 py-3">
              <select value={documentId} onChange={(e) => setDocumentId(e.target.value)}
                className="w-full rounded-lg border border-surface-200 bg-surface-50 px-3 py-2 text-xs text-surface-600">
                <option value="">No document context</option>
                {documents.map((d) => <option key={d.id} value={d.id}>{d.title}</option>)}
              </select>
            </div>
          )}
        </aside>
      )}

      <div className="flex-1 flex flex-col min-w-0 bg-surface-50">
        <div className="flex items-center gap-3 border-b border-surface-200 bg-white px-4 py-2.5 shrink-0">
          {!sidebarOpen && (
            <button onClick={() => setSidebarOpen(true)} className="rounded-lg p-1.5 text-surface-400 hover:bg-surface-100 transition-colors" title="Open sidebar">
              <PanelRight className="h-4 w-4" />
            </button>
          )}

          <div className="relative">
            <button
              onClick={() => setModeMenuOpen(!modeMenuOpen)}
              className="flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-surface-50"
            >
              <ModeIcon className="h-3.5 w-3.5" />
              <span>{activeMode?.label || "Beginner"}</span>
              <ChevronDown className="h-3 w-3 text-surface-400" />
            </button>

            <AnimatePresence>
              {modeMenuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setModeMenuOpen(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.15 }}
                    className="absolute left-0 top-full z-20 mt-1 w-64 rounded-xl border border-surface-200 bg-white shadow-lg p-2"
                  >
                    {modes.map((m) => {
                      const Icon = MODE_ICONS[m.id] || Brain;
                      return (
                        <button
                          key={m.id}
                          onClick={() => { setMode(m.id); setModeMenuOpen(false); }}
                          className={`flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${
                            mode === m.id ? "bg-brand-50" : "hover:bg-surface-50"
                          }`}
                        >
                          <Icon className={`h-4 w-4 shrink-0 mt-0.5 ${mode === m.id ? "text-brand-600" : "text-surface-400"}`} />
                          <div>
                            <p className={`text-sm font-medium ${mode === m.id ? "text-brand-700" : "text-surface-700"}`}>{m.label}</p>
                            <p className="text-xs text-surface-400 leading-relaxed">{m.description}</p>
                          </div>
                        </button>
                      );
                    })}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          <span className="ml-auto text-xs text-surface-400">
            {sessionId ? sessions.find((s) => s.id === sessionId)?.title || "" : ""}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-3xl px-4 py-6 space-y-6">
            {messages.length === 0 && (
              <div className="py-16 text-center">
                <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-brand-50 to-brand-100">
                  <Brain className="h-10 w-10 text-brand-600" />
                </div>
                <h2 className="text-xl font-semibold text-surface-800">Your AI Medical Tutor</h2>
                <p className="mt-2 text-sm text-surface-500 max-w-md mx-auto">
                  Select a mode above, then ask me anything about medicine — from basic physiology to exam-focused revision.
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-2">
                  {[
                    "Explain hypokalaemia step by step",
                    "What are the ECG changes in hyperkalaemia?",
                    "Differential diagnosis for chest pain",
                    "Management of DKA",
                  ].map((q) => (
                    <button
                      key={q}
                      onClick={() => { setInput(q); inputRef.current?.focus(); }}
                      className="rounded-full border border-surface-200 bg-white px-4 py-2 text-xs text-surface-500 transition-all hover:border-brand-300 hover:text-brand-600 hover:shadow-sm"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {m.role === "user" ? (
                  <div className="max-w-[80%] rounded-2xl rounded-br-md bg-brand-600 px-5 py-3 text-sm leading-relaxed text-white shadow-sm">
                    {m.content}
                  </div>
                ) : (
                  <div className="max-w-[85%]">
                    <div className="rounded-2xl rounded-bl-md border border-surface-200 bg-white px-6 py-5 shadow-sm">
                      <ResponseCard content={m.content} formattedSections={m.formatted_sections} />
                    </div>
                    {m.content === "" && streaming && (
                      <div className="flex items-center gap-2 ml-4 mt-2">
                        <span className="flex gap-1">
                          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-400" />
                          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-400" style={{ animationDelay: "150ms" }} />
                          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-400" style={{ animationDelay: "300ms" }} />
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            ))}

            {loading && !streaming && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-2xl rounded-bl-md border border-surface-200 bg-white px-5 py-4 shadow-sm">
                  <span className="flex gap-1">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-brand-400" />
                    <span className="h-2 w-2 animate-pulse rounded-full bg-brand-400" style={{ animationDelay: "150ms" }} />
                    <span className="h-2 w-2 animate-pulse rounded-full bg-brand-400" style={{ animationDelay: "300ms" }} />
                  </span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        </div>

        <div className="border-t border-surface-200 bg-white px-4 py-3 shrink-0">
          <div className="mx-auto max-w-3xl flex gap-2">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`Ask in ${activeMode?.label?.toLowerCase() || "beginner"} mode...`}
              className="flex-1 rounded-xl border border-surface-200 bg-surface-50 px-4 py-3 text-sm text-surface-800 placeholder-surface-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/20 transition-shadow"
              onKeyDown={(e) => { if (e.key === "Enter" && !loading && input.trim()) send(); }}
              disabled={loading}
            />
            <button
              onClick={send}
              disabled={loading || !input.trim()}
              className="rounded-xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-brand-700 disabled:opacity-40 flex items-center gap-2"
            >
              {loading ? <span className="flex gap-1"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white/60" /><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white/60" style={{ animationDelay: "150ms" }} /></span> : <Send className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

async function getToken(): Promise<string | null> {
  try { const mod = await import("@/lib/auth"); return await mod.getAccessToken(); } catch { return null; }
}
