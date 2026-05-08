"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:8000";

type Session = { id: string; title: string; created_at: string; updated_at: string };
type Message = { role: string; content: string };
type DocRow = { id: string; title: string };

export default function TutorPage() {
  const { user, loading: authLoading } = useAuth();
  const bottomRef = useRef<HTMLDivElement>(null);

  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [documents, setDocuments] = useState<DocRow[]>([]);
  const [documentId, setDocumentId] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const loadSessions = useCallback(async () => {
    const token = await getToken();
    if (!token) return;
    try {
      const res = await fetch(`${BACKEND}/tutor/sessions`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions || []);
      }
    } catch {}
  }, []);

  const loadSession = useCallback(async (sid: string) => {
    const token = await getToken();
    if (!token) return;
    try {
      const res = await fetch(`${BACKEND}/tutor/session/${sid}`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
        setSessionId(sid);
      }
    } catch {}
  }, []);

  const loadDocuments = useCallback(async () => {
    const token = await getToken();
    if (!token) return;
    try {
      const res = await fetch(`${BACKEND}/documents`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setDocuments(data.documents || []);
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (user) { loadSessions(); loadDocuments(); }
  }, [user, loadSessions, loadDocuments]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = async () => {
    if (!input.trim()) return;
    const msg = input.trim();
    setInput("");
    setMessages((m) => [...m, { role: "user", content: msg }]);
    setLoading(true);

    try {
      const token = await getToken();
      const res = await fetch(`${BACKEND}/tutor/chat`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg, session_id: sessionId, document_id: documentId || undefined }),
      });
      const data = await res.json();
      if (data.message) {
        setMessages((m) => [...m, data.message]);
        if (!sessionId) {
          setSessionId(data.session_id);
          loadSessions();
        }
      }
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: "Sorry, something went wrong. Please try again." }]);
    } finally { setLoading(false); }
  };

  const newSession = () => { setSessionId(null); setMessages([]); };

  const deleteSession = async (sid: string) => {
    const token = await getToken();
    if (!token) return;
    try {
      await fetch(`${BACKEND}/tutor/session/${sid}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      setSessions((s) => s.filter((s) => s.id !== sid));
      if (sessionId === sid) { newSession(); }
    } catch {}
  };

  if (authLoading) {
    return <main className="mx-auto max-w-6xl px-6 py-20"><div className="mx-auto h-8 w-48 animate-pulse rounded-xl bg-surface-200" /></main>;
  }

  if (!user) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-20 text-center">
        <div className="rounded-2xl border border-surface-200 bg-white p-10 shadow-sm">
          <span className="text-4xl">🧠</span>
          <h1 className="mt-4 text-2xl font-bold text-surface-900">AI Medical Tutor</h1>
          <p className="mt-2 text-surface-500">Sign in to start learning with your personal AI tutor.</p>
          <Link href="/login" className="mt-6 inline-flex rounded-xl bg-brand-600 px-6 py-3 text-sm font-semibold text-white hover:bg-brand-700">Sign in</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex h-[calc(100vh-65px)]">
      {sidebarOpen && (
        <aside className="w-72 shrink-0 border-r border-surface-200 bg-white flex flex-col">
          <div className="border-b border-surface-200 px-4 py-3 flex items-center justify-between">
            <span className="text-sm font-semibold text-surface-700">Sessions</span>
            <div className="flex gap-1">
              <button onClick={newSession} className="rounded-lg p-1.5 text-surface-400 hover:bg-surface-100 hover:text-brand-600 transition-colors" title="New session">＋</button>
              <button onClick={() => setSidebarOpen(false)} className="rounded-lg p-1.5 text-surface-400 hover:bg-surface-100 transition-colors md:hidden" title="Close sidebar">✕</button>
            </div>
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
                  {s.title || "New Session"}
                </button>
                <button
                  onClick={() => deleteSession(s.id)}
                  className="rounded-lg p-1 text-surface-300 opacity-0 transition-all hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
                  title="Delete"
                >
                  🗑
                </button>
              </div>
            ))}
            {!sessions.length && <p className="px-3 py-4 text-xs text-surface-400 text-center">No sessions yet. Start a conversation!</p>}
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

      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center gap-3 border-b border-surface-200 bg-white px-4 py-3">
          {!sidebarOpen && (
            <button onClick={() => setSidebarOpen(true)} className="rounded-lg p-1.5 text-surface-400 hover:bg-surface-100 transition-colors" title="Open sidebar">☰</button>
          )}
          <span className="text-sm font-semibold text-surface-700 truncate">
            {sessionId ? sessions.find((s) => s.id === sessionId)?.title || "Chat" : "New Session"}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto bg-white">
          <div className="mx-auto max-w-3xl px-4 py-6 space-y-6">
            {messages.length === 0 && (
              <div className="py-16 text-center">
                <span className="text-5xl">🧠</span>
                <h2 className="mt-4 text-xl font-semibold text-surface-800">Your AI Medical Tutor</h2>
                <p className="mt-2 text-sm text-surface-500">Ask me anything about medicine, physiology, pharmacology, pathology...</p>
                <div className="mt-6 flex flex-wrap justify-center gap-2">
                  {["Explain hypokalaemia", "What causes a heart attack?", "How does the kidney work?", "Treatment for pneumonia"].map((q) => (
                    <button key={q} onClick={() => { setInput(q); }} className="rounded-full border border-surface-200 px-4 py-1.5 text-xs text-surface-500 transition-colors hover:border-brand-300 hover:text-brand-600">{q}</button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"} animate-fade-in`}>
                {m.role === "user" ? (
                  <div className="max-w-[80%] rounded-2xl rounded-br-md bg-brand-600 px-5 py-3 text-sm leading-relaxed text-white">{m.content}</div>
                ) : (
                  <div className="max-w-[85%] rounded-2xl rounded-bl-md border border-surface-200 bg-surface-50 px-5 py-4 text-sm leading-relaxed text-surface-800 shadow-sm">
                    <p className="whitespace-pre-wrap">{m.content}</p>
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex justify-start animate-fade-in">
                <div className="flex items-center gap-2 rounded-2xl rounded-bl-md border border-surface-200 bg-surface-50 px-5 py-4">
                  <span className="flex gap-1">
                    <span className="h-2 w-2 animate-pulse-soft rounded-full bg-brand-400" />
                    <span className="h-2 w-2 animate-pulse-soft rounded-full bg-brand-400" style={{ animationDelay: "150ms" }} />
                    <span className="h-2 w-2 animate-pulse-soft rounded-full bg-brand-400" style={{ animationDelay: "300ms" }} />
                  </span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        </div>

        <div className="border-t border-surface-200 bg-white px-4 py-3">
          <div className="mx-auto max-w-3xl flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask your AI tutor anything..."
              className="flex-1 rounded-xl border border-surface-200 bg-surface-50 px-4 py-3 text-sm text-surface-800 placeholder-surface-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/20"
              onKeyDown={(e) => { if (e.key === "Enter" && !loading && input.trim()) send(); }}
            />
            <button
              onClick={send}
              disabled={loading || !input.trim()}
              className="rounded-xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-brand-700 disabled:opacity-40"
            >
              {loading ? "..." : "Send"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

async function getToken(): Promise<string | null> {
  try { const mod = await import("@/lib/auth"); return await mod.getAccessToken(); } catch { return null; }
}
