export default function SymptomCheckerPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Symptom Checker</h1>
      <div className="rounded-xl border bg-white p-6 space-y-3">
        <textarea
          placeholder="Describe symptoms (general info only)..."
          className="w-full rounded-lg border px-3 py-2"
          rows={4}
        />
        <button className="rounded-lg bg-black px-4 py-2 text-white">
          Send
        </button>

        <div className="mt-4 rounded-lg bg-yellow-50 p-3 text-sm">
          This tool provides general information and is not a medical diagnosis.
        </div>
      </div>
    </div>
  );
}