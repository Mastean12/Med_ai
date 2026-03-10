import PortalCard from "@/components/PortalCard";

export default function PublicHome() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Public Portal</h1>

      <div className="grid gap-4 md:grid-cols-2">
        <PortalCard title="Symptom Checker" description="Chat for general guidance (not diagnosis)." href="/public/symptom-checker" />
        <PortalCard title="Health Tips" description="General wellness tips and education." href="/public/tips" />
        <PortalCard title="Safety Notices" description="Important safety and emergency guidance." href="/public/safety" />
      </div>
    </div>
  );
}