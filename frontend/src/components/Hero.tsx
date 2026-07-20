import Link from "next/link";

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-white">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,#eef2ff,transparent_60%)]" />
      <div className="relative mx-auto max-w-7xl px-6 pb-24 pt-20 md:pb-32 md:pt-28">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-surface-200 bg-white/90 px-4 py-1.5 text-sm font-medium text-surface-600 backdrop-blur">
            <span className="flex h-2 w-2 rounded-full bg-accent-500 animate-pulse-soft" />
            Shaping Tomorrow's Healthcare Professionals
          </div>
          <h1 className="text-4xl font-bold leading-tight tracking-tight text-surface-900 md:text-5xl lg:text-6xl">
            Smarter study.
            <br />
            <span className="bg-gradient-to-r from-brand-600 to-purple-600 bg-clip-text text-transparent">Better patient outcomes.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-surface-500">
            Medaitutor transforms your medical notes into interactive flashcards and AI-powered Q&A sessions. Built for students, designed for everyone.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/register" className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-8 py-4 text-base font-semibold text-white shadow-lg shadow-brand-600/25 transition-all hover:bg-brand-700 hover:shadow-xl hover:shadow-brand-600/30 sm:w-auto">
              Start Learning Free
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
            </Link>
            <Link href="/public" className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-surface-200 bg-white px-8 py-4 text-base font-semibold text-surface-700 transition-all hover:border-surface-300 hover:bg-surface-50 sm:w-auto">
              Explore Public Portal
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" /></svg>
            </Link>
          </div>
          <p className="mt-6 text-sm text-surface-400">No credit card required. 10 free AI interactions daily.</p>
        </div>
      </div>
    </section>
  );
}
