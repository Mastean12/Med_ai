import PortalCard from "@/components/PortalCard";

export default function StudentHome() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Student Portal</h1>

      <div className="grid gap-4 md:grid-cols-2">
        <PortalCard title="Upload Notes" description="Upload PDFs to your knowledge base." href="/student/upload" />
        <PortalCard title="Chat" description="Ask questions grounded in your notes." href="/student/chat" />
        <PortalCard title="Flashcards" description="Generate and review flashcards." href="/student/flashcards" />
        <PortalCard title="Progress" description="Track your learning and usage." href="/student/progress" />
      </div>
    </div>
  );
}