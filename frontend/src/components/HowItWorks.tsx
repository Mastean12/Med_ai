const steps = [
  { number: "01", title: "Upload Your Notes", description: "Upload PDFs of textbooks, lectures, or study guides. Text is extracted and indexed automatically." },
  { number: "02", title: "AI Processes Content", description: "Notes are chunked, embedded, and stored securely. Flashcards are generated from key concepts." },
  { number: "03", title: "Learn & Ask", description: "Review flashcards, ask questions, and get instant source-cited answers powered by advanced AI retrieval." },
];

export default function HowItWorks() {
  return (
    <section className="bg-surface-50 py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-brand-600">How It Works</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-surface-900 md:text-4xl">From PDF to knowledge in three steps</h2>
          <p className="mt-4 text-lg leading-relaxed text-surface-500">Getting started is simple. Upload, process, and start learning within minutes.</p>
        </div>
        <div className="mt-16 grid gap-12 md:grid-cols-3">
          {steps.map((step, idx) => (
            <div key={step.number} className="relative text-center">
              {idx < steps.length - 1 && <div className="absolute left-1/2 top-12 hidden h-px w-full bg-surface-300 md:block" />}
              <div className="relative mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-2xl bg-brand-600 text-2xl font-bold text-white shadow-lg shadow-brand-600/25">{step.number}</div>
              <h3 className="text-lg font-semibold text-surface-800">{step.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-surface-500">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
