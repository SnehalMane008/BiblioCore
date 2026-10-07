"use client";

import { useState } from "react";
import { api, readStructuredResponse, type Source } from "@/lib/api";
import { Card, PaperPicker, ToolHero } from "@/components/ui";
import { StructuredResult } from "@/components/structured-result";
import { FlaskConical } from "lucide-react";

export default function Gaps() {
  const [selected, setSelected] = useState<string[]>([]);
  const [topic, setTopic] = useState("");
  const [answer, setAnswer] = useState<string | Record<string, unknown> | null>(null);
  const [sources, setSources] = useState<Source[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true); setError(""); setAnswer(null);
    try {
      const payload = await api<unknown>("/api/research-gaps", { method: "POST", body: JSON.stringify({ paper_ids: selected, topic }) });
      const result = readStructuredResponse(payload, "research_gaps");
      setAnswer(result.answer); setSources(result.sources);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Analysis failed"); }
    finally { setBusy(false); }
  }

  return <>
    <ToolHero eyebrow="Evidence-led exploration" title="Find the questions still open" description="Trace the problem, methods, data, findings, limitations, and future work in each paper, then identify cautious research directions supported by those excerpts." icon={FlaskConical} points={["Per-paper matrix", "Gap rationale", "Validation ideas"]}/>
    <Card>
      <label htmlFor="gap-topic" className="text-base font-semibold">Topic or research question</label>
      <textarea id="gap-topic" value={topic} onChange={event => setTopic(event.target.value)} rows={3} placeholder="Which part of this research area should we examine?" className="mt-2 w-full rounded-xl border border-line bg-white p-3.5 text-[15px] leading-6" />
      <div className="mb-2 mt-6 text-base font-semibold">Select papers</div>
      <p className="mb-4 text-sm text-muted">Gap analysis is grounded only in the papers you select.</p>
      <PaperPicker selected={selected} setSelected={setSelected} />
      <button disabled={!topic.trim() || !selected.length || busy} onClick={run} className="mt-5 min-h-11 rounded-xl bg-blue px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Reviewing evidence…" : "Suggest potential gaps"}</button>
      {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    </Card>
    {answer !== null && <StructuredResult title="Potential research directions" answer={answer} sources={sources} mode="gaps" />}
  </>;
}
