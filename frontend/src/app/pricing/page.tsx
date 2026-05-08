"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:8000";

const plans = [
  {
    tier: "Free",
    priceMonthly: 0,
    priceYearly: 0,
    description: "Get started with basic AI-powered study tools.",
    features: [
      "3 document uploads",
      "20 AI questions/day",
      "Basic flashcards",
      "Limited summarization",
      "Symptom checker access",
      "Health tips library",
    ],
    cta: "Get Started Free",
    href: "/register",
    featured: false,
  },
  {
    tier: "Pro",
    priceMonthly: 19,
    priceYearly: 190,
    description: "Unlock advanced AI tutoring and unlimited study tools.",
    features: [
      "50 document uploads/month",
      "200 AI questions/month",
      "100 flashcard generations",
      "Unlimited AI chat",
      "Spaced repetition system",
      "Exam preparation mode",
      "Advanced analytics dashboard",
      "Priority AI access",
    ],
    cta: "Start Pro Trial",
    featured: true,
  },
  {
    tier: "Premium",
    priceMonthly: 49,
    priceYearly: 490,
    description: "For serious learners — clinical simulations, unlimited everything.",
    features: [
      "Unlimited everything",
      "Clinical case simulations",
      "Adaptive learning AI",
      "Advanced coaching mode",
      "Performance analytics",
      "University group tools",
      "Priority AI (fastest model)",
      "Early access to features",
      "Dedicated support",
    ],
    cta: "Go Premium",
    featured: false,
  },
];

const faqs = [
  { q: "Can I switch plans anytime?", a: "Yes. Upgrade or downgrade anytime. Changes take effect at the next billing cycle." },
  { q: "Is there a free trial?", a: "Yes! The Pro plan includes a 7-day free trial. No credit card required for Free tier." },
  { q: "What payment methods are supported?", a: "We accept credit/debit cards via Stripe globally, and M-Pesa in Kenya." },
  { q: "Can I cancel my subscription?", a: "Absolutely. Cancel anytime from your account settings. You'll keep access until the period ends." },
  { q: "Is my payment information secure?", a: "Yes. Payments are processed by Stripe — a PCI-DSS Level 1 certified provider. We never store card details." },
  { q: "Do you offer student discounts?", a: "We're working on a student program. Contact us for institutional or bulk pricing." },
];

export default function PricingPage() {
  const { user } = useAuth();
  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const handleCheckout = async (plan: string) => {
    if (plan === "free") return;
    setLoadingPlan(plan);

    try {
      const res = await fetch(`${BACKEND}/billing/create-checkout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(user ? { Authorization: `Bearer ${await getToken()}` } : {}),
        },
        body: JSON.stringify({ plan, billing_interval: billing }),
      });
      const data = await res.json();

      if (data.checkout_url) {
        window.location.href = data.checkout_url;
      } else if (!user) {
        window.location.href = "/login?redirect=pricing";
      }
    } catch {
      if (!user) window.location.href = "/login?redirect=pricing";
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <div className="text-center mb-12">
        <p className="text-sm font-semibold uppercase tracking-widest text-brand-600">Pricing</p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight text-surface-900">Simple, transparent pricing</h1>
        <p className="mt-4 text-lg text-surface-500 max-w-2xl mx-auto">
          Start free. Upgrade when you need more power. All plans include access to our core AI study tools.
        </p>

        <div className="mt-8 inline-flex rounded-xl border border-surface-200 bg-surface-100 p-1">
          <button
            onClick={() => setBilling("monthly")}
            className={`rounded-lg px-5 py-2 text-sm font-medium transition-all ${
              billing === "monthly" ? "bg-white text-surface-900 shadow-sm" : "text-surface-500 hover:text-surface-700"
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBilling("yearly")}
            className={`rounded-lg px-5 py-2 text-sm font-medium transition-all ${
              billing === "yearly" ? "bg-white text-surface-900 shadow-sm" : "text-surface-500 hover:text-surface-700"
            }`}
          >
            Yearly <span className="text-xs text-accent-600 font-semibold">Save 17%</span>
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {plans.map((plan) => (
          <div
            key={plan.tier}
            className={`relative rounded-3xl border-2 p-8 transition-all ${
              plan.featured
                ? "border-brand-500 bg-white shadow-xl shadow-brand-500/10 scale-[1.02]"
                : "border-surface-200 bg-white shadow-sm hover:shadow-md"
            }`}
          >
            {plan.featured && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-600 px-4 py-1 text-xs font-semibold text-white">
                Most Popular
              </span>
            )}

            <p className="text-sm font-semibold uppercase tracking-widest text-surface-500">{plan.tier}</p>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="text-4xl font-bold text-surface-900">
                ${billing === "monthly" ? plan.priceMonthly : plan.priceYearly}
              </span>
              {plan.priceMonthly > 0 && (
                <span className="text-sm text-surface-500">/{billing === "monthly" ? "mo" : "yr"}</span>
              )}
            </div>
            <p className="mt-3 text-sm leading-relaxed text-surface-500">{plan.description}</p>

            <button
              onClick={() => handleCheckout(plan.tier.toLowerCase())}
              disabled={loadingPlan === plan.tier.toLowerCase()}
              className={`mt-6 w-full rounded-xl px-5 py-3 text-sm font-semibold transition-all disabled:opacity-40 ${
                plan.featured
                  ? "bg-brand-600 text-white shadow-sm hover:bg-brand-700"
                  : plan.priceMonthly === 0
                    ? "border border-surface-200 text-surface-700 hover:bg-surface-50"
                    : "bg-surface-900 text-white hover:bg-surface-800"
              }`}
            >
              {loadingPlan === plan.tier.toLowerCase() ? "Loading..." : plan.cta}
            </button>

            <ul className="mt-8 space-y-3">
              {plan.features.map((feat) => (
                <li key={feat} className="flex items-start gap-3 text-sm text-surface-600">
                  <span className="mt-0.5 text-accent-500 shrink-0">✓</span>
                  {feat}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="mt-24">
        <h2 className="text-center text-2xl font-bold text-surface-900">Frequently asked questions</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {faqs.map((faq) => (
            <div key={faq.q} className="rounded-2xl border border-surface-200 bg-white p-6">
              <p className="text-sm font-semibold text-surface-800">{faq.q}</p>
              <p className="mt-2 text-sm leading-relaxed text-surface-500">{faq.a}</p>
            </div>
          ))}
        </div>
      </div>
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
