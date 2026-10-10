"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthCard } from "@/components/auth-card";
import { PasswordInput } from "@/components/password-input";
import { api } from "@/lib/api";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
      const requested = new URLSearchParams(window.location.search).get("next");
      router.push(requested?.startsWith("/") && !requested.startsWith("//") ? requested : "/dashboard");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not sign in");
    } finally {
      setBusy(false);
    }
  }

  return <AuthCard title="Welcome back" submit={submit} error={error} busy={busy}>
    <label className="block text-sm font-semibold">Email<input required type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} className="mt-1.5 min-h-12 w-full rounded-xl border border-line bg-white px-4 py-3" /></label>
    <div className="mt-5"><label htmlFor="login-password" className="block text-sm font-semibold">Password</label><PasswordInput id="login-password" autoComplete="current-password" value={password} onChange={setPassword} /></div>
    <p className="mt-6 text-center text-sm text-muted">New to BiblioCore? <Link className="font-bold text-blue hover:underline" href="/register">Create an account</Link></p>
  </AuthCard>;
}
