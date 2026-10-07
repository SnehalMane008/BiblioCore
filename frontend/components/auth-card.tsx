"use client";

import Link from "next/link";
import { ArrowRight, BookOpen, Check, FileText, Quote, Sparkles } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

export function AuthCard({ title, submit, error, busy, children }: { title: string; submit: (e: React.FormEvent) => void; error: string; busy: boolean; children: React.ReactNode }) {
  return <main className="min-h-screen bg-canvas p-4 sm:p-7 lg:p-10">
    <div className="mx-auto grid min-h-[calc(100vh-2rem)] max-w-[1180px] overflow-hidden rounded-[32px] border border-line bg-white shadow-[0_28px_90px_rgba(30,49,92,.12)] sm:min-h-[calc(100vh-3.5rem)] lg:grid-cols-[1.04fr_.96fr]">
      <section className="auth-art relative hidden flex-col justify-between overflow-hidden bg-indigo-950 p-10 text-white lg:flex xl:p-14">
        <div className="relative z-[1]"><Link href="/" className="inline-flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl border border-white/20 bg-white/10"><BookOpen size={22} /></span><span className="text-xl font-extrabold tracking-tight">BiblioCore</span></Link>
          <p className="mt-20 text-xs font-bold uppercase tracking-[.17em] text-indigo-200">A clearer way to read</p><h2 className="mt-4 max-w-lg text-4xl font-extrabold leading-[1.1] tracking-tight xl:text-5xl">Spend less time decoding. More time thinking.</h2><p className="mt-5 max-w-lg text-base leading-7 text-indigo-100/75">Bring your academic papers into one grounded workspace. Explore the findings and follow every answer back to its source.</p>
          <div className="mt-8 space-y-3">{["Page-level citations", "Structured paper insights", "A private research library"].map(item => <div key={item} className="flex items-center gap-3 text-sm font-semibold text-indigo-50"><span className="grid h-6 w-6 place-items-center rounded-full bg-emerald-300/15 text-emerald-200"><Check size={14} /></span>{item}</div>)}</div>
        </div>
        <div className="auth-paper-card relative z-[1] mx-auto mt-12 w-full max-w-[410px] rounded-3xl border border-white/15 bg-white/10 p-5 shadow-2xl backdrop-blur-xl">
          <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-white/10 text-indigo-100"><FileText size={19} /></span><span><span className="block text-sm font-bold">Paper overview</span><span className="text-xs text-indigo-100/65">From your indexed research</span></span><Sparkles size={17} className="ml-auto text-amber-200" /></div>
          <div className="mt-5 h-2 w-2/3 rounded bg-white/20" /><div className="mt-2 h-2 w-full rounded bg-white/10" /><div className="mt-2 h-2 w-5/6 rounded bg-white/10" />
          <div className="mt-5 flex items-center gap-3 rounded-2xl border border-white/10 bg-indigo-950/40 p-3"><Quote size={16} className="shrink-0 text-indigo-200" /><span className="text-xs leading-5 text-indigo-50/80">“The excerpts point to the finding…”</span><span className="ml-auto shrink-0 rounded-lg bg-white/10 px-2 py-1 text-[10px] font-bold">PAGE 08</span></div>
        </div>
        <div className="relative z-[1] mt-8 flex items-center justify-between text-xs text-indigo-100/60"><span>Grounded in your sources.</span><Link href="/about" className="inline-flex items-center gap-1 font-semibold hover:text-white">How it works <ArrowRight size={13} /></Link></div>
        <div className="auth-orb auth-orb-a" /><div className="auth-orb auth-orb-b" />
      </section>
      <section className="relative flex min-h-[calc(100vh-2rem)] flex-col p-6 sm:p-10 lg:min-h-0 xl:p-14">
        <div className="flex items-center justify-between"><Link href="/" className="inline-flex items-center gap-2 text-sm font-extrabold tracking-tight lg:hidden"><BookOpen size={20} className="text-blue" />BiblioCore</Link><span className="hidden lg:block" /><ThemeToggle /></div>
        <div className="mx-auto my-auto w-full max-w-[420px] py-10">
          <div className="mb-8"><div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-pale text-blue lg:hidden"><BookOpen size={22} /></div><p className="text-xs font-extrabold uppercase tracking-[.15em] text-blue">YOUR PRIVATE RESEARCH SPACE</p><h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">{title}</h1><p className="mt-3 text-base leading-7 text-muted">Organize your papers, uncover the key ideas, and keep the evidence in view.</p></div>
          <form onSubmit={submit} className="space-y-1">{children}
            {error && <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm leading-6 text-red-700">{error}</p>}
            <button disabled={busy} className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue px-5 font-bold text-white shadow-lg shadow-blue/20 transition hover:-translate-y-0.5 hover:shadow-xl disabled:translate-y-0 disabled:opacity-60">{busy ? "Please wait…" : title === "Welcome back" ? "Sign in to BiblioCore" : "Create your account"}<ArrowRight size={17} /></button>
          </form>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-x-2 text-center text-sm text-muted"><span>Need help getting started?</span><Link href="/" className="font-bold text-blue hover:underline">Explore BiblioCore</Link></div>
        </div>
        <div className="mt-auto hidden items-center justify-center gap-2 text-xs text-muted sm:flex"><Check size={14} className="text-emerald-600" />Your library is private to your account</div>
      </section>
    </div>
  </main>;
}
