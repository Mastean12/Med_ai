"use client";

import {
  Upload, MessageSquare, Brain, StickyNote,
  PenTool, BarChart3, BookOpen, Shield,
  Search, HeartPulse, Sparkles,
} from "lucide-react";

const features = [
  {
    title: "Upload Notes",
    desc: "Upload PDFs of your textbooks, lectures, and study guides. Your materials are processed and indexed for instant access.",
    icon: Upload,
  },
  {
    title: "AI Chat",
    desc: "Ask questions about your notes and get instant, source-cited answers grounded in your uploaded materials.",
    icon: MessageSquare,
  },
  {
    title: "AI Tutor",
    desc: "Get personalized tutoring sessions with adaptive explanations, practice questions, and step-by-step guidance.",
    icon: Brain,
  },
  {
    title: "Smart Flashcards",
    desc: "Automatically generate high-yield flashcards from your notes. Use spaced repetition to reinforce key concepts.",
    icon: StickyNote,
  },
  {
    title: "Exam Mode",
    desc: "Take timed, AI-generated exams based on your curriculum. Get detailed performance analytics and topic breakdowns.",
    icon: PenTool,
  },
  {
    title: "Progress Tracking",
    desc: "Monitor your learning journey with streaks, study statistics, and performance insights across all subjects.",
    icon: BarChart3,
  },
  {
    title: "Public Health Portal",
    desc: "Access evidence-based health information, symptom guidance, and wellness tips from trusted medical sources.",
    icon: HeartPulse,
  },
  {
    title: "Research Assistant",
    desc: "Search across medical literature and your notes simultaneously. Get concise, cited answers to complex questions.",
    icon: Search,
  },
  {
    title: "Clinical Simulations",
    desc: "Practice with realistic clinical case scenarios. Develop diagnostic reasoning in a risk-free environment.",
    icon: Shield,
  },
];

export default function Features() {
  return (
    <section className="relative overflow-hidden bg-surface-50 py-24 md:py-32">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,#eef2ff,transparent_50%)]" />

      <div className="relative mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-4 py-1.5 text-xs font-semibold text-brand-700">
            <Sparkles className="h-3 w-3" /> Features
          </span>
          <h2 className="mt-4 text-4xl font-bold tracking-tight text-surface-900 md:text-5xl">
            Everything you need to excel
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-surface-500">
            A complete AI-powered toolkit designed for medical students.
          </p>
        </div>

        <div className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <div
                key={f.title}
                className="group rounded-2xl border border-surface-200 bg-white p-6 transition-all hover:shadow-lg hover:shadow-brand-500/5 hover:-translate-y-0.5"
              >
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-brand-50 to-purple-50 text-brand-600 transition-colors">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-base font-semibold text-surface-800">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-surface-500">{f.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
