export default function SafetyPage() {
  const emergencies = {
    numbers: [
      { region: "United States", number: "911" },
      { region: "United Kingdom", number: "999" },
      { region: "European Union", number: "112" },
      { region: "Australia", number: "000" },
      { region: "India", number: "112" },
    ],
    warningSigns: [
      "Chest pain or pressure",
      "Difficulty breathing or shortness of breath",
      "Sudden confusion or disorientation",
      "Severe bleeding that won't stop",
      "Loss of consciousness or fainting",
      "Sudden severe headache",
      "Seizure or convulsions",
      "Suicidal thoughts or self-harm urges",
    ],
  };

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-3xl">🛡️</div>
        <h1 className="text-2xl font-bold text-surface-900">Safety & Emergency</h1>
        <p className="mt-2 text-surface-500">Important safety information and emergency resources.</p>
      </div>

      <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
        <p className="text-sm font-semibold text-red-800">If you are experiencing a medical emergency, call emergency services immediately.</p>
        <p className="mt-1 text-xs text-red-600">Do not use this website for urgent medical concerns.</p>
      </div>

      <div className="mb-6 rounded-2xl border border-surface-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold text-surface-700">Emergency Numbers</h2>
        <div className="space-y-2">
          {emergencies.numbers.map((e) => (
            <div key={e.region} className="flex items-center justify-between rounded-xl border border-surface-100 bg-surface-50 px-4 py-3">
              <span className="text-sm text-surface-700">{e.region}</span>
              <span className="rounded-lg bg-red-100 px-3 py-1 text-sm font-bold text-red-700">{e.number}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-surface-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold text-surface-700">Warning Signs — Seek Emergency Care</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          {emergencies.warningSigns.map((sign) => (
            <div key={sign} className="flex items-center gap-2 rounded-xl border border-surface-100 bg-surface-50 px-4 py-3">
              <span className="text-red-400">⚠</span>
              <span className="text-sm text-surface-700">{sign}</span>
            </div>
          ))}
        </div>
      </div>

      <p className="mt-8 text-center text-xs text-surface-400">
        This is general information, not medical advice. Always consult a healthcare professional.
      </p>
    </main>
  );
}
