import { Card, SourceCards } from "@/components/ui";
import type { Source } from "@/lib/api";
import { BookOpenCheck, Sparkles } from "lucide-react";

type Row = Record<string, unknown>;
type Mode = "comparison" | "gaps";
type ParsedResult = { rows: Row[]; summary: string };

const analysisColumns = [
  ["research_problem", "Research Problem"],
  ["methods", "Methods / Techniques"],
  ["data", "Data Used"],
  ["results", "Results / Findings"],
  ["limitations", "Limitations"],
  ["future_work", "Future Work"],
];
const gapColumns = [
  ...analysisColumns,
  ["potential_research_gap", "Potential Research Gap"],
  ["evidence_and_rationale", "Evidence & Rationale"],
  ["suggested_validation", "Suggested Validation"],
  ["confidence", "Confidence"],
];

function asRecord(value: unknown): Row | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Row : null;
}

function decodeJson(value: unknown): unknown {
  let candidate = value;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    if (typeof candidate !== "string") return candidate;
    const input = candidate.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
    try { candidate = JSON.parse(input) as unknown; continue; } catch { /* Recover JSON wrapped in labels or prose. */ }
    const start = input.indexOf("{");
    if (start < 0) return input;
    let depth = 0; let quoted = false; let escaped = false;
    for (let index = start; index < input.length; index += 1) {
      const char = input[index];
      if (quoted) {
        if (escaped) escaped = false;
        else if (char === "\\") escaped = true;
        else if (char === '"') quoted = false;
      } else if (char === '"') quoted = true;
      else if (char === "{") depth += 1;
      else if (char === "}" && --depth === 0) { candidate = input.slice(start, index + 1); break; }
    }
    if (candidate === value) return input;
  }
  return candidate;
}

function displayText(value: unknown, fallback = "Not identified in the retrieved excerpts."): string {
  if (typeof value === "string") return value.trim() || fallback;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map(item => displayText(item, "")).filter(Boolean).join("; ") || fallback;
  const row = asRecord(value);
  if (row) return Object.entries(row).map(([key, item]) => `${key.replaceAll("_", " ")}: ${displayText(item, "")}`).filter(item => !item.endsWith(": ")).join("; ") || fallback;
  return fallback;
}

function getField(row: Row, aliases: string[]): unknown {
  const normalized = new Map(Object.entries(row).map(([key, value]) => [key.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, ""), value]));
  for (const alias of aliases) {
    const value = normalized.get(alias);
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return undefined;
}

function rowsFrom(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  const record = asRecord(value);
  if (!record) return [];
  for (const key of ["rows", "dimensions", "gaps", "comparisons", "research_gaps", "items", "results"]) {
    const rows = decodeJson(record[key]);
    if (Array.isArray(rows)) return rows;
  }
  return [];
}

function dimensionField(value: unknown): string | undefined {
  const normalized = String(value ?? "").toLowerCase().replace(/[^a-z]+/g, " ").trim();
  if (["research problem", "problem", "research question", "question", "objective", "aim", "purpose"].includes(normalized)) return "research_problem";
  if (["method", "methods", "methodology", "research design", "study design", "approach"].includes(normalized)) return "methods";
  if (["data", "dataset", "datasets", "sample", "participants"].includes(normalized)) return "data";
  if (["result", "results", "finding", "findings", "contribution"].includes(normalized)) return "results";
  if (["limitation", "limitations", "caveat", "caveats"].includes(normalized)) return "limitations";
  if (["future work", "future research", "recommendation", "recommendations", "next steps"].includes(normalized)) return "future_work";
  return undefined;
}

function transposeOldComparison(oldRows: Row[], paperNames: string[]): Row[] {
  const matrix = new Map<string, Row>(paperNames.map(paper => [paper, { paper }]));
  for (const old of oldRows) {
    const field = dimensionField(getField(old, ["dimension", "aspect", "criterion", "category"]));
    const content = displayText(getField(old, ["comparison", "analysis", "findings", "evidence"]), "");
    if (!field || !content) continue;
    const starts = paperNames.flatMap(paper => {
      const index = content.toLowerCase().indexOf(paper.toLowerCase());
      return index >= 0 ? [{ paper, index }] : [];
    }).sort((a, b) => a.index - b.index);
    starts.forEach((start, index) => {
      const end = starts[index + 1]?.index ?? content.length;
      const cell = content.slice(start.index + start.paper.length, end).trim().replace(/^[\s:;,.[\]—-]+|[\s;,.[\]—-]+$/g, "");
      const target = matrix.get(start.paper);
      if (target && cell) target[field] = cell;
    });
  }
  return [...matrix.values()];
}

function normalizeRows(rawRows: unknown[], mode: Mode, paperNames: string[]): Row[] {
  const records = rawRows.map(item => asRecord(decodeJson(item))).filter((item): item is Row => item !== null);
  if (mode === "comparison" && records.length && records.every(row => getField(row, ["dimension", "aspect", "criterion", "category"]) !== undefined)) {
    return transposeOldComparison(records, paperNames.length ? paperNames : ["Selected papers"]);
  }

  return records.map(row => {
    const paper = displayText(getField(row, ["paper", "paper_name", "filename", "study"]), "Selected papers");
    const normalized: Row = { paper };
    for (const [key] of analysisColumns) {
      const aliases: Record<string, string[]> = {
        research_problem: ["research_problem", "research_question", "problem", "objective", "aim"],
        methods: ["methods", "methodology", "method", "research_design", "approach"],
        data: ["data", "dataset", "datasets", "sample", "participants"],
        results: ["results", "result", "findings", "key_findings"],
        limitations: ["limitations", "limitation", "caveats"],
        future_work: ["future_work", "future_research", "recommendations", "next_steps"],
      };
      normalized[key] = displayText(getField(row, aliases[key]));
    }
    if (mode === "gaps") {
      normalized.potential_research_gap = displayText(getField(row, ["potential_research_gap", "potential_gap", "gap", "research_gap", "opportunity", "hypothesis"]), "No specific gap is supported by the retrieved excerpts.");
      normalized.evidence_and_rationale = displayText(getField(row, ["evidence_and_rationale", "existing_evidence", "evidence", "basis", "why_it_matters"]), "Evidence is limited to the selected excerpts.");
      normalized.suggested_validation = displayText(getField(row, ["suggested_validation", "validation", "next_step", "recommendation"]), "Validate through a broader literature review and primary studies.");
      const confidence = displayText(getField(row, ["confidence"]), "Low");
      normalized.confidence = ["low", "medium", "high"].includes(confidence.toLowerCase()) ? confidence[0].toUpperCase() + confidence.slice(1).toLowerCase() : "Low";
    }
    return normalized;
  });
}

function parseMarkdownTable(raw: string): Row[] {
  const lines = raw.split("\n").map(line => line.trim()).filter(line => line.startsWith("|") && line.endsWith("|"));
  if (lines.length < 2) return [];
  const cells = (line: string) => line.slice(1, -1).split("|").map(cell => cell.trim());
  const headers = cells(lines[0]);
  return lines.slice(1).filter(line => !/^\|\s*:?-{2,}/.test(line)).map(line => Object.fromEntries(cells(line).map((cell, index) => [headers[index] || `Column ${index + 1}`, cell])));
}

function parseResult(answer: unknown, mode: Mode, sources: Source[]): ParsedResult {
  const decoded = decodeJson(answer);
  const root = asRecord(decoded);
  let rawRows = rowsFrom(decoded);
  const paperNames = [...new Set(sources.map(source => source.filename))];
  if (!rawRows.length) {
    const raw = typeof decoded === "string" ? decoded : typeof answer === "string" ? answer : JSON.stringify(answer);
    rawRows = parseMarkdownTable(raw);
    if (!rawRows.length) {
      const cleaned = raw.replace(/[{}\[\]"]/g, "").replace(/^\s*(?:[-*•]|\d+[.)])\s*/gm, "").trim();
      rawRows = cleaned ? [{ paper: paperNames[0] ?? "Selected papers", ...(mode === "comparison" ? { comparison: cleaned } : { potential_research_gap: cleaned }) }] : [];
    }
  }

  const rows = normalizeRows(rawRows, mode, paperNames);
  const summary = root ? displayText(root.overall_synthesis ?? root.summary ?? root.conclusion, "") : "";
  return { rows: rows.length ? rows : [normalizeRows([{ paper: "Selected papers" }], mode, [])[0]], summary: summary.startsWith("Not identified") ? "" : summary };
}

function hasExtractedDetail(value: unknown): boolean {
  const text = displayText(value, "").toLowerCase();
  return Boolean(text && !text.startsWith("not identified") && !text.startsWith("no specific gap"));
}

function EvidenceCoverageFigure({ rows }: { rows: Row[] }) {
  const dimensions = analysisColumns.map(([key, label]) => [key, label.replace("Research ", "").replace(" / Techniques", "").replace(" / Findings", "")] as const);
  return <figure className="mb-5 rounded-2xl border border-line bg-slate-50/70 p-4 sm:p-5" aria-labelledby="coverage-caption">
    <figcaption id="coverage-caption" className="mb-4 flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-bold">Evidence coverage map</h3><p className="mt-1 text-sm text-muted">Shows which comparison fields were identified in the retrieved excerpts; it is not a quality score.</p></div><div className="flex gap-3 text-xs font-semibold text-muted"><span className="inline-flex items-center gap-1.5"><i className="h-3 w-3 rounded-sm bg-emerald-500"/>Found</span><span className="inline-flex items-center gap-1.5"><i className="h-3 w-3 rounded-sm bg-slate-200"/>Not found</span></div></figcaption>
    <div className="scrollbar overflow-x-auto"><div role="table" aria-label="Evidence coverage by paper and research dimension" className="min-w-[820px]">
      <div role="row" className="grid grid-cols-[minmax(180px,1.5fr)_repeat(6,minmax(92px,1fr))] gap-2 border-b border-line pb-2 text-xs font-bold text-muted"><span role="columnheader">Research paper</span>{dimensions.map(([key,label])=><span key={key} role="columnheader" className="text-center">{label}</span>)}</div>
      {rows.map((row,index)=><div role="row" key={`${String(row.paper)}-${index}`} className="grid grid-cols-[minmax(180px,1.5fr)_repeat(6,minmax(92px,1fr))] items-center gap-2 border-b border-line/70 py-2.5 last:border-0"><span role="rowheader" className="truncate pr-2 text-sm font-semibold text-ink" title={displayText(row.paper)}>{displayText(row.paper)}</span>{dimensions.map(([key,label])=>{const found=hasExtractedDetail(row[key]);return <span key={key} role="cell" aria-label={`${label}: ${found?"evidence identified":"not identified"}`} title={`${displayText(row.paper)} · ${label}: ${found?"evidence identified":"not identified"}`} className={`mx-auto grid h-7 w-7 place-items-center rounded-lg text-xs font-bold ${found?"bg-emerald-100 text-emerald-700":"bg-slate-200 text-slate-500"}`}>{found?"✓":"–"}</span>})}</div>)}
    </div></div>
  </figure>;
}

export function StructuredResult({ title, answer, sources, mode }: { title: string; answer: unknown; sources: Source[]; mode: Mode }) {
  const { rows, summary } = parseResult(answer, mode, sources);
  const columns: string[][] = mode === "comparison"
    ? [["sr_no", "Sr. No."], ["paper", "Research Paper"], ...analysisColumns]
    : [["sr_no", "Sr. No."], ["paper", "Research Paper"], ...gapColumns];

  return <Card className="mt-5">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="text-lg font-bold">{title}</h2><p className="mt-1 text-sm text-muted">A structured, evidence-led view of every selected study.</p></div><div className="grid h-11 w-11 place-items-center rounded-2xl bg-pale text-blue"><BookOpenCheck size={21}/></div></div>
    {summary && <p className="mt-2 max-w-4xl text-[15px] leading-7 text-muted">{summary}</p>}
    <p className="mt-4 inline-flex items-center gap-2 text-sm text-muted"><Sparkles size={15} className="text-blue"/>Each row is one paper; use the horizontal scroll to review all dimensions.</p>
    <div className="mt-4"><EvidenceCoverageFigure rows={rows}/></div>
    <div className="scrollbar mt-3 overflow-x-auto rounded-xl border border-line">
      <table className="w-full min-w-[1320px] border-collapse text-left text-[15px] leading-6">
        <caption className="sr-only">{title}, one row per selected paper</caption>
        <thead className="bg-slate-50"><tr>{columns.map(([key, label]) => <th key={key} scope="col" className="whitespace-nowrap border-b border-line px-4 py-3 text-sm font-bold text-ink">{label}</th>)}</tr></thead>
        <tbody>{rows.map((row, index) => <tr key={`${String(row.paper)}-${index}`} className="align-top even:bg-slate-50/70">{columns.map(([key]) => <td key={key} className={`max-w-[400px] min-w-[150px] whitespace-normal border-b border-line px-4 py-4 text-muted ${key === "sr_no" ? "w-16 text-center font-bold text-ink" : key === "paper" ? "min-w-[250px] font-semibold text-ink" : ""}`}>{key === "sr_no" ? index + 1 : displayText(row[key])}</td>)}</tr>)}</tbody>
      </table>
    </div>
    <SourceCards sources={sources} />
  </Card>;
}
