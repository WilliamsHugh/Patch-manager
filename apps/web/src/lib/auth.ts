import { apiClient, setApiCacheScope } from "./api";
import type { User } from "@patch-management/shared";

let currentUser: User | null = null;

export function getCurrentUser() { return currentUser; }

export async function loadCurrentUser() {
  try {
    currentUser = await apiClient<User>("/users/me");
    setApiCacheScope(currentUser);
    return currentUser;
  } catch (error) {
    currentUser = null;
    setApiCacheScope(null);
    throw error;
  }
}

export async function login(email: string, password: string) {
  currentUser = await apiClient<User>("/auth/login", { method: "POST", body: JSON.stringify({ email: email.trim().toLowerCase(), password }) }, false);
  setApiCacheScope(currentUser);
  return currentUser;
}

export async function logout() {
  try { await apiClient<void>("/auth/logout", { method: "POST" }, false); } finally { currentUser = null; setApiCacheScope(null); }
}
