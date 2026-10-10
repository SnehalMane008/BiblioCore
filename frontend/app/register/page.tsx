"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthCard } from "@/components/auth-card";
import { PasswordInput } from "@/components/password-input";
import { api } from "@/lib/api";

export default function Register() {
  const [name, setName] = useState("");
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
      await api("/api/auth/register", { method: "POST", body: JSON.stringify({ name, email, password }) });
      const requested = new URLSearchParams(window.location.search).get("next");
      router.push(requested?.startsWith("/") && !requested.startsWith("//") ? requested : "/dashboard");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not register");
    } finally {
      setBusy(false);
    }
  }

  return <AuthCard title="Create your account" submit={submit} error={error} busy={busy}>
    <label className="block text-sm font-semibold">Name<input required maxLength={120} autoComplete="name" value={name} onChange={event => setName(event.target.value)} className="mt-1.5 min-h-12 w-full rounded-xl border border-line bg-white px-4 py-3" /></label>
    <label className="mt-5 block text-sm font-semibold">Email<input required type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} className="mt-1.5 min-h-12 w-full rounded-xl border border-line bg-white px-4 py-3" /></label>
    <div className="mt-5"><label htmlFor="register-password" className="block text-sm font-semibold">Password <span className="font-normal text-muted">(8 characters)</span></label><PasswordInput id="register-password" minLength={8} maxLength={8} autoComplete="new-password" value={password} onChange={setPassword} /></div>
    <p className="mt-6 text-center text-sm text-muted">Already registered? <Link className="font-bold text-blue hover:underline" href="/login">Sign in</Link></p>
  </AuthCard>;
}
