const stats = [
  { value: "10+", label: "AI interactions daily, free" },
  { value: "100%", label: "Source-cited from your notes" },
  { value: "24/7", label: "Study whenever you need" },
  { value: "Secure", label: "Encrypted, private storage" },
];

export default function Stats() {
  return (
    <section className="bg-brand-950 py-16 md:py-20">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-3xl font-bold text-white md:text-4xl">{stat.value}</p>
              <p className="mt-2 text-sm leading-relaxed text-brand-300">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
