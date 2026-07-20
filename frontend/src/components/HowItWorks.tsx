"use client";

import { Upload, Brain, GraduationCap, Sparkles, ArrowRight } from "lucide-react";

const steps = [
  {
    number: "01",
    title: "Upload Your Notes",
    desc: "Drop PDFs of your textbooks, lecture slides, or study guides. Text is extracted and indexed instantly.",
    icon: Upload,
    gradient: "from-[#5B5CEB] to-[#7C3AED]",
  },
  {
    number: "02",
    title: "AI Processes Content",
    desc: "Your notes are chunked, embedded, and stored securely. Flashcards, summaries, and practice questions are auto-generated.",
    icon: Brain,
    gradient: "from-[#7C3AED] to-[#8B5CF6]",
  },
  {
    number: "03",
    title: "Learn & Master",
    desc: "Review smart flashcards, take AI-generated exams, chat with your tutor, and track your progress over time.",
    icon: GraduationCap,
    gradient: "from-[#8B5CF6] to-[#5B5CEB]",
  },
];

const metrics = [
  { value: "10x", label: "Faster studying" },
  { value: "94%", label: "Knowledge retention" },
  { value: "50K+", label: "Active users" },
];

export default function HowItWorks() {
  return (
    <section className="relative overflow-hidden bg-white py-24 md:py-32">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,#eef2ff,transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,#f5f3ff,transparent_50%)]" />

      <div className="relative mx-auto max-w-7xl px-6">
        {/* Header */}
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-purple-200 bg-purple-50 px-4 py-1.5 text-xs font-semibold text-purple-700">
            <Sparkles className="h-3 w-3" /> How It Works
          </span>
          <h2 className="mt-4 text-4xl font-bold tracking-tight text-surface-900 md:text-5xl">
            From PDF to mastery in{" "}
            <span className="bg-gradient-to-r from-[#5B5CEB] to-[#8B5CF6] bg-clip-text text-transparent">
              three steps
            </span>
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-surface-500">
            Upload your materials once and get a complete AI-powered learning system.
          </p>
        </div>

        {/* Steps */}
        <div className="mt-20 grid gap-8 md:grid-cols-3">
          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <div key={step.number} className="group relative">
                {/* Connected line (desktop) */}
                {i < steps.length - 1 && (
                  <div className="absolute left-[calc(50%+60px)] top-20 hidden h-px w-[calc(100%-120px)] items-center md:flex">
                    <div className="h-px w-full bg-gradient-to-r from-purple-200 to-purple-300" />
                    <ArrowRight className="absolute right-0 h-4 w-4 text-purple-400" />
                  </div>
                )}

                <div className="relative flex flex-col items-center text-center">
                  {/* Number badge */}
                  <div className={`relative mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br ${step.gradient} shadow-lg shadow-purple-500/20 ring-4 ring-white`}>
                    <Icon className="h-8 w-8 text-white" />
                  </div>

                  {/* Step number label */}
                  <span className="mb-2 text-xs font-bold uppercase tracking-widest text-purple-500">
                    Step {step.number}
                  </span>

                  <h3 className="text-xl font-bold text-surface-900">{step.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-surface-500 max-w-sm">{step.desc}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Metrics bar */}
        <div className="mt-20 rounded-2xl border border-purple-100 bg-gradient-to-r from-purple-50/80 via-white to-purple-50/80 p-8 shadow-sm">
          <div className="grid gap-8 sm:grid-cols-3">
            {metrics.map((m) => (
              <div key={m.label} className="text-center">
                <p className="text-3xl font-bold bg-gradient-to-r from-[#5B5CEB] to-[#8B5CF6] bg-clip-text text-transparent">
                  {m.value}
                </p>
                <p className="mt-1 text-sm text-surface-500">{m.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
