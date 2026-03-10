"use client";

import { useState } from "react";
import Navbar from "@/components/Navbar";
import { uploadDocument } from "@/lib/api";
import { getToken, setToken, clearToken } from "@/lib/auth";

export default function UploadPage() {
  const [token, setTokenInput] = useState(getToken() || "");
  const [file, setFile] = useState<File | null>(null);

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string>("");
  const [result, setResult] = useState<any>(null);

  const saveToken = () => {
    if (!token.trim()) {
      clearToken();
      setMsg("Token cleared.");
      return;
    }
    setToken(token);
    setMsg("Token saved.");
  };

  const onUpload = async () => {
    if (!file) return setMsg("Choose a PDF first.");
    setLoading(true);
    setMsg("");
    setResult(null);

    try {
      const res = await uploadDocument(file);
      setResult(res);
      setMsg("Upload successful ✅ Copy the document_id to use in Chat.");
    } catch (e: any) {
      setMsg(e.message || "Upload failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-2xl font-bold">Upload Notes</h1>

        {/* Token box (temporary) */}
        <div className="mt-6 rounded-2xl border bg-white p-4 shadow-sm">
          <h2 className="font-semibold">Access Token (temporary)</h2>
          <p className="mt-1 text-sm text-gray-600">
            Paste your Supabase access token here (Bearer token).
          </p>

          <div className="mt-3 flex gap-2">
            <input
              value={token}
              onChange={(e) => setTokenInput(e.target.value)}
              placeholder="eyJhbGciOi..."
              className="w-full rounded-xl border px-3 py-2 text-sm"
            />
            <button
              onClick={saveToken}
              className="rounded-xl bg-black px-4 py-2 text-sm text-white"
            >
              Save
            </button>
          </div>
        </div>

        {/* Upload */}
        <div className="mt-6 rounded-2xl border bg-white p-4 shadow-sm">
          <h2 className="font-semibold">Upload PDF</h2>

          <input
            type="file"
            accept="application/pdf"
            className="mt-3 block w-full text-sm"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />

          <button
            onClick={onUpload}
            disabled={loading}
            className="mt-4 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {loading ? "Uploading..." : "Upload"}
          </button>

          {msg && <p className="mt-3 text-sm text-gray-700">{msg}</p>}

          {result && (
            <pre className="mt-3 overflow-auto rounded-xl bg-gray-900 p-3 text-xs text-white">
              {JSON.stringify(result, null, 2)}
            </pre>
          )}
        </div>
      </main>
    </div>
  );
}