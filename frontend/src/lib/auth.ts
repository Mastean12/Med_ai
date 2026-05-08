import { supabase } from "./supabase";

const SESSION_KEY = "noctual_session";

export interface AuthUser {
  id: string;
  email: string | undefined;
}

interface StoredSession {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  user: AuthUser;
}

function saveSession(session: StoredSession) {
  if (typeof window === "undefined") return;
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

function loadSession(): StoredSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredSession;
  } catch {
    return null;
  }
}

function clearStoredSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(SESSION_KEY);
}

export function getStoredSession(): StoredSession | null {
  return loadSession();
}

export async function signUp(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp(email, password);

  if (error) {
    throw new Error(error.message);
  }

  return {
    user: data?.user
      ? { id: data.user.id, email: data.user.email }
      : null,
    session: data?.session,
    requiresEmailConfirmation: !!(data?.user && !data?.session),
  };
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword(email, password);

  if (error) {
    throw new Error(error.message);
  }

  if (!data?.user) {
    throw new Error("Login failed: no user returned");
  }

  const session: StoredSession = {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: data.expires_at,
    user: { id: data.user.id, email: data.user.email },
  };

  saveSession(session);

  return {
    user: session.user,
    session,
  };
}

export async function signOut() {
  const session = loadSession();
  if (session) {
    try {
      await supabase.auth.signOut(session.access_token);
    } catch {
      // Ignore signOut errors — still clear locally
    }
  }
  clearStoredSession();
}

export async function refreshSession(): Promise<StoredSession | null> {
  const session = loadSession();
  if (!session?.refresh_token) return null;

  const { data, error } = await supabase.auth.refreshSession(session.refresh_token);
  if (error || !data) {
    clearStoredSession();
    return null;
  }

  const newSession: StoredSession = {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: data.expires_at,
    user: { id: data.user.id, email: data.user.email },
  };

  saveSession(newSession);
  return newSession;
}

export async function resetPassword(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email);
  if (error) {
    throw new Error(error.message);
  }
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const session = loadSession();
  if (!session) return null;

  if (Date.now() / 1000 > session.expires_at) {
    const refreshed = await refreshSession();
    if (!refreshed) return null;
    return refreshed.user;
  }

  const { data, error } = await supabase.auth.getUser(session.access_token);
  if (error || !data) {
    const refreshed = await refreshSession();
    return refreshed?.user ?? null;
  }

  return { id: data.id, email: data.email };
}

export async function getAccessToken(): Promise<string | null> {
  const session = loadSession();
  if (!session) return null;

  if (Date.now() / 1000 > session.expires_at) {
    const refreshed = await refreshSession();
    return refreshed?.access_token ?? null;
  }

  return session.access_token;
}

export function getUserDisplayName(user: AuthUser | null): string {
  if (!user) return "";
  return user.email?.split("@")[0] ?? "User";
}
