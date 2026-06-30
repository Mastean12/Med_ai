"use client";

import { useState } from "react";

import { API_BASE_URL } from "@/lib/apiClient";

export default function SymptomCheckerPage() {
  const [symptoms, setSymptoms] = useState("");
  const [response, setResponse] = useState("");
  const [disclaimer, setDisclaimer] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleCheck = async () => {
    if (!symptoms.trim()) { setError("Please describe your symptoms."); return; }
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/public/symptom-check`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ symptoms: symptoms.trim() }) });
      const data = await res.json();
      setResponse(data.message || "");
      setDisclaimer(data.disclaimer || "");
    } catch {
      setError("Unable to connect. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent-50 text-3xl">🏥</div>
        <h1 className="text-2xl font-bold text-surface-900">Symptom Checker</h1>
        <p className="mt-2 text-surface-500 max-w-md mx-auto">Get general health information based on your symptoms. This is not a diagnosis.</p>
      </div>

      <div className="rounded-2xl border border-surface-200 bg-white p-6 shadow-sm space-y-4">
        <textarea
          value={symptoms}
          onChange={(e) => setSymptoms(e.target.value)}
          placeholder="Describe what you're experiencing..."
          rows={5}
          className="w-full rounded-xl border border-surface-200 bg-surface-50 px-4 py-3 text-sm text-surface-800 placeholder-surface-400 focus:border-accent-400 focus:outline-none focus:ring-2 focus:ring-accent-400/20 resize-none"
        />
        {error && <p className="text-sm text-red-500">{error}</p>}
        <button
          onClick={handleCheck}
          disabled={loading}
          className="w-full rounded-xl bg-accent-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-accent-700 disabled:opacity-40"
        >
          {loading ? "Analyzing..." : "Check Symptoms"}
        </button>
      </div>

      {response && (
        <div className="mt-6 animate-fade-in">
          <div className="rounded-2xl border border-surface-200 bg-white p-6 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold text-surface-700">Guidance</h3>
            <p className="text-sm leading-relaxed text-surface-700 whitespace-pre-wrap">{response}</p>
          </div>
          {disclaimer && (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-800">
              ⚠️ {disclaimer}
            </div>
          )}
        </div>
      )}
    </main>
  );
}
