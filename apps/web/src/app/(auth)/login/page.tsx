"use client";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { login } from "@/lib/auth";
import { BrandSyncIcon } from "@/components/ui/icons";
import { LiquidGlassThemeToggle } from "@/components/ui/liquid-glass-theme-toggle";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      await login(email, password);
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="loginPage">
      <div className="loginThemeBar">
        <LiquidGlassThemeToggle />
      </div>
      <section className="loginBrand">
        <span>
          <BrandSyncIcon size={30} />
        </span>
        <h1>PatchFlow</h1>
        <p>Patch Management System</p>
        <small>Safely manage, assess, and deploy patches across your organization.</small>
      </section>
      <form className="loginCard" onSubmit={submit}>
        <h2>Sign in to PatchFlow</h2>
        <p>Use the account provided by your administrator.</p>
        <label>
          Email
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label>
          Password
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        {error && (
          <div className="loginError" role="alert">
            {error}
          </div>
        )}
        <button className="primary" disabled={loading}>
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </main>
  );
}
