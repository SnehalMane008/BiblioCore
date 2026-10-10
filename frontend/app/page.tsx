import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  ArrowRight, ArrowUpRight, BookOpen, Bot, ChartNoAxesCombined, Check,
  FileSearch, FileText, FlaskConical, Library, LockKeyhole, Quote, Search,
  ShieldCheck, Sparkles,
} from "lucide-react";

const tools = [
  { icon: FileSearch, title: "Understand a paper", text: "Get a plain language overview, research objective, and structured analysis.", href: "/register?next=%2Fpapers", label: "Analyze a paper" },
  { icon: Bot, title: "Ask with evidence", text: "Ask questions across your PDFs and follow each answer to its source page.", href: "/register?next=%2Fchat", label: "Ask your papers" },
  { icon: ChartNoAxesCombined, title: "Compare studies", text: "Line up methods, datasets, findings, limitations, and future work.", href: "/register?next=%2Fcompare", label: "Compare papers" },
  { icon: FlaskConical, title: "Explore research gaps", text: "Surface evidence led directions and questions to validate in the wider literature.", href: "/register?next=%2Fresearch-gaps", label: "Explore gaps" },
];

const steps = [
  { number: "01", icon: Library, title: "Add your papers", text: "Upload academic PDFs to your private library. BiblioCore extracts page-aware text and indexes it locally." },
  { number: "02", icon: Search, title: "Find the evidence", text: "Search the papers by meaning and inspect the passages that support each result." },
  { number: "03", icon: Sparkles, title: "Build understanding", text: "Summarize, ask questions, and compare findings with page citations attached." },
];

const benefits = [
  { icon: BookOpen, title: "Plain language summaries", text: "See the question, contribution, and main findings before reading every page." },
  { icon: ChartNoAxesCombined, title: "Methodology breakdowns", text: "Review how a study was designed and what its excerpts say about data and measures." },
  { icon: Quote, title: "Page level evidence", text: "Open cited passages beside answers and verify claims against the original paper." },
  { icon: LockKeyhole, title: "A private library", text: "Your account keeps papers, notes, and conversations scoped to your workspace." },
];

export default function Home() {
  return <main className="landing-page min-h-screen overflow-hidden bg-canvas text-ink">
    <header className="relative z-10 mx-auto flex max-w-[1280px] items-center justify-between gap-4 px-5 py-5 sm:px-8 lg:px-10">
      <Link href="/" className="flex items-center gap-3" aria-label="BiblioCore home">
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-blue text-white shadow-lg shadow-blue/20"><BookOpen size={22} /></span>
        <span><span className="block text-lg font-extrabold tracking-tight">BiblioCore</span><span className="block text-xs font-medium text-muted">Research, made clear</span></span>
      </Link>
      <nav aria-label="Landing navigation" className="hidden items-center gap-8 md:flex">
        <a href="#how-it-works" className="text-sm font-semibold text-muted transition hover:text-blue">How it works</a>
        <a href="#research-tools" className="text-sm font-semibold text-muted transition hover:text-blue">Research tools</a>
        <a href="#faq" className="text-sm font-semibold text-muted transition hover:text-blue">FAQ</a>
      </nav>
      <div className="flex items-center gap-2 sm:gap-3">
        <ThemeToggle />
        <Link href="/login?next=%2Fdashboard" className="hidden rounded-xl px-3 py-2.5 text-sm font-bold text-ink transition hover:bg-white sm:inline-flex">Sign in</Link>
        <Link href="/register?next=%2Fdashboard" className="inline-flex items-center gap-2 rounded-xl bg-ink px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-slate-900/10 transition hover:-translate-y-0.5 hover:bg-blue sm:px-5">Get started <ArrowUpRight size={16} /></Link>
      </div>
    </header>

    <section className="landing-hero relative">
      <div className="relative z-[1] mx-auto grid max-w-[1280px] items-center gap-12 px-5 pb-16 pt-10 sm:px-8 sm:pb-20 sm:pt-14 lg:grid-cols-[1.02fr_.98fr] lg:gap-8 lg:px-10 lg:pb-28 lg:pt-16">
        <div className="landing-reveal max-w-2xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue/15 bg-white/80 px-3.5 py-2 text-xs font-bold text-blue shadow-sm backdrop-blur"><Sparkles size={15} /> YOUR RESEARCH, MADE READABLE</div>
          <h1 className="max-w-[780px] text-[clamp(2.75rem,7vw,5.35rem)] font-extrabold leading-[1.01] tracking-[-.055em]">Understand any research paper <span className="landing-gradient-text">in minutes.</span></h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-muted sm:text-xl">Turn dense academic PDFs into clear summaries, method breakdowns, key findings, and citations you can check.</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/register?next=%2Fpapers" className="group inline-flex min-h-14 items-center justify-center gap-3 rounded-2xl bg-blue px-6 text-base font-bold text-white shadow-xl shadow-blue/25 transition hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue/30">Analyze a paper <ArrowRight className="transition group-hover:translate-x-1" size={19} /></Link>
            <Link href="/login?next=%2Fdashboard" className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl border border-line bg-white/80 px-6 text-base font-bold text-ink transition hover:border-blue hover:text-blue">Sign in to your workspace</Link>
          </div>
          <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm font-medium text-muted">
            {["Page linked citations", "Private paper library", "Local semantic search"].map(item => <span key={item} className="inline-flex items-center gap-2"><span className="grid h-5 w-5 place-items-center rounded-full bg-emerald-100 text-emerald-700"><Check size={13} strokeWidth={3} /></span>{item}</span>)}
          </div>
        </div>

        <div className="landing-reveal relative mx-auto w-full max-w-[600px] [animation-delay:140ms]">
          <div className="landing-orbit landing-orbit-one" /><div className="landing-orbit landing-orbit-two" />
          <div className="relative z-[1] rounded-[30px] border border-white/70 bg-white/75 p-3 shadow-[0_35px_100px_rgba(49,72,130,.18)] backdrop-blur-xl sm:p-5">
            <div className="rounded-[22px] border border-line/80 bg-white p-5 sm:p-7">
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-rose-50 text-rose-600"><FileText size={20} /></div><div className="min-w-0"><div className="truncate text-sm font-bold text-ink">Research paper brief</div><div className="mt-0.5 text-xs text-muted">A grounded reading companion</div></div></div>
                <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">READY TO EXPLORE</span>
              </div>
              <div className="mt-7 border-b border-line pb-5"><div className="text-xs font-bold uppercase tracking-[.13em] text-blue">KEY IDEA</div><p className="mt-2 text-lg font-bold leading-7 tracking-tight text-ink sm:text-xl">Move from a long paper to a clear picture of its argument and evidence.</p><p className="mt-2 text-sm leading-6 text-muted">Explore the study question, approach, findings, and caveats with the original pages close at hand.</p></div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {[{ label: "Research question", icon: Search, text: "What is the study trying to understand?" }, { label: "Methods & evidence", icon: ChartNoAxesCombined, text: "How did the authors investigate it?" }].map(item => <div key={item.label} className="rounded-2xl bg-slate-50 p-4"><div className="flex items-center gap-2 text-sm font-bold text-ink"><item.icon size={16} className="text-blue" />{item.label}</div><p className="mt-2 text-xs leading-5 text-muted">{item.text}</p><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-200"><div className="h-full w-3/4 rounded-full bg-gradient-to-r from-blue to-indigo-400" /></div></div>)}
              </div>
              <div className="mt-4 flex items-center justify-between rounded-2xl border border-blue/10 bg-blue/[.045] px-4 py-3"><div className="flex items-center gap-2 text-sm font-bold text-ink"><Quote size={16} className="text-blue" />Source-backed answers</div><div className="flex -space-x-2"><span className="grid h-8 w-8 place-items-center rounded-full border-2 border-white bg-indigo-100 text-[10px] font-bold text-indigo-700">p.04</span><span className="grid h-8 w-8 place-items-center rounded-full border-2 border-white bg-amber-100 text-[10px] font-bold text-amber-700">p.12</span><span className="grid h-8 w-8 place-items-center rounded-full border-2 border-white bg-emerald-100 text-[10px] font-bold text-emerald-700">+3</span></div></div>
            </div>
          </div>
          <div className="landing-float landing-float-delayed absolute -bottom-10 right-2 z-10 hidden items-center gap-3 rounded-2xl border border-white/80 bg-white px-4 py-3 shadow-xl sm:flex"><span className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-50 text-emerald-600"><ShieldCheck size={18} /></span><span><span className="block text-xs font-bold text-ink">Grounded in your PDFs</span><span className="text-xs text-muted">Citations you can verify</span></span></div>
        </div>
      </div>
      <div className="relative z-[1] mx-auto max-w-[1280px] px-5 pb-12 sm:px-8 lg:px-10"><div className="flex flex-col justify-between gap-5 border-y border-line/70 py-5 sm:flex-row sm:items-center"><span className="text-sm font-semibold text-muted">A focused toolkit for working through academic papers</span><div className="flex flex-wrap gap-2">{["PDF library", "AI research assistant", "Literature review", "Research gap analysis"].map(label => <span key={label} className="rounded-full border border-line bg-white/70 px-3.5 py-2 text-xs font-semibold text-muted">{label}</span>)}</div></div></div>
    </section>

    <section id="research-tools" className="mx-auto max-w-[1280px] scroll-mt-16 px-5 py-16 sm:px-8 sm:py-24 lg:px-10">
      <div className="mb-9 flex flex-col justify-between gap-5 md:flex-row md:items-end"><div><p className="mb-3 text-xs font-extrabold uppercase tracking-[.15em] text-blue">YOUR RESEARCH DESK</p><h2 className="max-w-2xl text-3xl font-extrabold tracking-tight sm:text-4xl">Go from reading to real insight.</h2></div><p className="max-w-lg text-base leading-7 text-muted">One private workspace for understanding papers, following evidence, and connecting ideas across studies.</p></div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{tools.map((tool, index) => <article key={tool.title} className="landing-feature-card group flex min-h-[245px] flex-col rounded-3xl border border-line bg-white p-6 shadow-card transition duration-300 hover:-translate-y-1.5 hover:border-blue/40 hover:shadow-xl" style={{ animationDelay: `${index * 75}ms` }}><div className="mb-6 flex items-start justify-between"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-pale text-blue transition group-hover:rotate-[-5deg] group-hover:scale-105"><tool.icon size={22} /></span><ArrowUpRight size={18} className="text-slate-300 transition group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:text-blue" /></div><h3 className="text-lg font-bold tracking-tight">{tool.title}</h3><p className="mt-2 flex-1 text-sm leading-6 text-muted">{tool.text}</p><Link href={tool.href} className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-blue">{tool.label}<ArrowRight size={15} /></Link></article>)}</div>
    </section>

    <section id="how-it-works" className="landing-how scroll-mt-16 py-16 sm:py-24">
      <div className="mx-auto max-w-[1280px] px-5 sm:px-8 lg:px-10"><div className="mx-auto mb-12 max-w-2xl text-center"><p className="mb-3 text-xs font-extrabold uppercase tracking-[.15em] text-blue">HOW BIBLIOCORE WORKS</p><h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">From a dense PDF to clear insight.</h2><p className="mt-4 text-base leading-7 text-muted">A transparent workflow keeps your answers connected to the paper that supports them.</p></div>
        <div className="relative grid gap-5 md:grid-cols-3">{steps.map((step, index) => <article key={step.number} className="relative rounded-3xl border border-line bg-white p-7 shadow-card"><div className="flex items-center justify-between"><span className="text-sm font-extrabold tracking-[.14em] text-blue">{step.number}</span><span className="grid h-12 w-12 place-items-center rounded-2xl bg-pale text-blue"><step.icon size={22} /></span></div><h3 className="mt-7 text-xl font-bold">{step.title}</h3><p className="mt-3 text-sm leading-7 text-muted">{step.text}</p>{index < steps.length - 1 && <div className="absolute -right-4 top-1/2 z-10 hidden h-8 w-8 -translate-y-1/2 place-items-center rounded-full border border-line bg-white text-blue md:grid"><ArrowRight size={16} /></div>}</article>)}</div>
      </div>
    </section>

    <section className="mx-auto grid max-w-[1280px] gap-12 px-5 py-16 sm:px-8 sm:py-24 lg:grid-cols-[.8fr_1.2fr] lg:items-center lg:px-10">
      <div><p className="mb-3 text-xs font-extrabold uppercase tracking-[.15em] text-blue">WHAT YOU GET</p><h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Read smarter, with the source always in reach.</h2><p className="mt-5 text-base leading-7 text-muted">BiblioCore organizes a paper around the questions that matter: what it asks, how it studies the question, and what the evidence says.</p><Link href="/register?next=%2Fpapers" className="mt-7 inline-flex items-center gap-2 font-bold text-blue">Build your research library <ArrowRight size={17} /></Link></div>
      <div className="grid items-stretch gap-x-5 gap-y-6 sm:grid-cols-2">{benefits.map(item => <article key={item.title} className="h-full rounded-3xl border border-line bg-white p-6 shadow-card transition duration-300 hover:-translate-y-1 hover:shadow-lg"><span className="grid h-11 w-11 place-items-center rounded-xl bg-pale text-blue"><item.icon size={20} /></span><h3 className="mt-5 text-base font-bold">{item.title}</h3><p className="mt-2 text-sm leading-6 text-muted">{item.text}</p></article>)}</div>
    </section>

    <section id="faq" className="mx-auto max-w-[1280px] scroll-mt-16 px-5 pb-20 sm:px-8 sm:pb-28 lg:px-10"><div className="grid gap-10 lg:grid-cols-[.8fr_1.2fr]"><div><p className="mb-3 text-xs font-extrabold uppercase tracking-[.15em] text-blue">FAQ</p><h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">A few useful details.</h2><p className="mt-4 text-base leading-7 text-muted">BiblioCore is designed to help you explore research while keeping evidence visible.</p></div><div className="divide-y divide-line border-y border-line">{[["What does BiblioCore analyze?", "Upload selectable-text PDFs to extract summaries, structured paper analysis, and evidence for grounded questions. Scanned PDFs need OCR, which is not included."], ["How are answers grounded?", "The assistant retrieves relevant page-aware excerpts from your indexed papers. Citations shown in the app come from those retrieved source records."], ["Can I compare multiple papers?", "Yes. Select indexed papers to compare their methods, data, findings, limitations, and future work. Generated results are a starting point and should be checked against the cited passages."], ["Is my library public?", "No. Papers, conversations, and analyses are scoped to your signed-in account in this local development project."]].map(([question, answer]) => <details key={question} className="group py-5"><summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-bold marker:hidden">{question}<span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-line text-blue transition group-open:rotate-45">+</span></summary><p className="mt-3 max-w-3xl pr-12 text-sm leading-7 text-muted">{answer}</p></details>)}</div></div></section>

    <section className="px-5 pb-8 sm:px-8 lg:px-10"><div className="landing-cta mx-auto flex max-w-[1280px] flex-col items-start justify-between gap-8 overflow-hidden rounded-[32px] px-7 py-10 text-white sm:px-10 sm:py-12 lg:flex-row lg:items-center lg:px-14"><div className="relative z-[1]"><div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold"><Sparkles size={14} /> YOUR NEXT PAPER, MADE CLEAR</div><h2 className="max-w-2xl text-3xl font-extrabold tracking-tight sm:text-4xl">Make more time for the ideas that matter.</h2><p className="mt-3 max-w-xl text-base leading-7 text-white/75">Create your private workspace and start building understanding from your papers.</p></div><div className="relative z-[1] flex w-full flex-col gap-3 sm:w-auto sm:flex-row"><Link href="/register?next=%2Fpapers" className="landing-cta-primary inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-white px-5 text-sm font-extrabold text-indigo-950 transition hover:-translate-y-0.5">Create free account <ArrowRight size={17} /></Link><Link href="/login?next=%2Fdashboard" className="inline-flex min-h-12 items-center justify-center rounded-xl border border-white/30 px-5 text-sm font-bold text-white transition hover:bg-white/10">Sign in</Link></div></div></section>
    <footer className="border-t border-line bg-white/60">
      <div className="mx-auto grid max-w-[1280px] gap-10 px-5 py-10 sm:px-8 md:grid-cols-[1.2fr_2fr] lg:px-10">
        <div>
          <Link href="/" className="inline-flex items-center gap-2 font-extrabold text-ink"><BookOpen size={19} className="text-blue" /> BiblioCore</Link>
          <p className="mt-3 max-w-sm text-sm leading-6 text-muted">Grounded academic reading, one paper at a time. Keep the evidence close as you explore your research.</p>
        </div>
        <nav aria-label="Footer navigation" className="grid grid-cols-2 gap-8 sm:grid-cols-3">
          <div><h2 className="text-sm font-bold text-ink">Explore</h2><ul className="mt-3 space-y-2.5 text-sm text-muted"><li><a href="#how-it-works" className="hover:text-blue">How it works</a></li><li><a href="#research-tools" className="hover:text-blue">Research tools</a></li><li><a href="#faq" className="hover:text-blue">FAQ</a></li></ul></div>
          <div><h2 className="text-sm font-bold text-ink">Workspace</h2><ul className="mt-3 space-y-2.5 text-sm text-muted"><li><Link href="/about" className="hover:text-blue">About BiblioCore</Link></li><li><Link href="/login?next=%2Fdashboard" className="hover:text-blue">Sign in</Link></li><li><Link href="/register?next=%2Fdashboard" className="hover:text-blue">Create account</Link></li></ul></div>
          <div className="col-span-2 sm:col-span-1"><h2 className="text-sm font-bold text-ink">Research tools</h2><ul className="mt-3 space-y-2.5 text-sm text-muted"><li><Link href="/register?next=%2Fcompare" className="hover:text-blue">Compare papers</Link></li><li><Link href="/register?next=%2Fliterature-review" className="hover:text-blue">Literature review</Link></li><li><Link href="/register?next=%2Fresearch-gaps" className="hover:text-blue">Research gaps</Link></li></ul></div>
        </nav>
      </div>
      <div className="border-t border-line"><div className="mx-auto flex max-w-[1280px] flex-col gap-2 px-5 py-4 text-xs text-muted sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-10"><span>© {new Date().getFullYear()} BiblioCore. All rights reserved.</span><span>Built to support careful, evidence-led research.</span></div></div>
    </footer>
  </main>;
}
