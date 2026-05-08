const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local"
  );
}

type RequestOptions = {
  method?: string;
  headers?: Record<string, string>;
  body?: string | FormData;
};

async function supabaseRequest<T = unknown>(
  path: string,
  options: RequestOptions = {}
): Promise<{ data: T; error: null } | { data: null; error: { message: string; status: number } }> {
  const url = `${SUPABASE_URL}${path}`;

  const headers: Record<string, string> = {
    apikey: SUPABASE_ANON_KEY,
    ...(options.headers || {}),
  };

  if (options.body && typeof options.body === "string") {
    headers["Content-Type"] = "application/json";
  }

  try {
    const res = await fetch(url, {
      method: options.method || "GET",
      headers,
      body: options.body,
    });

    let data: T;
    const contentType = res.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      data = await res.json();
    } else {
      data = (await res.text()) as unknown as T;
    }

    if (!res.ok) {
      const errBody = data as Record<string, unknown>;
      return {
        data: null,
        error: {
          message: (errBody?.msg || errBody?.message || res.statusText) as string,
          status: res.status,
        },
      };
    }

    return { data, error: null };
  } catch (err) {
    return {
      data: null,
      error: {
        message: err instanceof Error ? err.message : "Network error",
        status: 0,
      },
    };
  }
}

export const supabase = {
  auth: {
    signUp: async (email: string, password: string) => {
      return supabaseRequest<{
        user: { id: string; email: string } | null;
        session: { access_token: string; refresh_token: string; expires_at: number } | null;
      }>("/auth/v1/signup", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
    },

    signInWithPassword: async (email: string, password: string) => {
      return supabaseRequest<{
        access_token: string;
        refresh_token: string;
        expires_at: number;
        user: { id: string; email: string };
      }>("/auth/v1/token?grant_type=password", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
    },

    getUser: async (token: string) => {
      return supabaseRequest<{
        id: string;
        email: string;
        role: string;
      }>("/auth/v1/user", {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });
    },

    refreshSession: async (refreshToken: string) => {
      return supabaseRequest<{
        access_token: string;
        refresh_token: string;
        expires_at: number;
        user: { id: string; email: string };
      }>("/auth/v1/token?grant_type=refresh_token", {
        method: "POST",
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
    },

    signOut: async (token: string) => {
      return supabaseRequest<null>("/auth/v1/logout", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
    },

    resetPasswordForEmail: async (email: string) => {
      return supabaseRequest<null>("/auth/v1/recover", {
        method: "POST",
        body: JSON.stringify({
          email,
          gotrue_meta_security: {},
        }),
      });
    },
  },
};
