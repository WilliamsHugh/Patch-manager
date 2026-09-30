export class ApiError extends Error { constructor(public status: number, message: string) { super(message); } }

let refreshRequest: Promise<boolean> | null = null;

async function parseResponse<T>(response: Response): Promise<T> {
  if (response.status === 204) return undefined as T;
  if (!response.ok) { const body = await response.json().catch(() => ({})); throw new ApiError(response.status, Array.isArray(body.message) ? body.message.join(", ") : body.message ?? "API request failed"); }
  return response.json() as Promise<T>;
}

async function renewSession() {
  try {
    const response = await fetch("/api/auth/refresh", { method: "POST", credentials: "same-origin", cache: "no-store" });
    if (!response.ok) return false;
    return true;
  } catch {
    return false;
  }
}

export async function apiClient<T>(path: string, init: RequestInit = {}, retryOnUnauthorized = true): Promise<T> {
  const response = await fetch(`/api${path}`, { ...init, credentials: "same-origin", cache: "no-store", headers: { "Content-Type": "application/json", ...init.headers } });
  if (response.status === 401 && retryOnUnauthorized && !path.startsWith("/auth/")) {
    refreshRequest ??= renewSession().finally(() => { refreshRequest = null; });
    if (await refreshRequest) return apiClient<T>(path, init, false);
    if (typeof window !== "undefined") window.dispatchEvent(new Event("patch:session-expired"));
  }
  return parseResponse<T>(response);
}
