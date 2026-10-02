import { apiClient } from "./api";
import type { User } from "@patch-management/shared";

let currentUser: User | null = null;

export function getCurrentUser() { return currentUser; }

export async function loadCurrentUser() {
  try {
    currentUser = await apiClient<User>("/users/me");
    return currentUser;
  } catch (error) {
    currentUser = null;
    throw error;
  }
}

export async function login(email: string, password: string) {
  currentUser = await apiClient<User>("/auth/login", { method: "POST", body: JSON.stringify({ email: email.trim().toLowerCase(), password }) }, false);
  return currentUser;
}

export async function logout() {
  try { await apiClient<void>("/auth/logout", { method: "POST" }, false); } finally { currentUser = null; }
}
