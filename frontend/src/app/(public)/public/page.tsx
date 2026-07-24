import PortalCard from "@/components/PortalCard";

export default function PublicHome() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-surface-900">Public Health Portal</h1>
        <p className="mt-2 text-surface-500 max-w-md mx-auto">Accessible health information and guidance for everyone.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <PortalCard title="Symptom Checker" description="General health guidance based on your symptoms. Not a diagnosis." href="/public/symptom-checker" icon="🏥" />
        <PortalCard title="Health Tips" description="Evidence-based wellness tips for everyday healthy living." href="/public/tips" icon="💡" />
        <PortalCard title="Safety Notices" description="Emergency numbers, warning signs, and when to seek immediate care." href="/public/safety" icon="🛡️" />
      </div>
    </main>
  );
}
