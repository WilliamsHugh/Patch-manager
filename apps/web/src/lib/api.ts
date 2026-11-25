export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

type CacheEntry = { value: unknown; expiresAt: number };

const responses = new Map<string, CacheEntry>();
const pendingReads = new Map<string, Promise<unknown>>();
let cacheScope: string | null = null;
let cacheVersion = 0;
let refreshRequest: Promise<boolean> | null = null;

function cacheDuration(path: string) {
  if (path === "/notifications") return 15_000;
  if (path === "/users") return 30_000;
  if (path === "/software" || path === "/patches" || path.startsWith("/patches?") || /^\/patches\/[^/?]+$/.test(path)) return 60_000;
  return 0;
}

export function clearApiCache() {
  cacheVersion += 1;
  responses.clear();
  pendingReads.clear();
}

export function setApiCacheScope(user: { id: string; role: string } | null) {
  const nextScope = user ? `${user.id}:${user.role}` : null;
  if (nextScope !== cacheScope) {
    clearApiCache();
    cacheScope = nextScope;
  }
}

export function getCachedApiData<T>(path: string): T | undefined {
  if (!cacheScope || !cacheDuration(path)) return undefined;
  const key = `${cacheScope}:${path}`;
  const entry = responses.get(key);
  if (!entry) return undefined;
  if (entry.expiresAt <= Date.now()) {
    responses.delete(key);
    return undefined;
  }
  return entry.value as T;
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (response.status === 204) return undefined as T;
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new ApiError(response.status, Array.isArray(body.message) ? body.message.join(", ") : body.message ?? "API request failed");
  }
  return response.json() as Promise<T>;
}

async function renewSession() {
  try {
    const response = await fetch("/api/auth/refresh", { method: "POST", credentials: "same-origin", cache: "no-store" });
    return response.ok;
  } catch {
    return false;
  }
}

async function requestApi<T>(path: string, init: RequestInit, retryOnUnauthorized: boolean): Promise<T> {
  const response = await fetch(`/api${path}`, { ...init, credentials: "same-origin", cache: "no-store", headers: { "Content-Type": "application/json", ...init.headers } });
  if (response.status === 401 && retryOnUnauthorized && !path.startsWith("/auth/")) {
    refreshRequest ??= renewSession().finally(() => { refreshRequest = null; });
    if (await refreshRequest) return requestApi<T>(path, init, false);
    setApiCacheScope(null);
    if (typeof window !== "undefined") window.dispatchEvent(new Event("patch:session-expired"));
  }
  return parseResponse<T>(response);
}

export async function apiClient<T>(path: string, init: RequestInit = {}, retryOnUnauthorized = true): Promise<T> {
  const method = (init.method ?? "GET").toUpperCase();
  const ttl = cacheDuration(path);
  const forceRefresh = init.cache === "reload";
  if (forceRefresh) clearApiCache();

  if (method === "GET" && ttl && cacheScope && !forceRefresh && init.cache !== "no-store") {
    const cached = getCachedApiData<T>(path);
    if (cached !== undefined) return cached;
    const key = `${cacheScope}:${path}`;
    const pending = pendingReads.get(key);
    if (pending) return pending as Promise<T>;
    const scope = cacheScope;
    const version = cacheVersion;
    const request = requestApi<T>(path, init, retryOnUnauthorized)
      .then((value) => {
        if (cacheScope === scope && cacheVersion === version) responses.set(key, { value, expiresAt: Date.now() + ttl });
        return value;
      })
      .finally(() => { if (pendingReads.get(key) === request) pendingReads.delete(key); });
    pendingReads.set(key, request);
    return request;
  }

  const value = await requestApi<T>(path, init, retryOnUnauthorized);
  if (method !== "GET" && method !== "HEAD") clearApiCache();
  if (method === "GET" && ttl && cacheScope && forceRefresh) {
    responses.set(`${cacheScope}:${path}`, { value, expiresAt: Date.now() + ttl });
  }
  return value;
}
