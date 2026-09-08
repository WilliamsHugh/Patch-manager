import type { User } from "@patch-management/shared"; import { apiClient } from "./api";
export type LoginResponse = { accessToken: string; user: User };
export async function login(email: string, password: string) { const result = await apiClient<LoginResponse>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }); localStorage.setItem("accessToken", result.accessToken); localStorage.setItem("user", JSON.stringify(result.user)); return result; }
export function logout() { localStorage.removeItem("accessToken"); localStorage.removeItem("user"); }
export function getStoredUser(): User | null { if (typeof window === "undefined") return null; const raw = localStorage.getItem("user"); return raw ? JSON.parse(raw) : null; }
