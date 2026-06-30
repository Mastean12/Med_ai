import { getAccessToken } from "./auth";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "http://127.0.0.1:8000";

interface RequestOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: unknown;
  signal?: AbortSignal;
}

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function request<T = unknown>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const token = await getAccessToken();
  const url = `${API_BASE_URL}${path}`;

  const headers: Record<string, string> = {
    ...(options.headers || {}),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  if (options.body !== undefined && !(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(url, {
    method: options.method || "GET",
    headers,
    body:
      options.body instanceof FormData
        ? options.body
        : options.body !== undefined
          ? JSON.stringify(options.body)
          : undefined,
    signal: options.signal,
  });

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const err = await res.json();
      detail = err.detail || err.message || detail;
    } catch {}
    throw new ApiError(detail, res.status);
  }

  if (res.status === 204) return undefined as T;
  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return res.json();
  }
  return (await res.text()) as unknown as T;
}

export const api = {
  get: <T = unknown>(path: string, opts?: RequestOptions) =>
    request<T>(path, { ...opts, method: "GET" }),

  post: <T = unknown>(path: string, body?: unknown, opts?: RequestOptions) =>
    request<T>(path, { ...opts, method: "POST", body }),

  put: <T = unknown>(path: string, body?: unknown, opts?: RequestOptions) =>
    request<T>(path, { ...opts, method: "PUT", body }),

  delete: <T = unknown>(path: string, opts?: RequestOptions) =>
    request<T>(path, { ...opts, method: "DELETE" }),

  upload: <T = unknown>(path: string, formData: FormData, opts?: RequestOptions) =>
    request<T>(path, { ...opts, method: "POST", body: formData }),
};
