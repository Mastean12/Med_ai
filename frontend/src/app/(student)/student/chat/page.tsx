"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { studentChat, listDocuments } from "@/lib/api";

type Source = { chunk_index: number; preview: string; similarity?: number };
type Msg = { role: "user" | "assistant"; text: string; sources?: Source[] };
type DocRow = { id: string; title: string; status?: string };

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
    setErr("");
    setLoadingDocs(true);
    try {
      const res = await listDocuments();
      const docs = res.documents;
      setDocuments(docs);
      if (!documentId && docs.length > 0) setDocumentId(docs[0].id);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Failed to load documents");
    } finally {
      setLoadingDocs(false);
    }
  };

  useEffect(() => { if (user) loadDocs(); }, [user]);
  useEffect(() => { scrollToBottom(); }, [messages]);

  const send = async () => {
    setErr("");
    if (!user) return setErr("Please sign in to use the chat.");
    if (!documentId.trim()) return setErr("Select a document first.");
    if (question.trim().length < 2) return setErr("Type a question.");
    const q = question.trim();
    setQuestion("");
    setMessages((m) => [...m, { role: "user", text: q }]);
    setLoading(true);
    try {
      const res = await studentChat({ question: q, document_id: documentId.trim(), top_k: 5 });
      setMessages((m) => [...m, { role: "assistant", text: res.answer, sources: res.sources || [] }]);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Chat failed");
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return <div className="mx-auto max-w-4xl px-6 py-20"><div className="mx-auto h-8 w-48 animate-pulse rounded-xl bg-surface-200" /></div>;
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-20 text-center">
        <div className="mx-auto max-w-md rounded-2xl border border-surface-200 bg-white p-10 shadow-sm">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 text-3xl">🤖</div>
          <h1 className="text-2xl font-bold text-surface-900">AI Study Chat</h1>
          <p className="mt-2 text-surface-500">Sign in to chat with your notes.</p>
          <Link href="/login" className="mt-6 inline-flex rounded-xl bg-brand-600 px-6 py-3 text-sm font-semibold text-white hover:bg-brand-700">Sign in</Link>
        </div>
      </div>
    );
  }

  return (
    <main className="mx-auto flex h-[calc(100vh-65px)] max-w-5xl flex-col px-4 py-4">
      <div className="mb-4 shrink-0 flex flex-wrap items-center gap-3 rounded-2xl border border-surface-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-surface-500">📚</span>
          <select value={documentId} onChange={(e) => setDocumentId(e.target.value)} className="rounded-xl border border-surface-200 bg-surface-50 px-3 py-2 text-sm text-surface-700 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/20">
            <option value="">Select document</option>
            {documents.map((d) => <option key={d.id} value={d.id}>{d.title}</option>)}
          </select>
        </div>
        <button onClick={loadDocs} disabled={loadingDocs} className="rounded-lg border border-surface-200 px-3 py-2 text-xs font-medium text-surface-500 transition-colors hover:bg-surface-50 disabled:opacity-50">
          {loadingDocs ? "Loading..." : "Reload"}
        </button>
        {documentId && <span className="text-xs text-surface-400">{documents.find((d) => d.id === documentId)?.title}</span>}
      </div>

      <div className="flex-1 overflow-y-auto rounded-2xl border border-surface-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 p-4">
          {messages.length === 0 && (
            <div className="flex flex-1 flex-col items-center justify-center py-20 text-center">
              <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-brand-50 text-4xl">🤖</div>
              <h2 className="text-xl font-semibold text-surface-800">Ask anything about your notes</h2>
              <p className="mt-2 max-w-sm text-sm text-surface-500">Select a document above, then ask a question about its content.</p>
              {documents.length === 0 && (
                <Link href="/student/upload" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-700">
                  Upload your first PDF
                </Link>
              )}
            </div>
          )}

          {messages.map((m, idx) => (
            <div key={idx} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"} animate-fade-in`}>
              {m.role === "user" ? (
                <div className="max-w-[75%] rounded-2xl rounded-br-md bg-brand-600 px-5 py-3 text-sm leading-relaxed text-white shadow-sm">
                  {m.text}
                </div>
              ) : (
                <div className="max-w-[85%]">
                  <div className="rounded-2xl rounded-bl-md border border-surface-200 bg-surface-50 px-5 py-4 text-sm leading-relaxed text-surface-800 shadow-sm">
                    <p className="whitespace-pre-wrap">{m.text}</p>
                  </div>

                  {m.sources && m.sources.length > 0 && (
                    <details className="mt-2 group">
                      <summary className="cursor-pointer text-xs font-medium text-surface-400 transition-colors hover:text-brand-500 select-none">
                        📎 {m.sources.length} source reference{m.sources.length > 1 ? "s" : ""}
                      </summary>
                      <div className="mt-2 space-y-2">
                        {m.sources.map((s, i) => (
                          <div key={i} className="rounded-xl border border-surface-100 bg-white p-3 text-xs leading-relaxed text-surface-600">
                            <p>{s.preview}</p>
                          </div>
                        ))}
                      </div>
                    </details>
                  )}
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex justify-start animate-fade-in">
              <div className="flex items-center gap-2 rounded-2xl rounded-bl-md border border-surface-200 bg-surface-50 px-5 py-4 shadow-sm">
                <div className="flex gap-1">
                  <span className="h-2 w-2 animate-pulse-soft rounded-full bg-brand-400" style={{ animationDelay: "0ms" }} />
                  <span className="h-2 w-2 animate-pulse-soft rounded-full bg-brand-400" style={{ animationDelay: "150ms" }} />
                  <span className="h-2 w-2 animate-pulse-soft rounded-full bg-brand-400" style={{ animationDelay: "300ms" }} />
                </div>
                <span className="text-xs text-surface-400">Searching your notes...</span>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      <div className="mt-3 shrink-0 flex gap-2">
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask a question about your notes..."
          className="flex-1 rounded-2xl border border-surface-200 bg-white px-5 py-3.5 text-sm text-surface-800 placeholder-surface-400 shadow-sm transition-colors focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/20"
          onKeyDown={(e) => { if (e.key === "Enter" && !loading) send(); }}
        />
        <button onClick={send} disabled={loading || !question.trim()} className="rounded-2xl bg-brand-600 px-6 py-3.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-40">
          {loading ? "..." : "Send"}
        </button>
      </div>

      {err && <p className="mt-2 text-xs text-red-500">{err}</p>}
    </main>
  );
}
