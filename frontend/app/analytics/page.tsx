"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Card, Heading, Loading } from "@/components/ui";
import { BookOpenText, ScanText, UsersRound } from "lucide-react";

type PaperMetric = {
  id: string;
  title: string;
  filename: string;
  authors: string[];
  page_count: number;
  bibliography_word_count: number;
  word_count: number;
  average_sentence_words: number;
  lexical_diversity_percent: number;
  methodology: string;
  datasets: string[];
  models: string[];
  evaluation_metrics: string[];
  results: string;
  citations_from_uploaded_papers: number;
};
type Analytics = {
  papers: PaperMetric[];
  keywords: { term: string; count: number }[];
  coauthors: { name: string; papers: string[] }[];
  coauthor_edges: { source: string; target: string; paper_count: number }[];
  tone_sections: { section: string; word_count: number; hedging: number; limitations: number; evidence: number }[];
  coverage: { indexed_papers: number };
};

const toneCategories = [
  { key: "hedging" as const, label: "Cautious wording", color: "#5675e8" },
  { key: "limitations" as const, label: "Limitation cues", color: "#d59a2a" },
  { key: "evidence" as const, label: "Evidence / reporting", color: "#1497a8" },
];

function Empty({ message }: { message: string }) { return <div className="rounded-xl border border-dashed border-line bg-slate-50 px-4 py-7 text-center text-sm leading-6 text-muted">{message}</div>; }

function ToneBreakdown({ sections }: { sections: Analytics["tone_sections"] }) {
  const totals = toneCategories.map(category => sections.reduce((sum, section) => sum + section[category.key], 0));
  const totalMarkers = totals.reduce((sum, count) => sum + count, 0);
  if (!totalMarkers) return <Empty message="No tone marker terms were detected in the labeled sections."/>;
  const circumference = 2 * Math.PI * 48;
  const segmentOffsets = totals.map((_, index) => totals.slice(0, index).reduce((sum, count) => sum + count / totalMarkers * circumference, 0));
  const maxRate = Math.max(0.1, ...sections.flatMap(section => toneCategories.map(category => section[category.key] / section.word_count * 1000)));
  return <div className="space-y-5">
    <div className="flex flex-col items-center">
      <svg role="img" aria-label={`Donut chart of ${totalMarkers} tone-related word markers`} viewBox="0 0 140 140" className="w-44 max-w-full">
        <circle cx="70" cy="70" r="48" fill="none" stroke="var(--line)" strokeWidth="19"/>
        {toneCategories.map((category, index) => {
          const length = totals[index] / totalMarkers * circumference;
          return <circle key={category.key} cx="70" cy="70" r="48" fill="none" stroke={category.color} strokeWidth="19" strokeDasharray={`${length} ${circumference - length}`} strokeDashoffset={-segmentOffsets[index]} transform="rotate(-90 70 70)"><title>{category.label}: {totals[index]} markers</title></circle>;
        })}
        <text x="70" y="67" textAnchor="middle" fill="var(--ink)" fontSize="19" fontWeight="700">{totalMarkers}</text><text x="70" y="84" textAnchor="middle" fill="var(--muted)" fontSize="9">word cues</text>
      </svg>
      <div className="mt-3 grid w-full max-w-2xl grid-cols-1 gap-2 min-[420px]:grid-cols-3">
        {toneCategories.map((category, index) => <div key={category.key} className="flex min-w-0 items-center justify-center gap-2 rounded-xl border border-line px-2 py-2 text-center">
          <i className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: category.color }}/>
          <span className="min-w-0 text-xs leading-4 text-muted">{category.label}</span>
          <span className="text-xs font-bold tabular-nums">{totals[index]}</span>
        </div>)}
      </div>
    </div>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{sections.map(section => <div key={section.section} className="rounded-xl border border-line p-3"><div className="mb-2 flex items-baseline justify-between gap-3"><h3 className="text-sm font-bold">{section.section}</h3><span className="text-xs text-muted">{section.word_count.toLocaleString()} words</span></div><div className="space-y-2">{toneCategories.map(category => { const rate = section[category.key] / section.word_count * 1000; return <div key={category.key} className="grid grid-cols-[112px_1fr_42px] items-center gap-2 text-xs"><span className="truncate text-muted">{category.label}</span><span className="h-2 overflow-hidden rounded-full bg-slate-100"><span className="block h-full rounded-full" style={{ width: `${rate / maxRate * 100}%`, backgroundColor: category.color }}/></span><span className="text-right tabular-nums text-muted">{rate.toFixed(1)}</span></div>; })}</div></div>)}</div>
    <p className="text-xs leading-5 text-muted">Counts are rates per 1,000 words in sections with recognizable headings. This lexical scan shows where cue words occur; it does not determine sentiment, author intent, or whether claims are objective.</p>
  </div>;
}

function TopicTreemap({ keywords }: { keywords: Analytics["keywords"] }) {
  const items = keywords.slice(0, 12);
  const tiles: { term: string; count: number; x: number; y: number; width: number; height: number }[] = [];
  function place(rows: typeof items, x: number, y: number, width: number, height: number) {
    if (!rows.length) return;
    if (rows.length === 1) {
      tiles.push({ ...rows[0], x, y, width, height });
      return;
    }
    const total = rows.reduce((sum, row) => sum + row.count, 0);
    let split = 1, leftCount = rows[0].count;
    for (let index = 2; index < rows.length; index += 1) {
      if (Math.abs(leftCount + rows[index - 1].count - total / 2) < Math.abs(leftCount - total / 2)) {
        leftCount += rows[index - 1].count;
        split = index;
      } else break;
    }
    const left = rows.slice(0, split), right = rows.slice(split);
    const leftWeight = left.reduce((sum, row) => sum + row.count, 0);
    if (width >= height) {
      const leftWidth = width * leftWeight / total;
      place(left, x, y, leftWidth, height);
      place(right, x + leftWidth, y, width - leftWidth, height);
    } else {
      const topHeight = height * leftWeight / total;
      place(left, x, y, width, topHeight);
      place(right, x, y + topHeight, width, height - topHeight);
    }
  }
  place(items, 0, 0, 100, 72);

  if (!tiles.length) return <Empty message="Upload and index a text-based PDF to discover recurring terms."/>;
  return <div role="img" aria-label="Treemap of frequent terms extracted from uploaded PDF text; tile area reflects term frequency" className="relative aspect-[1.7/1] overflow-hidden rounded-2xl bg-slate-100">
    {tiles.map((tile, index) => {
      const showCount = tile.width > 14 && tile.height > 18;
      const showTerm = tile.width > 7 && tile.height > 12;
      return <div key={tile.term} title={`${tile.term}: ${tile.count} occurrences`} aria-label={`${tile.term}, ${tile.count} occurrences`} className={`topic-treemap-tile topic-treemap-color-${index % 6} absolute flex flex-col justify-between overflow-hidden p-2 transition hover:z-10 hover:brightness-105`} style={{ left: `${tile.x}%`, top: `${tile.y / 72 * 100}%`, width: `${tile.width}%`, height: `${tile.height / 72 * 100}%` }}>
        {showTerm && <span className="truncate text-xs font-bold leading-tight sm:text-sm">{tile.term}</span>}
        {showCount && <span className="text-[11px] font-medium opacity-80">{tile.count} uses</span>}
      </div>;
    })}
  </div>;
}

function PaperLengthChart({ papers }: { papers: PaperMetric[] }) {
  if (!papers.length) return <Empty message="Indexed PDFs will appear here once processing is complete." />;
  const sorted = [...papers].sort((left, right) => right.page_count - left.page_count);
  const maxPages = Math.max(1, ...sorted.map(paper => paper.page_count));
  return <div role="list" aria-label="PDF page count by paper" className={`space-y-4 ${sorted.length > 6 ? "max-h-[25rem] overflow-y-auto pr-2" : ""}`}>
    {sorted.map(paper => <Link role="listitem" key={paper.id} href={`/papers/${paper.id}`} className="group block rounded-lg focus-visible:outline-2 focus-visible:outline-blue" title={`${paper.filename}: ${paper.page_count} pages`}>
      <div className="mb-1.5 flex items-baseline justify-between gap-3"><span className="max-w-[78%] truncate text-sm font-semibold group-hover:text-blue">{paper.title}</span><span className="shrink-0 text-sm tabular-nums text-muted">{paper.page_count} pages</span></div>
      <div className="h-3 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-gradient-to-r from-blue via-indigo-500 to-cyan-500 transition-[width] duration-500 group-hover:brightness-110" style={{ width: `${Math.max(3, paper.page_count / maxPages * 100)}%` }}/></div>
    </Link>)}
    <div className="flex justify-between pl-0.5 text-xs text-muted"><span>0 pages</span><span>{maxPages} pages</span></div>
    <p className="text-xs text-muted">Page totals are read directly from your uploaded PDFs.</p>
  </div>;
}

function BibliographyChart({ papers }: { papers: PaperMetric[] }) {
  const rows = [...papers].filter(paper => paper.bibliography_word_count > 0).sort((left, right) => right.bibliography_word_count - left.bibliography_word_count);
  if (!rows.length) return <Empty message="No References or Bibliography section was detected in the indexed PDFs."/>;
  const maximum = Math.max(...rows.map(paper => paper.bibliography_word_count));
  return <div role="list" aria-label="Extracted bibliography text length by paper" className={`space-y-4 ${rows.length > 6 ? "max-h-[25rem] overflow-y-auto pr-2" : ""}`}>
    {rows.map(paper => <Link role="listitem" key={paper.id} href={`/papers/${paper.id}`} className="group block rounded-lg focus-visible:outline-2 focus-visible:outline-blue" title={`${paper.filename}: ${paper.bibliography_word_count.toLocaleString()} bibliography words`}>
      <div className="mb-1.5 flex items-baseline justify-between gap-3"><span className="max-w-[78%] truncate text-sm font-semibold group-hover:text-blue">{paper.title}</span><span className="shrink-0 text-sm tabular-nums text-muted">{paper.bibliography_word_count.toLocaleString()} words</span></div>
      <div className="h-3 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-gradient-to-r from-cyan-500 via-blue to-indigo-500 transition-[width] duration-500 group-hover:brightness-110" style={{ width: `${Math.max(3, paper.bibliography_word_count / maximum * 100)}%` }}/></div>
    </Link>)}
    <p className="text-xs text-muted">Counted from extracted text following each detected References or Bibliography heading.</p>
  </div>;
}

function CoauthorNetwork({ data }: { data: Analytics }) {
  const people = data.coauthors.slice(0, 12);
  const edges = data.coauthor_edges.filter(edge => people.some(person => person.name === edge.source) && people.some(person => person.name === edge.target));
  if (!edges.length) return <Empty message="No co-author pairs were identified in the saved paper metadata. Run structured analysis to extract author names; the graph will only connect authors listed together on a paper." />;
  const positions = new Map(people.map((person, index) => {
    const angle = (2 * Math.PI * index / people.length) - Math.PI / 2;
    return [person.name, { x: 260 + Math.cos(angle) * 190, y: 150 + Math.sin(angle) * 100 }];
  }));
  return <div className="scrollbar overflow-x-auto"><svg role="img" aria-label="Co-authors connected when they appear together in an analyzed paper" viewBox="0 0 520 300" className="mx-auto w-full max-w-4xl">
    {edges.map((edge, index) => { const from = positions.get(edge.source)!; const to = positions.get(edge.target)!; return <g key={`${edge.source}-${edge.target}-${index}`}><line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke="var(--blue)" strokeWidth={Math.min(4, 1 + edge.paper_count)} opacity=".5"><title>{edge.paper_count} shared paper{edge.paper_count === 1 ? "" : "s"}</title></line></g>; })}
    {people.map(person => { const pos = positions.get(person.name)!; return <g key={person.name}><circle cx={pos.x} cy={pos.y} r="13" fill="var(--surface)" stroke="var(--blue)" strokeWidth="2"><title>{person.name}: {person.papers.length} uploaded papers</title></circle><text x={pos.x} y={pos.y + 28} textAnchor="middle" fontSize="11" fill="var(--ink)">{person.name.slice(0, 20)}{person.name.length > 20 ? "…" : ""}</text></g>; })}
  </svg><p className="text-xs text-muted">Line thickness reflects how many uploaded papers list both authors.</p></div>;
}

export default function AnalyticsPage() {
  const [data, setData] = useState<Analytics | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { api<Analytics>("/api/analytics").then(setData).catch(cause => setError(cause instanceof Error ? cause.message : "Could not load paper analytics.")); }, []);

  if (error) return <><Heading eyebrow="Explore your library" title="Paper analytics"/><Card><p role="alert" className="text-sm text-red-700">{error}</p></Card></>;
  if (!data) return <Loading/>;

  const methods = data.papers.filter(paper => paper.methodology);
  const maxSentence = Math.max(1, ...data.papers.map(paper => paper.average_sentence_words));
  const totalPages = data.papers.reduce((sum, paper) => sum + paper.page_count, 0);
  const totalWords = data.papers.reduce((sum, paper) => sum + paper.word_count, 0);

  return <>
    <header className="analytics-header mb-6 flex flex-col justify-between gap-4 rounded-3xl border border-line p-5 shadow-card sm:flex-row sm:items-end sm:p-7">
      <div><span className="inline-flex rounded-full bg-pale px-3 py-1 text-xs font-bold uppercase tracking-wider text-blue">Your library · {data.coverage.indexed_papers} indexed</span><h1 className="mt-3 text-2xl font-extrabold tracking-tight sm:text-3xl">Your papers, at a glance</h1><p className="mt-2 text-sm text-muted">A visual snapshot made from the PDFs you uploaded.</p></div>
      <Link href="/papers" className="inline-flex min-h-10 items-center justify-center rounded-xl bg-blue px-4 text-sm font-bold text-white">Open paper library</Link>
    </header>
    <section className="mb-5 grid gap-3 sm:grid-cols-3" aria-label="Library summary">
      {[["Indexed papers", data.papers.length.toLocaleString(), "Available for analysis"], ["Pages scanned", totalPages.toLocaleString(), "Across indexed PDFs"], ["Words analyzed", totalWords.toLocaleString(), "Extracted selectable text"]].map(([label, value, detail], index) => <Card key={label} className="relative overflow-hidden"><span className={`absolute -right-5 -top-7 h-24 w-24 rounded-full ${index === 0 ? "bg-blue/10" : index === 1 ? "bg-cyan-500/10" : "bg-indigo-500/10"}`}/><p className="relative text-sm font-semibold text-muted">{label}</p><p className="relative mt-2 text-3xl font-extrabold tracking-tight">{value}</p><p className="relative mt-1 text-xs text-muted">{detail}</p></Card>)}
    </section>

    <section className="grid items-start gap-5 xl:grid-cols-2">
      {data.papers.length > 0 && <Card className="min-w-0 self-start"><div className="mb-4 flex items-start gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-pale text-blue"><BookOpenText size={20}/></span><div><h2 className="font-bold">PDF length by paper</h2><p className="mt-1 text-sm text-muted">Compare the page counts of your indexed research papers.</p></div></div><PaperLengthChart papers={data.papers}/></Card>}
      {data.keywords.length > 0 && <Card className="min-w-0 self-start"><div className="mb-4 flex items-start gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-pale text-blue"><BookOpenText size={20}/></span><div><h2 className="font-bold">Topic distribution</h2><p className="mt-1 text-sm text-muted">Recurring terms surfaced across your indexed papers.</p></div></div>
        <TopicTreemap keywords={data.keywords}/><p className="mt-3 text-xs leading-5 text-muted">Larger tiles mean a term appears more often in extracted PDF text. This is an exploratory keyword view, not an AI-assigned topic percentage.</p>
      </Card>}

      {data.papers.some(paper => paper.bibliography_word_count > 0) && <Card className={`min-w-0 self-start ${data.coauthor_edges.length ? "" : "xl:col-span-2"}`}><div className="mb-4 flex items-start gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-pale text-blue"><BookOpenText size={20}/></span><div><h2 className="font-bold">Bibliography size by paper</h2><p className="mt-1 text-sm text-muted">Compare the amount of reference text in each paper.</p></div></div><BibliographyChart papers={data.papers}/></Card>}
      {data.coauthor_edges.length > 0 && <Card className="min-w-0 self-start"><div className="mb-4 flex items-start gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-pale text-blue"><UsersRound size={20}/></span><div><h2 className="font-bold">Research collaborations</h2><p className="mt-1 text-sm text-muted">Authors connected through shared papers.</p></div></div><CoauthorNetwork data={data}/></Card>}

      <Card className="min-w-0 self-start xl:col-span-2"><div className="mb-4 flex items-start gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-pale text-blue"><ScanText size={20}/></span><div><h2 className="font-bold">Text complexity</h2><p className="mt-1 text-sm text-muted">Sentence length and lexical diversity measured from each paper.</p></div></div>
        {data.papers.length ? <div className={`grid gap-4 sm:grid-cols-2 ${data.papers.length > 6 ? "max-h-[25rem] overflow-y-auto pr-2" : ""}`}>{data.papers.map(paper => <div key={paper.id}><div className="mb-1 flex items-center justify-between gap-3"><Link href={`/papers/${paper.id}`} className="truncate text-sm font-semibold hover:text-blue" title={paper.filename}>{paper.title}</Link><span className="shrink-0 text-xs text-muted">{paper.average_sentence_words} words/sentence</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-gradient-to-r from-blue to-cyan-500" style={{ width: `${paper.average_sentence_words / maxSentence * 100}%` }}/></div><p className="mt-1 text-xs text-muted">{paper.word_count.toLocaleString()} words · {paper.lexical_diversity_percent}% unique-word ratio</p></div>)}</div> : <Empty message="Upload and index a PDF to calculate text statistics."/>}
        <p className="mt-4 text-xs text-muted">Descriptive statistics only; no journal or discipline benchmark is available.</p>
      </Card>

      {data.tone_sections.length > 0 && <Card className="min-w-0 self-start xl:col-span-2"><div className="mb-4"><h2 className="font-bold">Tone markers by section</h2><p className="mt-1 text-sm text-muted">A transparent scan of cautious, limitation, and evidence/reporting words in detected sections.</p></div><ToneBreakdown sections={data.tone_sections}/></Card>}
      {methods.length > 0 && <Card className="min-w-0 self-start xl:col-span-2"><div className="mb-4"><h2 className="font-bold">Methods across your papers</h2><p className="mt-1 text-sm text-muted">Methods, datasets, and evaluation details already identified from your papers.</p></div>
        {methods.length ? <div className="scrollbar overflow-x-auto"><table className="w-full min-w-[680px] border-collapse text-left text-sm"><thead className="bg-slate-50"><tr>{["Research paper", "Methodology", "Datasets", "Models", "Evaluation metrics / results"].map(label => <th key={label} className="border-b border-line px-3 py-2.5 font-bold">{label}</th>)}</tr></thead><tbody>{methods.map(paper => <tr key={paper.id} className="align-top even:bg-slate-50/70"><td className="border-b border-line px-3 py-3 font-semibold"><Link href={`/papers/${paper.id}`} className="hover:text-blue">{paper.title}</Link></td><td className="max-w-64 border-b border-line px-3 py-3 text-muted">{paper.methodology || "Not identified in saved analysis."}</td><td className="border-b border-line px-3 py-3 text-muted">{paper.datasets?.join(", ") || "Not identified"}</td><td className="border-b border-line px-3 py-3 text-muted">{paper.models?.join(", ") || "Not identified"}</td><td className="max-w-64 border-b border-line px-3 py-3 text-muted">{[...(paper.evaluation_metrics ?? []), paper.results].filter(Boolean).join(" · ") || "Not identified"}</td></tr>)}</tbody></table></div> : <Empty message="No methodology summaries are saved yet. Open a paper and run Structured analysis to populate this comparison with extracted evidence."/>}
      </Card>}
    </section>
    <p className="mt-5 text-xs leading-5 text-muted">Charts are calculated from selectable text and metadata in your indexed PDFs. Page-length and text-complexity measures describe your uploaded library; they are not external academic impact scores.</p>
  </>;
}
