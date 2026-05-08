export default function TipsPage() {
  const tips = [
    { title: "Stay Hydrated", desc: "Drink 6–8 glasses of water daily to maintain optimal bodily functions." },
    { title: "Quality Sleep", desc: "Aim for 7–9 hours of sleep per night. Consistent sleep schedules improve cognitive function." },
    { title: "Regular Exercise", desc: "At least 150 minutes of moderate activity per week supports cardiovascular health." },
    { title: "Balanced Diet", desc: "Include fruits, vegetables, lean proteins, and whole grains in your meals." },
    { title: "Stress Management", desc: "Practice mindfulness, deep breathing, or meditation to reduce daily stress." },
    { title: "Preventive Care", desc: "Schedule regular check-ups and stay current with recommended screenings." },
  ];

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent-50 text-3xl">💡</div>
        <h1 className="text-2xl font-bold text-surface-900">Health Tips</h1>
        <p className="mt-2 text-surface-500 max-w-md mx-auto">Evidence-based wellness guidance for everyday health.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tips.map((tip) => (
          <div key={tip.title} className="rounded-2xl border border-surface-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
            <h3 className="text-sm font-semibold text-surface-800">{tip.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-surface-500">{tip.desc}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-xs leading-relaxed text-amber-800 text-center">
        This is general health information, not medical advice. Consult a healthcare professional for personal concerns.
      </div>
    </main>
  );
}
