import Link from "next/link";

export default function CTASection() {
  return (
    <section className="bg-surface-50 py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-4xl">
          <div className="grid gap-8 md:grid-cols-2">
            <div className="rounded-3xl border border-surface-200 bg-white p-8 shadow-sm transition-shadow hover:shadow-lg md:p-10">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-2xl">🎓</div>
              <h3 className="text-xl font-bold text-surface-900">For Students</h3>
              <p className="mt-3 text-sm leading-relaxed text-surface-500">Upload medical notes, generate smart flashcards, and get AI-powered Q&A with source citations.</p>
              <ul className="mt-4 space-y-2 text-sm text-surface-500">
                <li className="flex items-center gap-2"><span className="text-accent-500">✓</span> Smart flashcard generation</li>
                <li className="flex items-center gap-2"><span className="text-accent-500">✓</span> AI chat with your notes</li>
                <li className="flex items-center gap-2"><span className="text-accent-500">✓</span> Progress tracking</li>
              </ul>
              <Link href="/register" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700">Get Started →</Link>
            </div>
            <div className="rounded-3xl border border-surface-200 bg-white p-8 shadow-sm transition-shadow hover:shadow-lg md:p-10">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-accent-50 text-2xl">🏥</div>
              <h3 className="text-xl font-bold text-surface-900">For Everyone</h3>
              <p className="mt-3 text-sm leading-relaxed text-surface-500">Access general health guidance, symptom checking, and wellness tips. Always consult a doctor.</p>
              <ul className="mt-4 space-y-2 text-sm text-surface-500">
                <li className="flex items-center gap-2"><span className="text-accent-500">✓</span> Symptom checker</li>
                <li className="flex items-center gap-2"><span className="text-accent-500">✓</span> Health tips</li>
                <li className="flex items-center gap-2"><span className="text-accent-500">✓</span> Safety info</li>
              </ul>
              <Link href="/public" className="mt-6 inline-flex items-center gap-2 rounded-xl border border-surface-200 bg-white px-5 py-2.5 text-sm font-semibold text-surface-700 transition-colors hover:bg-surface-50">Explore →</Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
