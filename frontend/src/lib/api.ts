import { getToken } from "./auth";

const BASE = process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:8000";

function authHeaders(extra?: Record<string, string>) {
  const token = getToken();
  return {
    ...(extra || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function uploadDocument(file: File) {
  const form = new FormData();
  form.append("file", file);

  const res = await fetch(`${BASE}/documents/upload`, {
    method: "POST",
    headers: authHeaders(),
    body: form,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.detail || "Upload failed");

  return data as {
    document_id: string;
    status: string;
    storage_path: string;
  };
}

export async function studentChat(payload: {
  question: string;
  document_id: string;
  top_k?: number;
}) {
  const res = await fetch(`${BASE}/student/chat`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.detail || "Chat failed");

  return data as {
    answer: string;
    sources: {
      chunk_index: number;
      preview: string;
      similarity?: number;
    }[];
    meta: Record<string, any>;
  };
}

export async function listDocuments() {
  const res = await fetch(`${BASE}/documents`, {
    method: "GET",
    headers: authHeaders(),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.detail || "Failed to load documents");

  return data as {
    documents: {
      id: string;
      title: string;
      status?: string;
      created_at?: string;
      storage_path?: string;
    }[];
  };
}

export async function generateFlashcards(payload: {
  document_id: string;
  max_cards?: number;
}) {
  const res = await fetch(`${BASE}/flashcards/generate`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data?.detail || "Failed to generate flashcards");
  }

  return data as {
    document_id: string;
    flashcards: {
      question: string;
      answer: string;
      chunk_index: number;
    }[];
    total: number;
  };
}

export async function getStudentDashboard() {
  const res = await fetch(`${BASE}/student/dashboard`, {
    method: "GET",
    headers: authHeaders(),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data?.detail || "Failed to load student dashboard");
  }

  return data as {
    documents_uploaded: number;
    questions_asked: number;
    flashcards_created: number;
    recent_activity: {
      type: string;
      label: string;
      created_at?: string | null;
    }[];
  };
}