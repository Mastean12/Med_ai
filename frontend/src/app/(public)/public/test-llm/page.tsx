"use client";

import { useState } from "react";

import { API_BASE_URL } from "@/lib/apiClient";

export default function TestLLMPage() {
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);

  const testLLM = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/test/llm`, { method: "POST", headers: { "Content-Type": "application/json" } });
      const data = await response.json();
      setResult(data);
    } catch (error: unknown) {
      setResult({ error: error instanceof Error ? error.message : "Unknown error" });
    }
    setLoading(false);
  };

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-100 text-3xl">🔧</div>
        <h1 className="text-2xl font-bold text-surface-900">System Test</h1>
        <p className="mt-2 text-surface-500">Verify the AI connection is operational.</p>
      </div>

      <div className="rounded-2xl border border-surface-200 bg-white p-6 shadow-sm text-center">
        <button onClick={testLLM} disabled={loading}
          className="rounded-xl bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-brand-700 disabled:opacity-40">
          {loading ? "Testing..." : "Run Connection Test"}
        </button>

        {result && (
          <pre className="mt-5 rounded-xl bg-surface-900 p-4 text-left text-xs text-surface-200 overflow-auto max-h-96">
            {JSON.stringify(result, null, 2)}
          </pre>
        )}
      </div>
    </main>
  );
}
