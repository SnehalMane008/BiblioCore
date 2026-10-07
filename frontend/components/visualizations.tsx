import Link from "next/link";
import { Card } from "@/components/ui";
import type { Paper } from "@/lib/api";
import { BarChart3 } from "lucide-react";

export function PaperPagesChart({ papers }: { papers: Paper[] }) {
  const indexed = papers.filter((paper) => paper.status === "indexed" && paper.page_count > 0);
  const maxPages = Math.max(1, ...indexed.map((paper) => paper.page_count));

  return <Card>
    <figure aria-labelledby="paper-pages-title">
      <figcaption className="mb-5 flex items-start justify-between gap-4">
        <div>
          <div className="mb-2 grid h-10 w-10 place-items-center rounded-xl bg-pale text-blue"><BarChart3 size={20}/></div>
          <h2 id="paper-pages-title" className="text-base font-bold">Paper length at a glance</h2>
          <p className="mt-1 text-sm text-muted">Page counts for your five most recent indexed papers.</p>
        </div>
        <span className="rounded-full border border-line px-3 py-1 text-xs font-semibold text-muted">{indexed.length} indexed</span>
      </figcaption>
      {indexed.length ? <div className="space-y-4" role="list" aria-label="Paper page counts">
        {indexed.map((paper) => <Link role="listitem" href={`/papers/${paper.id}`} key={paper.id} className="group block rounded-lg focus-visible:outline-2 focus-visible:outline-blue" title={`${paper.filename}: ${paper.page_count} pages`}>
          <div className="mb-1.5 flex items-baseline justify-between gap-3"><span className="max-w-[78%] truncate text-sm font-semibold group-hover:text-blue">{paper.filename}</span><span className="shrink-0 text-sm tabular-nums text-muted">{paper.page_count} pages</span></div>
          <div className="h-3 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-gradient-to-r from-blue via-indigo-500 to-cyan-500 transition-[width] duration-500 group-hover:brightness-110" style={{ width: `${Math.max(4, paper.page_count / maxPages * 100)}%` }}/></div>
        </Link>)}
        <div className="flex justify-between pl-0.5 text-xs text-muted"><span>0 pages</span><span>{maxPages} pages</span></div>
      </div> : <div className="rounded-xl border border-dashed border-line bg-slate-50 px-4 py-8 text-center text-sm text-muted">Indexed papers will appear here after PDF processing finishes.</div>}
    </figure>
  </Card>;
}
