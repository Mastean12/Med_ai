import { api } from "./apiClient";

export async function uploadDocument(file: File) {
  const form = new FormData();
  form.append("file", file);
  return api.post<{
    document_id: string;
    status: string;
    storage_path: string;
  }>("/documents/upload", form);
}

export async function studentChat(payload: {
  question: string;
  document_id: string;
  top_k?: number;
  use_llm?: boolean;
}) {
  return api.post<{
    answer: string;
    sources: { chunk_index: number; preview: string; similarity?: number }[];
    meta: Record<string, unknown>;
  }>("/student/chat", payload);
}

export async function listDocuments() {
  return api.get<{
    documents: {
      id: string;
      title: string;
      status?: string;
      created_at?: string;
      storage_path?: string;
    }[];
  }>("/documents");
}

export async function generateFlashcards(payload: {
  document_id: string;
  max_cards?: number;
}) {
  return api.post<{
    document_id: string;
    flashcards: { question: string; answer: string; chunk_index: number }[];
    total: number;
  }>("/flashcards/generate", payload);
}

export async function getStudentDashboard() {
  return api.get<{
    documents_uploaded: number;
    questions_asked: number;
    flashcards_created: number;
    recent_activity: { type: string; label: string; created_at?: string | null }[];
  }>("/student/dashboard");
}

export async function getStudyAnalytics() {
  return api.get<Record<string, unknown>>("/student/analytics");
}
