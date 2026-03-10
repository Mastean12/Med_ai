"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import { getToken } from "@/lib/auth";
import { generateFlashcards } from "@/lib/api";

type DocRow = {
  id: string;
  title: string;
  status?: string;
  created_at?: string;
};

type Flashcard = {
  question: string;
  answer: string;
  chunk_index: number;
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

export default function StudentFlashcardsPage() {
  const [documents, setDocuments] = useState<DocRow[]>([]);
  const [documentId, setDocumentId] = useState("");
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [loadingCards, setLoadingCards] = useState(false);
  const [err, setErr] = useState("");

  const loadDocs = async () => {
    const token = (getToken() || "").trim();
    if (!token) {
      setErr("Save your token first on the chat page.");
      return;
    }

    setErr("");
    setLoadingDocs(true);

    try {
      const docs = await fetchDocuments(token);
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

  useEffect(() => {
    loadDocs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleGenerate = async () => {
    if (!documentId) {
      setErr("Select a document first.");
      return;
    }

    setErr("");
    setLoadingCards(true);

    try {
      const res = await generateFlashcards({
        document_id: documentId,
        max_cards: 10,
      });

      setFlashcards(res.flashcards || []);
    } catch (e: any) {
      setErr(e?.message || "Failed to generate flashcards");
    } finally {
      setLoadingCards(false);
    }
  };

  return (
    <div>
      <Navbar />

      <main className="mx-auto max-w-5xl px-4 py-10">
        <h1 className="text-2xl font-bold">Student Flashcards</h1>
        <p className="mt-2 text-sm text-gray-600">
          Generate quick study flashcards from one of your uploaded documents.
        </p>

        <div className="mt-6 rounded-2xl border bg-white p-4 shadow-sm">
          <h2 className="font-semibold">Choose Document</h2>

          <div className="mt-3 flex flex-col gap-3 md:flex-row">
            <select
              value={documentId}
              onChange={(e) => setDocumentId(e.target.value)}
              className="w-full rounded-xl border px-3 py-2 text-sm"
            >
              <option value="">-- select document --</option>
              {documents.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.title} {d.status ? `(${d.status})` : ""}
                </option>
              ))}
            </select>

            <button
              onClick={loadDocs}
              disabled={loadingDocs}
              className="rounded-xl border px-4 py-2 text-sm disabled:opacity-50"
            >
              {loadingDocs ? "Loading..." : "Reload documents"}
            </button>

            <button
              onClick={handleGenerate}
              disabled={loadingCards}
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {loadingCards ? "Generating..." : "Generate flashcards"}
            </button>
          </div>

          {err && <p className="mt-3 text-sm text-red-600">{err}</p>}
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {flashcards.length === 0 ? (
            <div className="rounded-2xl border bg-white p-4 shadow-sm">
              <p className="text-sm text-gray-600">
                No flashcards generated yet.
              </p>
            </div>
          ) : (
            flashcards.map((card, idx) => (
              <div
                key={idx}
                className="rounded-2xl border bg-white p-5 shadow-sm"
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                  Question
                </p>
                <p className="mt-2 text-base font-medium text-gray-900">
                  {card.question}
                </p>

                <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Answer
                </p>
                <p className="mt-2 text-sm leading-7 text-gray-700">
                  {card.answer}
                </p>

                <p className="mt-4 text-xs text-gray-500">
                  Source chunk: {card.chunk_index}
                </p>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}