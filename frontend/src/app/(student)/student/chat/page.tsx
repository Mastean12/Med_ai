"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import { studentChat } from "@/lib/api";
import { getToken, setToken, clearToken } from "@/lib/auth";

type Source = {
  chunk_index: number;
  preview: string;
  similarity?: number;
};

type Msg = {
  role: "user" | "assistant";
  text: string;
  sources?: Source[];
};

type DocRow = {
  id: string;
  title: string;
  status?: string;
  created_at?: string;
};

const BACKEND_URL = "http://127.0.0.1:8000";

async function fetchDocuments(token: string): Promise<DocRow[]> {
  const res = await fetch(`${BACKEND_URL}/documents`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Failed to load documents (${res.status})`);
  }

  const data = await res.json();
  return (data?.documents || []) as DocRow[];
}

export default function StudentChatPage() {
  const [token, setTokenInput] = useState(getToken() || "");
  const [documents, setDocuments] = useState<DocRow[]>([]);
  const [documentId, setDocumentId] = useState("");

  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [err, setErr] = useState("");

  const loadDocs = async (tok?: string) => {
    const t = (tok ?? getToken() ?? "").trim();
    if (!t) {
      setErr("Paste and save your token first.");
      return;
    }

    setErr("");
    setLoadingDocs(true);

    try {
      const docs = await fetchDocuments(t);
      setDocuments(docs);

      if (!documentId && docs.length > 0) {
        setDocumentId(docs[0].id);
      }
    } catch (e: any) {
      setErr(e?.message || "Failed to load documents");
    } finally {
      setLoadingDocs(false);
    }
  };

  const saveTokenHandler = async () => {
    const t = token.trim();

    if (!t) {
      clearToken();
      setDocuments([]);
      setDocumentId("");
      setErr("Token cleared.");
      return;
    }

    setToken(t);
    setErr("Token saved.");
    await loadDocs(t);
  };

  useEffect(() => {
    const t = (getToken() || "").trim();
    if (t) loadDocs(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const send = async () => {
    setErr("");

    const t = (getToken() || "").trim();
    if (!t) return setErr("Save your token first.");
    if (!documentId.trim()) return setErr("Select a document first.");
    if (question.trim().length < 2) {
      return setErr("Type a question (at least 2 characters).");
    }

    const q = question.trim();
    setQuestion("");
    setMessages((m) => [...m, { role: "user", text: q }]);
    setLoading(true);

    try {
      const res = await studentChat({
        question: q,
        document_id: documentId.trim(),
        top_k: 5,
      });

      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          text: res.answer,
          sources: res.sources || [],
        },
      ]);
    } catch (e: any) {
      setErr(e?.message || "Chat failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Navbar />

      <main className="mx-auto max-w-4xl px-4 py-10">
        <h1 className="text-2xl font-bold">Student Chat</h1>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border bg-white p-4 shadow-sm">
            <h2 className="font-semibold">Access Token (temporary)</h2>
            <p className="mt-1 text-sm text-gray-600">
              Paste your Supabase access token (Bearer token).
            </p>

            <div className="mt-3 flex gap-2">
              <input
                value={token}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder="eyJhbGciOi..."
                className="w-full rounded-xl border px-3 py-2 text-sm"
              />
              <button
                onClick={saveTokenHandler}
                className="rounded-xl bg-black px-4 py-2 text-sm text-white"
              >
                Save
              </button>
            </div>

            <div className="mt-3 flex gap-2">
              <button
                onClick={() => loadDocs()}
                disabled={loadingDocs}
                className="rounded-xl border px-4 py-2 text-sm disabled:opacity-50"
              >
                {loadingDocs ? "Loading..." : "Load documents"}
              </button>
              <button
                onClick={() => {
                  clearToken();
                  setTokenInput("");
                  setDocuments([]);
                  setDocumentId("");
                  setMessages([]);
                  setErr("Token cleared.");
                }}
                className="rounded-xl border px-4 py-2 text-sm"
              >
                Clear
              </button>
            </div>
          </div>

          <div className="rounded-2xl border bg-white p-4 shadow-sm">
            <h2 className="font-semibold">Choose Document</h2>
            <p className="mt-1 text-sm text-gray-600">
              Select one of your uploaded PDFs (from your account).
            </p>

            <select
              value={documentId}
              onChange={(e) => setDocumentId(e.target.value)}
              className="mt-3 w-full rounded-xl border px-3 py-2 text-sm"
            >
              <option value="">-- select document --</option>
              {documents.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.title} {d.status ? `(${d.status})` : ""}
                </option>
              ))}
            </select>

            {documents.length === 0 && (
              <p className="mt-3 text-sm text-gray-600">
                No documents found yet. Upload a PDF first, then click "Load documents".
              </p>
            )}

            {documentId && (
              <p className="mt-3 break-all text-xs text-gray-500">
                Selected: {documentId}
              </p>
            )}
          </div>
        </div>

        <div className="mt-6 rounded-2xl border bg-white p-4 shadow-sm">
          <div className="h-[420px] overflow-auto rounded-xl border bg-gray-50 p-3">
            {messages.length === 0 && (
              <p className="text-sm text-gray-600">Ask a question to begin...</p>
            )}

            <div className="space-y-4">
              {messages.map((m, idx) => (
                <div
                  key={idx}
                  className={m.role === "user" ? "text-right" : "text-left"}
                >
                  {m.role === "user" ? (
                    <div className="inline-block max-w-[80%] rounded-2xl bg-blue-600 px-4 py-2 text-sm text-white">
                      {m.text}
                    </div>
                  ) : (
                    <div className="inline-block max-w-[90%] rounded-2xl border bg-white px-4 py-3 text-sm text-gray-900 shadow-sm">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Answer
                      </p>
                      <p className="whitespace-pre-wrap leading-7">{m.text}</p>

                      {m.sources && m.sources.length > 0 && (
                        <div className="mt-4 border-t pt-3">
                          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                            Sources
                          </p>
                          <div className="mt-2 space-y-2">
                            {m.sources.map((s, i) => (
                              <div
                                key={`${s.chunk_index}-${i}`}
                                className="rounded-xl bg-gray-50 p-3 text-sm text-gray-700"
                              >
                                <p className="text-xs font-semibold text-gray-500">
                                  Chunk {s.chunk_index}
                                  {typeof s.similarity === "number"
                                    ? ` • Similarity: ${s.similarity.toFixed(3)}`
                                    : ""}
                                </p>
                                <p className="mt-1 whitespace-pre-wrap leading-6">
                                  {s.preview}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {loading && (
                <div className="text-left">
                  <div className="inline-block rounded-2xl border bg-white px-4 py-3 text-sm text-gray-600 shadow-sm">
                    Searching your notes...
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="mt-3 flex gap-2">
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Type your question..."
              className="w-full rounded-xl border px-3 py-2 text-sm"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !loading) send();
              }}
            />
            <button
              onClick={send}
              disabled={loading}
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {loading ? "Sending..." : "Send"}
            </button>
          </div>

          {err && <p className="mt-2 text-sm text-red-600">{err}</p>}
        </div>
      </main>
    </div>
  );
}