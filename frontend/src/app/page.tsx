import PortalCard from "@/components/PortalCard";

export default function HomePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Welcome to Noctual AI</h1>
        <p className="mt-2 text-gray-600">
          Choose your portal to continue.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <PortalCard
          title="Student Portal"
          description="Upload notes, ask questions, create flashcards, track progress."
          href="/student"
        />
        <PortalCard
          title="Public Portal"
          description="Symptom checker chat, general health tips, safety notices."
          href="/public"
        />
      </div>
    </div>
  );
}