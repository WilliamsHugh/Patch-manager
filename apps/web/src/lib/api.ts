import type { AuthSession } from "./auth-storage";
import { clearSession, getAccessToken, getRefreshToken, saveSession } from "./auth-storage";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

export class ApiError extends Error { constructor(public status: number, message: string) { super(message); } }

let refreshRequest: Promise<boolean> | null = null;

async function parseResponse<T>(response: Response): Promise<T> {
  if (response.status === 204) return undefined as T;
  if (!response.ok) { const body = await response.json().catch(() => ({})); throw new ApiError(response.status, Array.isArray(body.message) ? body.message.join(", ") : body.message ?? "API request failed"); }
  return response.json() as Promise<T>;
}

async function renewSession() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;
  try {
    const response = await fetch(`${API_URL}/auth/refresh`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ refreshToken }) });
    if (!response.ok) throw new Error("Refresh token rejected");
    saveSession(await response.json() as AuthSession);
    return true;
  } catch {
    clearSession();
    return false;
  }
}

export async function apiClient<T>(path: string, init: RequestInit = {}, retryOnUnauthorized = true): Promise<T> {
  const token = getAccessToken();
  const response = await fetch(`${API_URL}${path}`, { ...init, headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...init.headers } });
  if (response.status === 401 && retryOnUnauthorized && !path.startsWith("/auth/")) {
    refreshRequest ??= renewSession().finally(() => { refreshRequest = null; });
    if (await refreshRequest) return apiClient<T>(path, init, false);
  }
  return parseResponse<T>(response);
}
