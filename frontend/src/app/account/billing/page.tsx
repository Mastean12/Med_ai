"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:8000";

type Subscription = {
  plan: string;
  status: string;
  provider: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
};

type UsageSummary = {
  plan: string;
  period: string;
  features: Record<string, { used: number; limit: number | null; unlimited: boolean; remaining: number | null }>;
};

export default function BillingPage() {
  const { user, loading: authLoading } = useAuth();
  const [sub, setSub] = useState<Subscription | null>(null);
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const token = await getToken();
        const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

        const [subRes, usageRes] = await Promise.all([
          fetch(`${BACKEND}/billing/subscription`, { headers }),
          fetch(`${BACKEND}/billing/usage`, { headers }),
        ]);

        if (subRes.ok) setSub(await subRes.json());
        if (usageRes.ok) setUsage(await usageRes.json());
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed to load billing");
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  const handlePortal = async () => {
    setActionLoading("portal");
    setError("");
    try {
      const token = await getToken();
      const res = await fetch(`${BACKEND}/billing/customer-portal`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (data.portal_url) window.location.href = data.portal_url;
      else setError("Could not open billing portal");
    } catch {
      setError("Failed to open billing portal");
    } finally { setActionLoading(null); }
  };

  const handleCancel = async () => {
    if (!confirm("Cancel your subscription? You'll keep access until the period ends.")) return;
    setActionLoading("cancel");
    setError("");
    try {
      const token = await getToken();
      const res = await fetch(`${BACKEND}/billing/cancel`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      if (res.ok) {
        setSub((s) => s ? { ...s, cancel_at_period_end: true } : s);
      } else {
        const data = await res.json();
        setError(data?.detail || "Failed to cancel");
      }
    } catch {
      setError("Failed to cancel subscription");
    } finally { setActionLoading(null); }
  };

  if (authLoading || loading) {
    return (
      <main className="mx-auto max-w-4xl px-6 py-12">
        <div className="space-y-4">
          <div className="h-8 w-48 animate-pulse rounded-xl bg-surface-200" />
          <div className="h-40 animate-pulse rounded-2xl bg-surface-100" />
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="mx-auto max-w-4xl px-6 py-12 text-center">
        <p className="text-surface-500">Please <Link href="/login" className="text-brand-600 hover:underline">sign in</Link> to manage billing.</p>
      </main>
    );
  }

  const planName = sub?.plan || "free";

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-surface-900">Billing & Subscription</h1>
        <p className="mt-1 text-sm text-surface-500">Manage your plan, payment methods, and usage.</p>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-surface-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-widest text-surface-400">Current Plan</p>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-surface-900 capitalize">{planName}</span>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
              sub?.status === "active" ? "bg-green-50 text-green-700" : sub?.status === "past_due" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"
            }`}>
              {sub?.status || "active"}
            </span>
          </div>

          {sub?.current_period_end && (
            <p className="mt-2 text-sm text-surface-500">
              {sub.cancel_at_period_end ? "Ends" : "Renews"} on{" "}
              {new Date(sub.current_period_end).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
            </p>
          )}

          {sub?.cancel_at_period_end && (
            <p className="mt-2 text-xs text-amber-600 font-medium">Your subscription will not renew.</p>
          )}

          <div className="mt-6 flex flex-wrap gap-3">
            {planName === "free" ? (
              <Link href="/pricing" className="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-brand-700">
                Upgrade Plan
              </Link>
            ) : (
              <>
                <button onClick={handlePortal} disabled={actionLoading === "portal"}
                  className="rounded-xl bg-surface-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-surface-800 disabled:opacity-40">
                  {actionLoading === "portal" ? "Loading..." : "Manage Billing"}
                </button>
                {!sub?.cancel_at_period_end && (
                  <button onClick={handleCancel} disabled={actionLoading === "cancel"}
                    className="rounded-xl border border-surface-200 px-5 py-2.5 text-sm font-medium text-surface-500 transition-colors hover:bg-surface-50 disabled:opacity-40">
                    {actionLoading === "cancel" ? "Canceling..." : "Cancel"}
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-surface-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-widest text-surface-400">Payment Method</p>
          {sub?.provider === "stripe" ? (
            <div className="mt-3">
              <p className="text-sm text-surface-700">Managed by Stripe</p>
              <button onClick={handlePortal}
                className="mt-3 text-sm font-medium text-brand-600 hover:text-brand-700 transition-colors">
                Update payment method →
              </button>
            </div>
          ) : (
            <div className="mt-3">
              <p className="text-sm text-surface-500">No payment method on file.</p>
              <Link href="/pricing" className="mt-3 inline-block text-sm font-medium text-brand-600 hover:text-brand-700 transition-colors">
                Upgrade to add one →
              </Link>
            </div>
          )}
        </div>
      </div>

      {usage?.features && (
        <div className="mt-6 rounded-2xl border border-surface-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-widest text-surface-400">Usage This Period</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(usage.features).map(([key, val]) => (
              <div key={key} className="rounded-xl border border-surface-100 bg-surface-50 px-4 py-3">
                <p className="text-xs font-medium text-surface-500 uppercase tracking-wide">{key.replace(/_/g, " ")}</p>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-lg font-bold text-surface-800">{val.used}</span>
                  <span className="text-xs text-surface-400">
                    / {val.unlimited ? "∞" : val.limit ?? "—"}
                  </span>
                </div>
                {!val.unlimited && (
                  <div className="mt-2 h-1.5 rounded-full bg-surface-200">
                    <div
                      className={`h-full rounded-full transition-all ${
                        (val.used / (val.limit || 1)) > 0.8 ? "bg-red-500" : "bg-brand-500"
                      }`}
                      style={{ width: `${Math.min((val.used / (val.limit || 1)) * 100, 100)}%` }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}

async function getToken(): Promise<string | null> {
  try {
    const mod = await import("@/lib/auth");
    return await mod.getAccessToken();
  } catch {
    return null;
  }
}
