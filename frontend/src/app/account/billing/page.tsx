"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import {
  CreditCard, Calendar, Shield, Zap, Download,
  ArrowRight, RefreshCw, Crown, AlertTriangle,
  BadgeCheck, BarChart3,
} from "lucide-react";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:8000";

type Subscription = { plan: string; status: string; provider: string | null; current_period_end: string | null; cancel_at_period_end: boolean };
type UsageSummary = { plan: string; period: string; features: Record<string, { used: number; limit: number | null; unlimited: boolean; remaining: number | null }> };

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
        const h = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
        const [s, u] = await Promise.all([
          fetch(`${BACKEND}/billing/subscription`, { headers: h }).then(r => r.ok ? r.json() : null),
          fetch(`${BACKEND}/billing/usage`, { headers: h }).then(r => r.ok ? r.json() : null),
        ]);
        setSub(s); setUsage(u);
      } catch {} finally { setLoading(false); }
    })();
  }, [user]);

  const handlePortal = async () => {
    setActionLoading("portal"); setError("");
    try {
      const token = await getToken();
      const res = await fetch(`${BACKEND}/billing/customer-portal`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } });
      const data = await res.json();
      if (data.portal_url) window.location.href = data.portal_url;
      else setError("Could not open billing portal.");
    } catch { setError("Failed."); } finally { setActionLoading(null); }
  };

  const handleCancel = async () => {
    if (!confirm("Cancel your subscription? Access continues until period ends.")) return;
    setActionLoading("cancel"); setError("");
    try {
      const token = await getToken();
      const res = await fetch(`${BACKEND}/billing/cancel`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } });
      if (res.ok) setSub((s) => s ? { ...s, cancel_at_period_end: true } : s);
      else setError((await res.json()).detail || "Failed.");
    } catch { setError("Failed."); } finally { setActionLoading(null); }
  };

  if (authLoading || loading) return <div className="space-y-4 p-6 lg:p-8"><div className="h-8 w-48 animate-shimmer rounded-xl" /><div className="h-40 animate-shimmer rounded-2xl" /></div>;
  if (!user) return <div className="p-8 text-center"><p className="text-surface-500">Please <Link href="/login" className="text-brand-600 hover:underline">sign in</Link> to manage billing.</p></div>;

  const planName = sub?.plan || "free";
  const isPaid = sub?.plan !== "free";
  const planColors: Record<string, string> = { free: "bg-surface-100 text-surface-600", pro: "bg-brand-50 text-brand-700", premium: "bg-purple-50 text-purple-700" };

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-surface-900">Billing & Subscription</h1>
          <p className="mt-1 text-sm text-surface-500">Manage your plan, usage, and payment methods.</p>
        </div>
        <button onClick={() => window.location.reload()} className="inline-flex items-center gap-2 rounded-xl border border-surface-200 px-4 py-2 text-xs font-medium text-surface-500 hover:bg-surface-50">
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      </motion.div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-surface-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4"><Crown className="h-4 w-4 text-brand-500" /><h3 className="text-sm font-semibold text-surface-700">Your Plan</h3></div>
          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold capitalize ${planColors[planName] || planColors.free}`}>
              {isPaid ? <BadgeCheck className="h-4 w-4" /> : null} {planName}
            </span>
            {sub?.status && (
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${sub.status === "active" ? "bg-green-50 text-green-700" : sub.status === "past_due" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"}`}>
                {sub.status}
              </span>
            )}
          </div>
          {sub?.current_period_end && (
            <p className="mt-3 text-sm text-surface-500">
              {sub.cancel_at_period_end ? "Ends" : "Renews"} on {new Date(sub.current_period_end).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
              {sub.cancel_at_period_end && <span className="ml-2 text-amber-600 font-medium">(will not renew)</span>}
            </p>
          )}
          <div className="mt-5 flex flex-wrap gap-3">
            {!isPaid ? (
              <Link href="/pricing" className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-700">
                <ArrowRight className="h-4 w-4" /> Upgrade Plan
              </Link>
            ) : (
              <>
                <button onClick={handlePortal} disabled={actionLoading === "portal"}
                  className="rounded-xl bg-surface-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-surface-800 disabled:opacity-40">
                  Manage Billing
                </button>
                {!sub?.cancel_at_period_end && (
                  <button onClick={handleCancel} disabled={actionLoading === "cancel"}
                    className="rounded-xl border border-red-200 px-5 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-40">
                    Cancel
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-surface-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4"><CreditCard className="h-4 w-4 text-accent-500" /><h3 className="text-sm font-semibold text-surface-700">Payment Method</h3></div>
          {sub?.provider === "stripe" ? (
            <div>
              <p className="text-sm text-surface-700">Managed by Stripe</p>
              <button onClick={handlePortal} className="mt-2 text-sm font-medium text-brand-600 hover:text-brand-700">Update method →</button>
            </div>
          ) : (
            <div>
              <p className="text-sm text-surface-500">No payment method on file.</p>
              <Link href="/pricing" className="mt-2 inline-block text-sm font-medium text-brand-600 hover:text-brand-700">Add one →</Link>
            </div>
          )}
        </div>
      </motion.div>

      {usage?.features && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="rounded-2xl border border-surface-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4"><BarChart3 className="h-4 w-4 text-brand-500" /><h3 className="text-sm font-semibold text-surface-700">Usage This Period</h3></div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Object.entries(usage.features).map(([key, val]) => {
              const pct = val.unlimited ? 0 : val.limit ? Math.min((val.used / val.limit) * 100, 100) : 0;
              const nearLimit = !val.unlimited && val.remaining !== null && val.remaining <= 2;
              const exceeded = !val.unlimited && val.remaining !== null && val.remaining <= 0;
              return (
                <div key={key} className={`rounded-xl border p-4 ${exceeded ? "border-red-200 bg-red-50" : nearLimit ? "border-amber-200 bg-amber-50" : "border-surface-100 bg-surface-50"}`}>
                  <p className="text-xs font-medium text-surface-500 uppercase tracking-wide">{key.replace(/_/g, " ")}</p>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className={`text-xl font-bold ${exceeded ? "text-red-600" : "text-surface-800"}`}>{val.used}</span>
                    <span className="text-xs text-surface-400">/ {val.unlimited ? "∞" : val.limit}</span>
                  </div>
                  {!val.unlimited && (
                    <div className="mt-2 h-1.5 rounded-full bg-surface-200">
                      <div className={`h-full rounded-full transition-all ${exceeded ? "bg-red-500" : nearLimit ? "bg-amber-500" : "bg-brand-500"}`} style={{ width: `${pct}%` }} />
                    </div>
                  )}
                  {nearLimit && !exceeded && <p className="mt-1 text-xs text-amber-600">{val.remaining} remaining</p>}
                  {exceeded && <p className="mt-1 text-xs text-red-600">Limit reached</p>}
                </div>
              );
            })}
          </div>
          {!isPaid && Object.values(usage.features).some((v) => !v.unlimited && v.remaining !== null && v.remaining <= 2) && (
            <div className="mt-4 rounded-xl border border-brand-200 bg-brand-50 p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-brand-600" />
                <p className="text-sm font-medium text-brand-700">You&apos;re approaching your free plan limits.</p>
              </div>
              <Link href="/pricing" className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-700">Upgrade →</Link>
            </div>
          )}
        </motion.div>
      )}

      {!isPaid && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="rounded-2xl border border-brand-200 bg-gradient-to-br from-brand-50 to-purple-50 p-6 text-center">
          <SparklesIcon className="mx-auto h-8 w-8 text-brand-500" />
          <h3 className="mt-3 text-lg font-bold text-surface-900">Unlock the full Noctual experience</h3>
          <p className="mt-1 text-sm text-surface-500">Get unlimited AI tutoring, exam mode, clinical simulations, and more.</p>
          <Link href="/pricing" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-brand-700">
            View Plans <ArrowRight className="h-4 w-4" />
          </Link>
        </motion.div>
      )}
    </div>
  );
}

function SparklesIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
    </svg>
  );
}

async function getToken(): Promise<string | null> {
  try { const mod = await import("@/lib/auth"); return await mod.getAccessToken(); } catch { return null; }
}
