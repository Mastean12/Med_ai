"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { API_BASE_URL } from "@/lib/apiClient";
import {
  Check, Sparkles, Crown, Shield, ArrowRight,
  BookOpen, Brain, PenTool, BarChart3, Upload,
  GraduationCap, Users, Zap,
} from "lucide-react";

const plans = [
  {
    key: "free", label: "Free", price: 0,
    desc: "Start your AI-powered medical learning journey.",
    cta: "Get Started Free", href: "/register", variant: "outline" as const,
    features: [
      { label: "3 document uploads", included: true },
      { label: "20 AI questions/month", included: true },
      { label: "10 flashcard generations", included: true },
      { label: "5 AI tutor sessions", included: true },
      { label: "2 exam mode attempts", included: true },
      { label: "Basic analytics", included: true },
      { label: "Advanced exam prep", included: false },
      { label: "Clinical simulations", included: false },
    ],
  },
  {
    key: "pro_monthly", label: "Student Pro", price: 19, badge: "Most Popular",
    desc: "Unlock unlimited AI tutoring, exams, and advanced analytics.",
    cta: "Start Pro", variant: "primary" as const,
    features: [
      { label: "Unlimited AI Chat", included: true },
      { label: "Unlimited AI Tutor", included: true },
      { label: "Unlimited exam mode", included: true },
      { label: "Unlimited flashcards", included: true },
      { label: "Unlimited uploads", included: true },
      { label: "Advanced analytics", included: true },
      { label: "Priority AI access", included: true },
      { label: "Adaptive learning", included: true },
      { label: "Revision sheets", included: true },
    ],
  },
  {
    key: "university", label: "University", price: 99, badge: "For Teams",
    desc: "Everything in Pro plus multi-user, org dashboard, and reports.",
    cta: "Go University", variant: "primary" as const,
    features: [
      { label: "Everything in Student Pro", included: true },
      { label: "Clinical simulations", included: true },
      { label: "Multiple users", included: true },
      { label: "Organization dashboard", included: true },
      { label: "Student analytics", included: true },
      { label: "Instructor dashboard", included: true },
      { label: "Institution reports", included: true },
      { label: "Role management", included: true },
      { label: "Team billing", included: true },
    ],
  },
];

const faqs = [
  { q: "Can I switch plans anytime?", a: "Yes. Upgrade or downgrade at any time. Changes take effect immediately." },
  { q: "Is there a free trial?", a: "Pro includes a 7-day free trial. No credit card required for Free." },
  { q: "What payments are accepted?", a: "Credit/debit cards globally via Stripe." },
  { q: "Can I cancel anytime?", a: "Absolutely. Cancel from your account. You keep access until the period ends." },
  { q: "Is my payment info secure?", a: "Payments processed by Stripe — PCI-DSS Level 1 certified. We never store card details." },
];

export default function PricingPage() {
  const { user } = useAuth();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [error, setError] = useState("");

  const handleCheckout = async (planKey: string) => {
    if (planKey === "free") return;
    setLoadingPlan(planKey); setError("");
    try {
      const token = await getToken();
      if (!token) { window.location.href = "/login?redirect=pricing"; return; }
      const res = await fetch(`${API_BASE_URL}/billing/create-checkout-session`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planKey }),
      });
      const data = await res.json();
      if (data.checkout_url) {
        window.location.href = data.checkout_url;
      } else {
        setError(data.detail || "Unable to start checkout. Please try again.");
      }
    } catch {
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
          Start free. Upgrade when you need more power.
        </p>
      </motion.div>

      {error && (
        <div className="mb-6 mx-auto max-w-lg rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">{error}</div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {plans.map((plan, i) => (
          <motion.div key={plan.key} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.05 }}
            className={`relative rounded-3xl border-2 p-8 transition-all ${
              plan.badge && plan.key !== "free"
                ? "border-brand-500 bg-white shadow-xl shadow-brand-500/10 scale-[1.02]"
                : "border-surface-200 bg-white shadow-sm hover:shadow-md"
            }`}>
            {plan.badge && plan.key !== "free" && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-600 px-4 py-1 text-xs font-semibold text-white shadow-sm">
                {plan.badge}
              </span>
            )}

            <div className="flex items-center gap-2 mb-1">
              {plan.key === "university" && <GraduationCap className="h-5 w-5 text-brand-500" />}
              {plan.key === "pro_monthly" && <Crown className="h-5 w-5 text-brand-500" />}
              {plan.key === "free" && <BookOpen className="h-5 w-5 text-surface-400" />}
              <p className="text-sm font-semibold uppercase tracking-widest text-surface-400">{plan.label}</p>
            </div>

            <div className="mt-4 flex items-baseline gap-1">
              <span className="text-4xl font-bold text-surface-900">${plan.price}</span>
              {plan.price > 0 && <span className="text-sm text-surface-400">/mo</span>}
              {plan.price === 0 && <span className="text-sm text-surface-400 ml-1">forever</span>}
            </div>
            <p className="mt-2 text-sm text-surface-500">{plan.desc}</p>

            <button
              onClick={() => handleCheckout(plan.key)}
              disabled={loadingPlan === plan.key || plan.key === "free"}
              className={`mt-6 w-full rounded-xl px-5 py-3 text-sm font-semibold transition-all disabled:opacity-40 flex items-center justify-center gap-2 ${
                plan.variant === "primary"
                  ? "bg-brand-600 text-white shadow-sm hover:bg-brand-700"
                  : "border border-surface-200 text-surface-700 hover:bg-surface-50"
              }`}>
              {loadingPlan === plan.key ? "Loading..." : plan.cta}
              {plan.variant === "primary" && <ArrowRight className="h-4 w-4" />}
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
