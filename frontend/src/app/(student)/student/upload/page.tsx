"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { uploadDocument, listDocuments } from "@/lib/api";

type DocRow = { id: string; title: string; status?: string; created_at?: string };

export default function UploadPage() {
  const { user, loading: authLoading } = useAuth();

  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [msg, setMsg] = useState("");
  const [msgType, setMsgType] = useState<"success" | "error" | "">("");
  const [documents, setDocuments] = useState<DocRow[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);

  const loadDocs = async () => {
    if (!user) return;
    setLoadingDocs(true);
    try {
      const res = await listDocuments();
      setDocuments(res.documents);
    } catch { /* silent */ }
    finally { setLoadingDocs(false); }
  };

  useEffect(() => { if (user) loadDocs(); }, [user]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) {
      const name = f.name.toLowerCase();
      if (name.endsWith(".pdf") || name.endsWith(".docx") || name.endsWith(".txt")) {
        setFile(f);
        setMsg(""); setMsgType("");
      } else {
        setMsg("Supported formats: PDF, DOCX, TXT");
        setMsgType("error");
      }
    }
  }, []);

  const onUpload = async () => {
    if (!file) return;
    setUploading(true);
    setMsg("");
    setMsgType("");
    let prog = 0;
    const interval = setInterval(() => { prog += 8; if (prog > 90) prog = 90; setProgress(prog); }, 200);

    try {
      const res = await uploadDocument(file);
      clearInterval(interval);
      setProgress(100);
      setMsg("Upload complete!");
      setMsgType("success");
      setFile(null);
      loadDocs();
      setTimeout(() => setProgress(0), 1500);
    } catch (e: unknown) {
      clearInterval(interval);
      setProgress(0);
      setMsg(e instanceof Error ? e.message : "Upload failed");
      setMsgType("error");
    } finally {
      setUploading(false);
    }
  };

  const statusBadge = (status?: string) => {
    const map: Record<string, string> = { chunked: "bg-green-50 text-green-700", stored: "bg-blue-50 text-blue-700", uploaded: "bg-amber-50 text-amber-700", failed: "bg-red-50 text-red-700", processing_failed: "bg-red-50 text-red-700" };
    return map[status || ""] || "bg-surface-100 text-surface-500";
  };

  const formatDate = (d?: string) => d ? new Date(d).toLocaleDateString() : "";

  if (authLoading) {
    return <div className="mx-auto max-w-4xl px-6 py-20"><div className="mx-auto h-8 w-48 animate-pulse rounded-xl bg-surface-200" /></div>;
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-20 text-center">
        <div className="mx-auto max-w-md rounded-2xl border border-surface-200 bg-white p-10 shadow-sm">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 text-3xl">📤</div>
          <h1 className="text-2xl font-bold text-surface-900">Upload Notes</h1>
          <p className="mt-2 text-surface-500">Sign in to upload your study materials.</p>
          <Link href="/login" className="mt-6 inline-flex rounded-xl bg-brand-600 px-6 py-3 text-sm font-semibold text-white hover:bg-brand-700">Sign in</Link>
        </div>
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-surface-900">Upload Notes</h1>
        <p className="mt-1 text-sm text-surface-500">Add PDFs, Word documents, or text files to your study library.</p>
      </div>

      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`rounded-3xl border-2 border-dashed p-12 text-center transition-all ${dragOver ? "border-brand-400 bg-brand-50/50" : "border-surface-300 bg-white hover:border-surface-400"}`}
      >
        <input
          type="file"
          accept=".pdf,.docx,.txt"
          className="hidden"
          id="file-input"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) { setFile(f); setMsg(""); setMsgType(""); } }}
        />
        <label htmlFor="file-input" className="cursor-pointer">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 text-3xl transition-transform hover:scale-105">📤</div>
          <p className="text-base font-semibold text-surface-700">
            {file ? file.name : "Drag your file here or click to browse"}
          </p>
          <p className="mt-2 text-sm text-surface-400">Supports PDF, DOCX, and TXT</p>
        </label>

        {file && (
          <div className="mt-6 mx-auto max-w-sm">
            <div className="flex items-center gap-3 rounded-xl border border-surface-200 bg-surface-50 px-4 py-3 text-sm">
              <span className="text-lg">📄</span>
              <span className="flex-1 truncate font-medium text-surface-700">{file.name}</span>
              <span className="text-surface-400">{(file.size / 1024 / 1024).toFixed(1)} MB</span>
              <button onClick={() => setFile(null)} className="text-surface-400 hover:text-red-500 transition-colors">✕</button>
            </div>
          </div>
        )}

        {progress > 0 && (
          <div className="mt-6 mx-auto max-w-sm">
            <div className="h-2 rounded-full bg-surface-200 overflow-hidden">
              <div className="h-full rounded-full bg-brand-500 transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
            <p className="mt-2 text-xs text-surface-400">{progress}%</p>
          </div>
        )}

        {msg && (
          <p className={`mt-4 text-sm font-medium ${msgType === "error" ? "text-red-500" : "text-green-600"}`}>{msg}</p>
        )}

        {file && (
          <button onClick={onUpload} disabled={uploading}
            className="mt-6 inline-flex rounded-xl bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-brand-700 disabled:opacity-40">
            {uploading ? "Uploading..." : "Upload Document"}
          </button>
        )}
      </div>

      <div className="mt-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-surface-900">Your Documents</h2>
          <button onClick={loadDocs} disabled={loadingDocs} className="text-xs font-medium text-brand-600 hover:text-brand-700 transition-colors">
            {loadingDocs ? "Loading..." : "Refresh"}
          </button>
        </div>

        {!documents.length ? (
          <div className="rounded-2xl border border-dashed border-surface-300 bg-white px-6 py-12 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-surface-100 text-xl">📭</div>
            <p className="text-sm font-medium text-surface-500">No documents yet</p>
            <p className="mt-1 text-xs text-surface-400">Upload a PDF, DOCX, or TXT file to get started.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {documents.map((doc) => (
              <div key={doc.id} className="flex items-center gap-4 rounded-xl border border-surface-200 bg-white px-5 py-4 transition-colors hover:bg-surface-50">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-100 text-lg">📄</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-surface-800 truncate">{doc.title}</p>
                  <p className="text-xs text-surface-400">{formatDate(doc.created_at)}</p>
                </div>
                <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadge(doc.status)}`}>
                  {doc.status || "unknown"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
