"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Activity, BookOpen, Bot, ChartNoAxesCombined, ChartNoAxesColumnIncreasing, FlaskConical, LayoutDashboard,
  Library, LogOut, Menu, Search, Sparkles, X,
} from "lucide-react";

const groups = [
  { name: "Workspace", links: [["/dashboard", "Overview", LayoutDashboard], ["/papers", "Paper library", Library], ["/chat", "Research assistant", Bot], ["/search", "Semantic search", Search]] as const },
  { name: "Research tools", links: [["/compare", "Compare papers", ChartNoAxesCombined], ["/analytics", "Paper analytics", ChartNoAxesColumnIncreasing], ["/literature-review", "Literature review", BookOpen], ["/research-gaps", "Research gaps", FlaskConical], ["/evaluation", "RAG evaluation", Activity]] as const },
  { name: "Learn", links: [["/about", "How it works", Sparkles]] as const },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);
  const [open, setOpen] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const path = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (path === "/" || path === "/login" || path === "/register") {
      setAuthChecked(true);
      return;
    }
    let active = true;
    setAuthChecked(false);
    api<{ name: string; email: string }>("/api/auth/me").then(value => { if (active) setUser(value); }).catch(() => { if (active) setUser(null); }).finally(() => { if (active) setAuthChecked(true); });
    return () => { active = false; };
  }, [path]);

  async function signout() {
    await api("/api/auth/logout", { method: "POST" });
    setUser(null);
    router.push("/login");
  }

  if (path === "/" || path === "/login" || path === "/register") return <>{children}</>;
  if (!authChecked) return <main className="grid min-h-screen place-items-center"><div className="flex items-center gap-3 rounded-2xl border border-line bg-white px-6 py-5 text-sm font-medium text-muted shadow-card"><span className="h-2.5 w-2.5 animate-pulse rounded-full bg-blue" />Preparing your BiblioCore workspace…</div></main>;
  if (!user) return <main className="grid min-h-screen place-items-center p-5"><div className="w-full max-w-md rounded-3xl border border-line bg-white p-9 text-center shadow-card"><div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-pale text-blue"><Bot size={27} /></div><h1 className="text-2xl font-bold">Your research workspace is ready</h1><p className="mt-3 text-base leading-7 text-muted">Sign in to continue to your papers, conversations, and research tools.</p><div className="mt-6 flex flex-wrap justify-center gap-3"><Link className="rounded-xl bg-blue px-5 py-3 text-sm font-semibold text-white" href="/login?next=%2Fdashboard">Sign in</Link><Link className="rounded-xl border border-line px-5 py-3 text-sm font-semibold" href="/register?next=%2Fdashboard">Create account</Link></div><Link href="/" className="mt-6 inline-block text-sm font-semibold text-blue">Back to BiblioCore</Link></div></main>;

  return <div className="min-h-screen lg:flex">
    {open && <button aria-label="Close navigation" onClick={() => setOpen(false)} className="fixed inset-0 z-30 bg-slate-950/40 lg:hidden" />}
    <aside className={`${open ? "fixed inset-y-0 left-0 z-40 flex" : "hidden"} w-[min(86vw,300px)] shrink-0 flex-col border-r border-line bg-white px-4 py-5 lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-[270px]`}>
      <div className="mb-8 flex items-center gap-3 px-2">
        <div className="grid h-11 w-11 place-items-center rounded-xl bg-blue text-white"><BookOpen size={22} /></div>
        <div className="min-w-0 flex-1"><div className="text-lg font-bold tracking-tight">BiblioCore</div><div className="text-sm text-muted">Academic research workspace</div></div>
        <button aria-label="Close navigation" onClick={() => setOpen(false)} className="rounded-lg p-2 hover:bg-slate-100 lg:hidden"><X size={20} /></button>
      </div>
      <nav aria-label="Main navigation" className="scrollbar min-h-0 flex-1 space-y-7 overflow-y-auto pb-4">
        {groups.map(group => <div key={group.name}>
          <div className="mb-2 px-3 text-xs font-bold uppercase tracking-[.13em] text-slate-400">{group.name}</div>
          <div className="space-y-1">{group.links.map(([href, label, Icon]) => {
            const active = path === href || path.startsWith(`${href}/`);
            return <Link key={href} href={href} onClick={() => setOpen(false)} aria-current={active ? "page" : undefined} className={`flex min-h-11 items-center gap-3 rounded-xl px-3 text-[15px] font-medium transition-colors ${active ? "bg-pale text-blue" : "text-slate-600 hover:bg-slate-50"}`}><Icon size={19} strokeWidth={1.9} />{label}</Link>;
          })}</div>
        </div>)}
      </nav>
      <div className="border-t border-line pt-4"><div className="flex items-center gap-3 rounded-xl p-2">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-indigo-100 text-base font-bold text-indigo-700">{user.name.slice(0, 1).toUpperCase()}</div>
        <div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold">{user.name}</div><div className="truncate text-sm text-muted">{user.email}</div></div>
        <button title="Sign out" aria-label="Sign out" onClick={signout} className="rounded-lg p-2 hover:bg-slate-100"><LogOut size={18} className="text-muted" /></button>
      </div></div>
    </aside>
    <div className="min-w-0 flex-1">
      <header className="sticky top-0 z-20 flex min-h-[72px] items-center justify-between gap-3 border-b border-line bg-white/90 px-4 backdrop-blur sm:px-6 lg:px-9">
        <div className="flex min-w-0 items-center gap-3"><button aria-label="Open navigation" className="rounded-lg p-2 hover:bg-slate-100 lg:hidden" onClick={() => setOpen(true)}><Menu size={21} /></button><div className="min-w-0 truncate text-sm text-muted"><span className="hidden sm:inline">BiblioCore</span><span className="mx-2 hidden text-slate-300 sm:inline">/</span><span className="font-semibold capitalize text-ink">{path.split("/").filter(Boolean).at(-1)?.replaceAll("-", " ") || "Overview"}</span></div></div>
        <div className="flex shrink-0 items-center gap-2"><ThemeToggle /><Link href="/papers" className="rounded-xl bg-blue px-3.5 py-2.5 text-sm font-bold text-white sm:px-4">+ <span className="hidden sm:inline">Add papers</span><span className="sm:hidden">Add</span></Link></div>
      </header>
      <main className="workspace-canvas mx-auto min-h-[calc(100vh-72px)] w-full max-w-[1440px] p-4 sm:p-6 lg:p-9">{children}</main>
      <footer className="border-t border-line bg-white/75 px-4 py-5 sm:px-6 lg:px-9">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-xs text-muted">© {new Date().getFullYear()} BiblioCore. All rights reserved.</span>
          <nav aria-label="Workspace footer navigation" className="flex flex-wrap gap-x-5 gap-y-2 text-xs font-medium text-muted">
            <Link href="/about" className="hover:text-blue">About</Link>
            <Link href="/papers" className="hover:text-blue">Paper library</Link>
            <Link href="/chat" className="hover:text-blue">Research assistant</Link>
            <Link href="/compare" className="hover:text-blue">Compare papers</Link>
            <Link href="/analytics" className="hover:text-blue">Paper analytics</Link>
            <Link href="/literature-review" className="hover:text-blue">Literature review</Link>
            <Link href="/research-gaps" className="hover:text-blue">Research gaps</Link>
          </nav>
        </div>
      </footer>
    </div>
  </div>;
}
