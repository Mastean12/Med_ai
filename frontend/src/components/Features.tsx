const features = [
  { title: "Smart Flashcards", description: "Upload your medical notes and AI generates concise, high-yield flashcards automatically for exam preparation.", icon: "🃏" },
  { title: "AI-Powered Q&A", description: "Ask questions about your notes and get instant, source-cited answers grounded in your documents.", icon: "🤖" },
  { title: "Progress Tracking", description: "Monitor your learning journey with streaks, analytics, and performance insights.", icon: "📊" },
  { title: "Public Health Guidance", description: "Access general health information and symptom guidance. Always consult a professional.", icon: "🏥" },
  { title: "Evidence-Based Answers", description: "Every answer references your uploaded materials for complete transparency.", icon: "📚" },
  { title: "Secure & Private", description: "Your medical notes are encrypted at rest. Built on Supabase with Row Level Security.", icon: "🔒" },
];

export default function Features() {
  return (
    <section className="bg-white py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-brand-600">Features</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-surface-900 md:text-4xl">Everything you need to excel</h2>
          <p className="mt-4 text-lg leading-relaxed text-surface-500">From automated flashcards to AI-powered Q&A — a complete toolkit for medical students.</p>
        </div>
        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="group rounded-2xl border border-surface-200 bg-white p-8 transition-all hover:shadow-lg hover:shadow-surface-200/50 hover:-translate-y-0.5">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-surface-100 text-2xl transition-colors group-hover:bg-brand-50">{f.icon}</div>
              <h3 className="text-lg font-semibold text-surface-800">{f.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-surface-500">{f.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
