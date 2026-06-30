"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import {
  Check, Zap, Sparkles, Crown, Shield, ArrowRight,
  Infinity, BookOpen, Brain, PenTool, BarChart3, Upload,
} from "lucide-react";

import { API_BASE_URL } from "@/lib/apiClient";

const plans = [
  {
    tier: "free", label: "Free", price: 0, period: "/month",
    desc: "Start your AI-powered medical learning journey.",
    cta: "Get Started Free", href: "/register", variant: "outline" as const,
    features: [
      { label: "3 document uploads", included: true, icon: Upload },
      { label: "20 AI questions/month", included: true, icon: Brain },
      { label: "10 flashcard generations", included: true, icon: BookOpen },
      { label: "5 AI tutor sessions/month", included: true, icon: Brain },
      { label: "2 exam mode attempts", included: true, icon: PenTool },
      { label: "Basic analytics", included: true, icon: BarChart3 },
      { label: "Advanced exam prep", included: false, icon: PenTool },
      { label: "Clinical simulations", included: false, icon: Shield },
    ],
  },
  {
    tier: "pro", label: "Pro", price: 19, period: "/month",
    badge: "Most Popular",
    desc: "Unlock AI tutoring, exam mode, and advanced analytics.",
    cta: "Start Pro Trial", variant: "primary" as const,
    features: [
      { label: "50 document uploads/month", included: true, icon: Upload },
      { label: "200 AI questions/month", included: true, icon: Brain },
      { label: "100 flashcard generations", included: true, icon: BookOpen },
      { label: "Unlimited AI tutor", included: true, icon: Brain },
      { label: "20 exam mode attempts", included: true, icon: PenTool },
      { label: "AI summaries + revision sheets", included: true, icon: Sparkles },
      { label: "Advanced analytics", included: true, icon: BarChart3 },
      { label: "Clinical simulations", included: false, icon: Shield },
    ],
  },
  {
    tier: "premium", label: "Premium", price: 49, period: "/month",
    desc: "Everything unlimited. Clinical simulations, priority AI, dedicated support.",
    cta: "Go Premium", variant: "primary" as const,
    features: [
      { label: "Unlimited everything", included: true, icon: Infinity },
      { label: "Unlimited AI everything", included: true, icon: Brain },
      { label: "Clinical simulations", included: true, icon: Shield },
      { label: "Adaptive learning engine", included: true, icon: Sparkles },
      { label: "Priority AI (fastest model)", included: true, icon: Zap },
      { label: "Advanced analytics + heatmaps", included: true, icon: BarChart3 },
      { label: "Viva mode + oral exams", included: true, icon: Crown },
      { label: "Dedicated support", included: true, icon: Shield },
    ],
  },
];

const faqs = [
  { q: "Can I switch plans anytime?", a: "Yes. Upgrade or downgrade at any time. Changes take effect immediately." },
  { q: "Is there a free trial?", a: "Pro includes a 7-day free trial. No credit card required for Free." },
  { q: "What payments are accepted?", a: "Credit/debit cards globally via Stripe. M-Pesa for Kenya." },
  { q: "Can I cancel anytime?", a: "Absolutely. Cancel from your account. You keep access until the period ends." },
  { q: "Is my payment info secure?", a: "Payments processed by Stripe — PCI-DSS Level 1 certified. We never store card details." },
];

export default function PricingPage() {
  const { user } = useAuth();
  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [usage, setUsage] = useState<Record<string, { used: number; limit: number | null }>>({});
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const token = await getToken();
        const res = await fetch(`${API_BASE_URL}/billing/usage`, { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) {
          const d = await res.json();
          const features: Record<string, { used: number; limit: number | null }> = {};
          for (const [k, v] of Object.entries(d.features || {})) {
            features[k] = { used: (v as { used: number }).used, limit: (v as { limit: number | null }).limit };
          }
          setUsage(features);
        }
      } catch {}
    })();
  }, [user]);

  const handleCheckout = async (plan: string) => {
    if (plan === "free") return;
    setLoadingPlan(plan); setError("");
    try {
      const token = await getToken();
      if (!token) { window.location.href = "/login?redirect=pricing"; return; }
      const res = await fetch(`${API_BASE_URL}/billing/create-checkout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ plan, billing_interval: billing }),
      });
      const data = await res.json();
      if (data.checkout_url) {
        window.location.href = data.checkout_url;
      } else {
        setError(data.detail || "Unable to start checkout. Please try again.");
      }
    } catch (err) {
      setError("A network error occurred. Please check your connection.");
    } finally { setLoadingPlan(null); }
  };

  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
        <span className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-4 py-1.5 text-xs font-semibold text-brand-700">
          <Sparkles className="h-3.5 w-3.5" /> AI-Powered Learning
        </span>
        <h1 className="mt-4 text-4xl font-bold tracking-tight text-surface-900">Choose your plan</h1>
        <p className="mt-3 text-lg text-surface-500 max-w-2xl mx-auto">
          Start free. Upgrade when you need more power. Every plan includes access to core AI study tools.
        </p>

        <div className="mt-8 inline-flex rounded-xl border border-surface-200 bg-surface-100 p-1">
          <button onClick={() => setBilling("monthly")} className={`rounded-lg px-5 py-2 text-sm font-medium transition-all ${billing === "monthly" ? "bg-white text-surface-900 shadow-sm" : "text-surface-500"}`}>Monthly</button>
          <button onClick={() => setBilling("yearly")} className={`rounded-lg px-5 py-2 text-sm font-medium transition-all ${billing === "yearly" ? "bg-white text-surface-900 shadow-sm" : "text-surface-500"}`}>
            Yearly <span className="text-xs text-accent-600 font-semibold ml-1">Save 17%</span>
          </button>
        </div>
      </motion.div>

      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">{error}</div>
      )}

      {user && Object.keys(usage).length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="mb-10 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-center">
          <p className="text-sm font-semibold text-amber-800">Your Current Usage This Month</p>
          <div className="mt-3 flex flex-wrap justify-center gap-3">
            {["tutoring_sessions", "exam_sessions", "flashcards_generated", "ai_questions"].map((f) => {
              const u = usage[f];
              if (!u) return null;
              const pct = u.limit ? Math.min((u.used / u.limit) * 100, 100) : 0;
              const nearLimit = u.limit && u.used >= u.limit * 0.8;
              return (
                <div key={f} className="flex items-center gap-2 rounded-xl bg-white border border-surface-200 px-3 py-2">
                  <span className="text-xs text-surface-600 capitalize">{f.replace(/_/g, " ")}</span>
                  <div className="h-1.5 w-16 rounded-full bg-surface-200">
                    <div className={`h-full rounded-full transition-all ${nearLimit && u.used >= (u.limit||1) ? "bg-red-500" : "bg-brand-500"}`} style={{ width: `${pct}%` }} />
                  </div>
                  <span className={`text-xs font-mono font-semibold ${nearLimit ? "text-red-600" : "text-surface-600"}`}>
                    {u.used}/{u.limit === null ? "∞" : u.limit}
                  </span>
                </div>
              );
            })}
          </div>
          {Object.values(usage).some((u) => u.limit && u.used >= (u.limit || 0)) && (
            <p className="mt-3 text-xs text-amber-700">You've reached your limit on some features. Upgrade to unlock more.</p>
          )}
        </motion.div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {plans.map((plan, i) => (
          <motion.div key={plan.tier} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.05 }}
            className={`relative rounded-3xl border-2 p-8 transition-all ${plan.badge ? "border-brand-500 bg-white shadow-xl shadow-brand-500/10 scale-[1.02]" : "border-surface-200 bg-white shadow-sm hover:shadow-md"}`}>
            {plan.badge && <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-600 px-4 py-1 text-xs font-semibold text-white shadow-sm">{plan.badge}</span>}

            <p className="text-sm font-semibold uppercase tracking-widest text-surface-400">{plan.label}</p>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="text-4xl font-bold text-surface-900">${billing === "yearly" ? Math.round(plan.price * 12 * 0.83) / 12 : plan.price}</span>
              {plan.price > 0 && <span className="text-sm text-surface-400">/mo</span>}
              {billing === "yearly" && plan.price > 0 && (
                <span className="ml-2 rounded-full bg-accent-50 px-2 py-0.5 text-xs font-semibold text-accent-700">Save 17%</span>
              )}
            </div>
            <p className="mt-2 text-sm text-surface-500">{plan.desc}</p>

            <button
              onClick={() => handleCheckout(plan.tier)}
              disabled={loadingPlan === plan.tier}
              className={`mt-6 w-full rounded-xl px-5 py-3 text-sm font-semibold transition-all disabled:opacity-40 flex items-center justify-center gap-2 ${
                plan.variant === "primary" ? "bg-brand-600 text-white shadow-sm hover:bg-brand-700" : "border border-surface-200 text-surface-700 hover:bg-surface-50"
              }`}>
              {loadingPlan === plan.tier ? "Loading..." : plan.cta} {plan.variant === "primary" && <ArrowRight className="h-4 w-4" />}
            </button>

            <ul className="mt-8 space-y-3">
              {plan.features.map((f) => (
                <li key={f.label} className="flex items-start gap-3 text-sm">
                  {f.included ? (
                    <Check className="h-4 w-4 text-accent-500 shrink-0 mt-0.5" />
                  ) : (
                    <span className="h-4 w-4 flex items-center justify-center shrink-0 mt-0.5 text-surface-300">—</span>
                  )}
                  <span className={f.included ? "text-surface-600" : "text-surface-400 line-through"}>{f.label}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        ))}
      </div>

      <div className="mt-20">
        <h2 className="text-center text-2xl font-bold text-surface-900">Frequently asked questions</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {faqs.map((f) => (
            <div key={f.q} className="rounded-xl border border-surface-200 bg-white p-5">
              <p className="text-sm font-semibold text-surface-800">{f.q}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-surface-500">{f.a}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

async function getToken(): Promise<string | null> {
  try { const mod = await import("@/lib/auth"); return await mod.getAccessToken(); } catch { return null; }
}
