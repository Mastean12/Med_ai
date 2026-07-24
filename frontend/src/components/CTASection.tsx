import Link from "next/link";
import { GraduationCap, HeartPulse } from "lucide-react";

export default function CTASection() {
  return (
    <section className="relative overflow-hidden bg-white py-24 md:py-32">
      <div className="absolute inset-0 bg-gradient-to-br from-brand-50/80 via-white to-purple-50/80" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full bg-gradient-to-br from-brand-400/5 to-purple-400/5 blur-[120px]" />

      <div className="relative mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-4xl">
          <div className="grid gap-8 md:grid-cols-2">
            {/* For Students */}
            <div className="group rounded-3xl border border-surface-200 bg-white p-8 shadow-sm transition-all hover:shadow-lg hover:shadow-brand-500/5 md:p-10">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#5B5CEB]/10 to-[#8B5CF6]/10">
                <GraduationCap className="h-6 w-6 text-[#5B5CEB]" />
              </div>
              <h3 className="text-xl font-bold text-surface-900">For Students</h3>
              <p className="mt-3 text-sm leading-relaxed text-surface-500">
                Upload your notes, chat with an AI tutor, generate flashcards, take practice exams, and track your progress — all in one place.
              </p>
              <ul className="mt-5 space-y-2.5 text-sm text-surface-500">
                <li className="flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#5B5CEB]/10 text-xs text-[#5B5CEB]">✓</span>
                  Upload PDFs and study materials
                </li>
                <li className="flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#5B5CEB]/10 text-xs text-[#5B5CEB]">✓</span>
                  AI Tutor with personalized sessions
                </li>
                <li className="flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#5B5CEB]/10 text-xs text-[#5B5CEB]">✓</span>
                  Smart flashcards and exam mode
                </li>
                <li className="flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#5B5CEB]/10 text-xs text-[#5B5CEB]">✓</span>
                  Progress tracking and analytics
                </li>
              </ul>
              <Link
                href="/register"
                className="mt-7 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#5B5CEB] to-[#8B5CF6] px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:shadow-md hover:shadow-purple-500/25"
              >
                Get Started Free
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </Link>
            </div>

            {/* For Everyone */}
            <div className="group rounded-3xl border border-surface-200 bg-white p-8 shadow-sm transition-all hover:shadow-lg hover:shadow-brand-500/5 md:p-10">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#5B5CEB]/10 to-[#8B5CF6]/10">
                <HeartPulse className="h-6 w-6 text-[#5B5CEB]" />
              </div>
              <h3 className="text-xl font-bold text-surface-900">For Everyone</h3>
              <p className="mt-3 text-sm leading-relaxed text-surface-500">
                Access reliable health information, symptom guidance, and wellness tips from trusted medical sources.
              </p>
              <ul className="mt-5 space-y-2.5 text-sm text-surface-500">
                <li className="flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#5B5CEB]/10 text-xs text-[#5B5CEB]">✓</span>
                  Symptom checker and health tips
                </li>
                <li className="flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#5B5CEB]/10 text-xs text-[#5B5CEB]">✓</span>
                  Evidence-based health information
                </li>
                <li className="flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#5B5CEB]/10 text-xs text-[#5B5CEB]">✓</span>
                  Safety guidelines and wellness
                </li>
              </ul>
              <Link
                href="/public"
                className="mt-7 inline-flex items-center gap-2 rounded-xl border border-surface-200 px-6 py-3 text-sm font-semibold text-surface-700 transition-all hover:border-surface-300 hover:bg-surface-50"
              >
                Explore Public Portal
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
