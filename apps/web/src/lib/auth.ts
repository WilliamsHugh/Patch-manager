import { apiClient } from "./api";
import { clearSession, getStoredUser, saveSession, type AuthSession } from "./auth-storage";

export type LoginResponse = AuthSession;

export async function login(email: string, password: string) {
  const session = await apiClient<LoginResponse>("/auth/login", { method: "POST", body: JSON.stringify({ email: email.trim().toLowerCase(), password }) }, false);
  saveSession(session);
  return session;
}

export async function logout() {
  try { await apiClient<void>("/auth/logout", { method: "POST" }, false); } finally { clearSession(); }
}

export { getStoredUser };
