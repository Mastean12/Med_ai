"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { generateFlashcards, listDocuments } from "@/lib/api";

type DocRow = { id: string; title: string; status?: string };
type Flashcard = { question: string; answer: string; chunk_index: number };

export default function StudentFlashcardsPage() {
  const { user, loading: authLoading } = useAuth();

  const [documents, setDocuments] = useState<DocRow[]>([]);
  const [documentId, setDocumentId] = useState("");
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [loadingCards, setLoadingCards] = useState(false);
  const [err, setErr] = useState("");
  const [currentCard, setCurrentCard] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [studyMode, setStudyMode] = useState(false);

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

  const handleGenerate = async () => {
    if (!documentId) { setErr("Select a document first."); return; }
    setErr("");
    setLoadingCards(true);
    setFlashcards([]);
    setCurrentCard(0);
    setFlipped(false);
    setStudyMode(false);
    try {
      const res = await generateFlashcards({ document_id: documentId, max_cards: 10 });
      if (!res.flashcards?.length) { setErr("No flashcards could be generated from this document."); return; }
      setFlashcards(res.flashcards);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Failed to generate");
    } finally {
      setLoadingCards(false);
    }
  };

  const nextCard = () => { if (currentCard < flashcards.length - 1) { setCurrentCard((c) => c + 1); setFlipped(false); } };
  const prevCard = () => { if (currentCard > 0) { setCurrentCard((c) => c - 1); setFlipped(false); } };

  const handleFlip = () => setFlipped((f) => !f);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === " " || e.key === "Enter") { e.preventDefault(); handleFlip(); }
    if (e.key === "ArrowRight") { e.preventDefault(); nextCard(); }
    if (e.key === "ArrowLeft") { e.preventDefault(); prevCard(); }
  };

  if (authLoading) {
    return <div className="mx-auto max-w-4xl px-6 py-20"><div className="mx-auto h-8 w-48 animate-pulse rounded-xl bg-surface-200" /></div>;
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-20 text-center">
        <div className="mx-auto max-w-md rounded-2xl border border-surface-200 bg-white p-10 shadow-sm">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-purple-50 text-3xl">🃏</div>
          <h1 className="text-2xl font-bold text-surface-900">Study Flashcards</h1>
          <p className="mt-2 text-surface-500">Sign in to generate and review flashcards.</p>
          <Link href="/login" className="mt-6 inline-flex rounded-xl bg-brand-600 px-6 py-3 text-sm font-semibold text-white hover:bg-brand-700">Sign in</Link>
        </div>
      </div>
    );
  }

  const card = flashcards[currentCard];

  return (
    <main className="mx-auto max-w-4xl px-6 py-8">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">Flashcards</h1>
          <p className="mt-1 text-sm text-surface-500">AI-generated study cards from your notes</p>
        </div>
        {!studyMode && (
          <button onClick={() => studyMode ? null : (setStudyMode(true), setCurrentCard(0), setFlipped(false))}
            disabled={!flashcards.length}
            className="rounded-xl bg-purple-600 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-30 shadow-sm">
            Start Study Mode
          </button>
        )}
      </div>

      {!studyMode && (
        <div className="mb-6 rounded-2xl border border-surface-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap gap-3">
            <select value={documentId} onChange={(e) => setDocumentId(e.target.value)}
              className="rounded-xl border border-surface-200 bg-surface-50 px-4 py-2.5 text-sm text-surface-700 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/20">
              <option value="">Select document</option>
              {documents.map((d) => <option key={d.id} value={d.id}>{d.title}</option>)}
            </select>
            <button onClick={loadDocs} disabled={loadingDocs}
              className="rounded-xl border border-surface-200 px-4 py-2.5 text-sm font-medium text-surface-600 transition-colors hover:bg-surface-50 disabled:opacity-50">
              {loadingDocs ? "Loading..." : "Reload"}
            </button>
            <button onClick={handleGenerate} disabled={loadingCards || !documentId}
              className="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-brand-700 disabled:opacity-40 shadow-sm">
              {loadingCards ? "Generating..." : "Generate Flashcards"}
            </button>
          </div>
          {err && <p className="mt-3 text-sm text-red-500">{err}</p>}
        </div>
      )}

      {loadingCards ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1,2,3,4,5,6].map((i) => (
            <div key={i} className="rounded-2xl border border-surface-200 bg-white p-6 animate-pulse">
              <div className="h-4 w-16 rounded bg-surface-200" />
              <div className="mt-3 h-5 w-full rounded bg-surface-100" />
              <div className="mt-2 h-5 w-3/4 rounded bg-surface-100" />
              <div className="mt-4 h-px bg-surface-100" />
              <div className="mt-3 h-4 w-20 rounded bg-surface-200" />
            </div>
          ))}
        </div>
      ) : studyMode && card ? (
        <div className="mx-auto max-w-2xl" onKeyDown={handleKeyDown} tabIndex={0} autoFocus>
          <div className="mb-4 flex items-center justify-between text-sm text-surface-500">
            <span>Card {currentCard + 1} of {flashcards.length}</span>
            <div className="h-1.5 flex-1 mx-4 rounded-full bg-surface-200">
              <div className="h-full rounded-full bg-purple-500 transition-all" style={{ width: `${((currentCard + 1) / flashcards.length) * 100}%` }} />
            </div>
          </div>

          <div className="cursor-pointer perspective-[1000px]" onClick={handleFlip}>
            <div className={`relative min-h-[260px] rounded-3xl border-2 border-surface-200 bg-white shadow-lg transition-all duration-500 [transform-style:preserve-3d] ${flipped ? "[transform:rotateY(180deg)]" : ""}`}>
              <div className="absolute inset-0 flex flex-col items-center justify-center rounded-3xl p-8 text-center [backface-visibility:hidden]">
                <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-purple-500">Question</p>
                <p className="text-xl font-semibold leading-relaxed text-surface-800">{card.question}</p>
                <p className="mt-6 text-xs text-surface-400">Tap or press Space to reveal answer</p>
              </div>
              <div className="absolute inset-0 flex flex-col items-center justify-center rounded-3xl bg-gradient-to-br from-purple-50 to-brand-50 p-8 text-center [transform:rotateY(180deg)] [backface-visibility:hidden]">
                <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-accent-600">Answer</p>
                <p className="text-lg leading-relaxed text-surface-800">{card.answer}</p>
              </div>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between">
            <button onClick={prevCard} disabled={currentCard === 0}
              className="rounded-xl border border-surface-200 px-4 py-2.5 text-sm font-medium text-surface-600 transition-colors hover:bg-surface-50 disabled:opacity-30">
              ← Previous
            </button>
            <button onClick={handleFlip}
              className="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-brand-700">
              {flipped ? "Show Question" : "Reveal Answer"}
            </button>
            <button onClick={nextCard} disabled={currentCard >= flashcards.length - 1}
              className="rounded-xl border border-surface-200 px-4 py-2.5 text-sm font-medium text-surface-600 transition-colors hover:bg-surface-50 disabled:opacity-30">
              Next →
            </button>
          </div>

          <div className="mt-8 flex justify-center gap-3">
            <button onClick={() => { setStudyMode(false); }} className="rounded-xl border border-surface-200 px-4 py-2 text-sm text-surface-500 transition-colors hover:bg-surface-50">
              Exit Study Mode
            </button>
          </div>

          <p className="mt-6 text-center text-xs text-surface-400">
            Keyboard: ← → to navigate, Space to flip
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {flashcards.length === 0 && !err ? (
            <div className="col-span-full rounded-2xl border border-dashed border-surface-300 bg-white px-6 py-16 text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-100 text-2xl">🃏</div>
              <p className="text-sm font-medium text-surface-500">No flashcards yet</p>
              <p className="mt-1 text-xs text-surface-400">Select a document and click Generate to create study cards.</p>
            </div>
          ) : (
            flashcards.map((card, idx) => (
              <div key={idx} className="rounded-2xl border border-surface-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md animate-fade-in">
                <p className="text-xs font-semibold uppercase tracking-widest text-purple-500">Question</p>
                <p className="mt-2 text-sm font-semibold leading-relaxed text-surface-800">{card.question}</p>
                <hr className="my-3 border-surface-100" />
                <p className="text-xs font-semibold uppercase tracking-widest text-accent-600">Answer</p>
                <p className="mt-2 text-sm leading-relaxed text-surface-600">{card.answer}</p>
              </div>
            ))
          )}
        </div>
      )}
    </main>
  );
}
