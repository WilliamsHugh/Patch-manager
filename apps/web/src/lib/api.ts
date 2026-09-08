const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

export class ApiError extends Error { constructor(public status: number, message: string) { super(message); } }

export async function apiClient<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
  const response = await fetch(`${API_URL}${path}`, { ...init, headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...init.headers } });
  if (!response.ok) { const body = await response.json().catch(() => ({})); throw new ApiError(response.status, body.message ?? "API request failed"); }
  return response.json() as Promise<T>;
}
