"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { API_BASE_URL } from "@/lib/apiClient";
import {
  Check, Crown, Shield, ArrowRight,
  BookOpen, GraduationCap, Sparkles,
} from "lucide-react";

const plans = [
  {
    key: "free", label: "Free", price: 0, badge: null,
    desc: "Start your medical learning journey.",
    cta: "Get Started Free", href: "/register",
    popular: false,
    features: [
      "2 PDF uploads",
      "20 AI questions/month",
      "10 AI Tutor sessions",
      "20 flashcard generations",
      "2 exam attempts/month",
      "Beginner Mode only",
      "Basic analytics",
    ],
  },
  {
    key: "student_pro", label: "Student Pro", price: 19, badge: "Most Popular",
    desc: "Unlock unlimited exam prep, AI tutor, and advanced analytics.",
    cta: "Start Pro",
    popular: true,
    features: [
      "50 PDF uploads",
      "750 AI messages/month",
      "Unlimited flashcards & exams",
      "All AI Tutor modes",
      "AI summaries & revision notes",
      "Weak-topic detection",
      "Progress dashboard",
      "Faster AI responses",
      "Priority email support",
    ],
  },
  {
    key: "premium", label: "Premium", price: 49, badge: "Best Value",
    desc: "Everything in Pro plus clinical simulations, OSCE prep, and premium AI.",
    cta: "Go Premium",
    popular: false,
    features: [
      "Unlimited PDF uploads",
      "2,500 AI messages/month",
      "Everything in Student Pro",
      "Premium AI model",
      "Clinical simulations",
      "OSCE & Viva mode",
      "Adaptive learning",
      "Personalized study plans",
      "Advanced analytics",
      "Exam readiness prediction",
      "Study heatmaps",
      "Early access to features",
    ],
  },
];

const faqs = [
  { q: "Can I switch plans anytime?", a: "Yes. Upgrade or downgrade at any time. Changes take effect immediately for upgrades." },
  { q: "Is there a free trial?", a: "Pro includes a 7-day free trial. No credit card required for Free." },
  { q: "What payments are accepted?", a: "Credit and debit cards via Lemon Squeezy, or M-Pesa for Kenyan customers." },
  { q: "Can I cancel anytime?", a: "Absolutely. Cancel from your account. Access continues until the billing period ends." },
  { q: "Is my payment info secure?", a: "Payments are processed by Lemon Squeezy (PCI Level 1) and Safaricom M-Pesa. We never store card details." },
];

export default function PricingPage() {
  const { user } = useAuth();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");

  const planKey = (base: string) => {
    if (base === "student_pro") return billing === "yearly" ? "student_pro_annual" : "student_pro_monthly";
    if (base === "premium") return billing === "yearly" ? "premium_annual" : "premium_monthly";
    return base;
  };

  const handleCheckout = async (base: string) => {
    const pk = planKey(base);
    setLoadingPlan(pk); setError("");
    try {
      const token = await getToken();
      if (!token) { window.location.href = "/login?redirect=pricing"; return; }
      const res = await fetch(`${API_BASE_URL}/payments/lemonsqueezy/checkout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ plan: pk }),
      });
      const data = await res.json();
      if (data.checkout_url) {
        window.location.href = data.checkout_url;
      } else {
        setError(data.detail || "Unable to start checkout.");
      }
    } catch {
      setError("A network error occurred. Please check your connection.");
    } finally { setLoadingPlan(null); }
  };

  const annualPrice = (monthly: number) => monthly > 0 ? monthly * 10 : 0;

  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
        <h1 className="text-4xl font-bold tracking-tight text-surface-900">Choose your plan</h1>
        <p className="mt-3 text-lg text-surface-500 max-w-2xl mx-auto">
          Start free. Upgrade when you need more power.
        </p>
      </motion.div>

      {/* Billing toggle */}
      <div className="flex items-center justify-center gap-3 mb-12">
        <button onClick={() => setBilling("monthly")}
          className={`px-5 py-2 text-sm font-semibold rounded-lg transition-all ${
            billing === "monthly" ? "bg-brand-600 text-white shadow-sm" : "text-surface-500 hover:text-surface-700"
          }`}>
          Monthly
        </button>
        <button onClick={() => setBilling("yearly")}
          className={`px-5 py-2 text-sm font-semibold rounded-lg transition-all ${
            billing === "yearly" ? "bg-brand-600 text-white shadow-sm" : "text-surface-500 hover:text-surface-700"
          }`}>
          Annual <span className="text-xs ml-0.5 opacity-80">Save ~17%</span>
        </button>
      </div>

      {error && (
        <div className="mb-6 mx-auto max-w-lg rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">{error}</div>
      )}

      <div className="grid gap-6 lg:grid-cols-3 items-start">
        {plans.map((plan, i) => {
          const displayPrice = billing === "yearly" ? annualPrice(plan.price) : plan.price;
          const priceLabel = plan.price === 0 ? "Free" : `$${displayPrice}`;
          const periodLabel = plan.price === 0 ? "" : billing === "yearly" ? "/year" : "/mo";
          return (
            <motion.div key={plan.key} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.05 }}
              className={`relative rounded-3xl border-2 p-8 transition-all ${
                plan.popular
                  ? "border-brand-500 bg-white shadow-xl shadow-brand-500/10 scale-[1.02] z-10"
                  : "border-surface-200 bg-white shadow-sm hover:shadow-md"
              }`}>
              {plan.badge && (
                <span className={`absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-4 py-1 text-xs font-semibold text-white shadow-sm ${
                  plan.key === "pro" ? "bg-brand-600" : "bg-gradient-to-r from-brand-500 to-purple-600"
                }`}>
                  {plan.badge}
                </span>
              )}

              <div className="flex items-center gap-2 mb-1">
                {plan.key === "free" && <BookOpen className="h-5 w-5 text-surface-400" />}
                {plan.key === "pro" && <Crown className="h-5 w-5 text-brand-500" />}
                {plan.key === "premium" && <Shield className="h-5 w-5 text-purple-500" />}
                <p className="text-sm font-semibold uppercase tracking-widest text-surface-400">{plan.label}</p>
              </div>

              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-bold text-surface-900">{priceLabel}</span>
                {periodLabel && <span className="text-sm text-surface-400">{periodLabel}</span>}
              </div>
              <p className="mt-2 text-sm text-surface-500">{plan.desc}</p>

              <button
                onClick={() => handleCheckout(plan.key)}
                disabled={loadingPlan !== null || plan.key === "free"}
                className={`mt-6 w-full rounded-xl px-5 py-3 text-sm font-semibold transition-all disabled:opacity-40 flex items-center justify-center gap-2 ${
                  plan.popular
                    ? "bg-brand-600 text-white shadow-sm hover:bg-brand-700"
                    : "border border-surface-200 text-surface-700 hover:bg-surface-50"
                }`}>
                {loadingPlan === planKey(plan.key) ? "Loading..." : plan.cta}
                {plan.popular && <ArrowRight className="h-4 w-4" />}
              </button>

              <ul className="mt-8 space-y-3">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-3 text-sm">
                    <Check className="h-4 w-4 text-accent-500 shrink-0 mt-0.5" />
                    <span className="text-surface-600">{f}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          );
        })}
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
