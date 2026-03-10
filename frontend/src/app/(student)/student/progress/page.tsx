"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import { getStudentDashboard } from "@/lib/api";

type ActivityItem = {
  type: string;
  label: string;
  created_at?: string | null;
};

type DashboardData = {
  documents_uploaded: number;
  questions_asked: number;
  flashcards_created: number;
  recent_activity: ActivityItem[];
};

function formatDate(value?: string | null) {
  if (!value) return "Unknown time";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown time";

  return date.toLocaleString();
}

export default function StudentProgressPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const loadDashboard = async () => {
    setErr("");
    setLoading(true);

    try {
      const res = await getStudentDashboard();
      setData(res);
    } catch (e: any) {
      setErr(e?.message || "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  return (
    <div>
      <Navbar />

      <main className="mx-auto max-w-6xl px-4 py-10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Student Progress</h1>
            <p className="mt-2 text-sm text-gray-600">
              Track your study activity, usage, and learning progress.
            </p>
          </div>

          <button
            onClick={loadDashboard}
            disabled={loading}
            className="rounded-xl border px-4 py-2 text-sm disabled:opacity-50"
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {err && (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {err}
          </div>
        )}

        {loading ? (
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="rounded-2xl border bg-white p-5 shadow-sm"
              >
                <div className="h-4 w-24 animate-pulse rounded bg-gray-200" />
                <div className="mt-4 h-8 w-16 animate-pulse rounded bg-gray-200" />
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Documents Uploaded
                </p>
                <p className="mt-3 text-3xl font-bold text-gray-900">
                  {data?.documents_uploaded ?? 0}
                </p>
                <p className="mt-2 text-sm text-gray-600">
                  Total PDFs added to your study library.
                </p>
              </div>

              <div className="rounded-2xl border bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Questions Asked
                </p>
                <p className="mt-3 text-3xl font-bold text-gray-900">
                  {data?.questions_asked ?? 0}
                </p>
                <p className="mt-2 text-sm text-gray-600">
                  Questions you asked in the student chat.
                </p>
              </div>

              <div className="rounded-2xl border bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Flashcards Created
                </p>
                <p className="mt-3 text-3xl font-bold text-gray-900">
                  {data?.flashcards_created ?? 0}
                </p>
                <p className="mt-2 text-sm text-gray-600">
                  Total flashcards generated from your notes.
                </p>
              </div>

              <div className="rounded-2xl border bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Recent Activity
                </p>
                <p className="mt-3 text-3xl font-bold text-gray-900">
                  {data?.recent_activity?.length ?? 0}
                </p>
                <p className="mt-2 text-sm text-gray-600">
                  Latest recorded study actions.
                </p>
              </div>
            </div>

            <div className="mt-8 rounded-2xl border bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold">Recent Activity</h2>
                  <p className="mt-1 text-sm text-gray-600">
                    Your latest uploads, questions, and flashcard sessions.
                  </p>
                </div>
              </div>

              {!data?.recent_activity || data.recent_activity.length === 0 ? (
                <div className="mt-6 rounded-xl border border-dashed p-6 text-sm text-gray-600">
                  No recent activity yet. Upload notes, ask questions, or generate
                  flashcards to see progress here.
                </div>
              ) : (
                <div className="mt-6 space-y-3">
                  {data.recent_activity.map((item, idx) => (
                    <div
                      key={`${item.type}-${idx}`}
                      className="rounded-xl border bg-gray-50 p-4"
                    >
                      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {item.label}
                          </p>
                          <p className="mt-1 text-xs uppercase tracking-wide text-gray-500">
                            {item.type}
                          </p>
                        </div>

                        <p className="text-sm text-gray-500">
                          {formatDate(item.created_at)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}