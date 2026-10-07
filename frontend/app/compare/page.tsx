"use client";

import { useState } from "react";
import { api, readStructuredResponse, type Source } from "@/lib/api";
import { Card, PaperPicker, ToolHero } from "@/components/ui";
import { StructuredResult } from "@/components/structured-result";
import { ChartNoAxesCombined } from "lucide-react";

export default function Compare() {
  const [selected, setSelected] = useState<string[]>([]);
  const [focus, setFocus] = useState("Compare the research problem, methods, data, results, limitations, and future work.");
  const [answer, setAnswer] = useState<string | Record<string, unknown> | null>(null);
  const [sources, setSources] = useState<Source[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true); setError(""); setAnswer(null);
    try {
      const payload = await api<unknown>("/api/compare", { method: "POST", body: JSON.stringify({ paper_ids: selected, focus }) });
      const result = readStructuredResponse(payload, "comparison");
      setAnswer(result.answer); setSources(result.sources);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Comparison failed"); }
    finally { setBusy(false); }
  }

  return <>
    <ToolHero eyebrow="Cross-paper synthesis" title="Compare research, side by side" description="Build a paper-by-paper evidence matrix. Compare the research problem, techniques, data, findings, limitations, and future work without losing track of each source." icon={ChartNoAxesCombined} points={["One row per paper", "Evidence-led fields", "Page-linked sources"]}/>
    <Card>
      <label className="text-base font-semibold">Select 2–5 papers</label>
      <p className="mt-1 text-sm text-muted">Choose the studies you want to compare. Select at least two.</p>
      <div className="mt-4"><PaperPicker selected={selected} setSelected={setSelected} /></div>
      <label htmlFor="comparison-focus" className="mt-6 block text-base font-semibold">Comparison focus</label>
      <textarea id="comparison-focus" value={focus} onChange={event => setFocus(event.target.value)} rows={3} className="mt-2 w-full rounded-xl border border-line bg-white p-3.5 text-[15px] leading-6" />
      <button disabled={selected.length < 2 || busy} onClick={run} className="mt-5 min-h-11 rounded-xl bg-blue px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Comparing evidence…" : "Generate comparison"}</button>
      {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    </Card>
    {answer !== null && <StructuredResult title="Evidence-based comparison" answer={answer} sources={sources} mode="comparison" />}
  </>;
}
