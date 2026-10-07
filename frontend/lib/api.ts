function apiBase(): string {
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;
  if (typeof window !== "undefined") {
    return `${window.location.protocol}//${window.location.hostname}:8000`;
  }
  return "http://localhost:8000";
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${apiBase()}${path}`, { ...options, credentials: "include", headers: { ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }), ...options.headers } });
  if (!response.ok) { const body = await response.json().catch(() => ({})); throw new Error(body.detail || `Request failed (${response.status})`); }
  return response.json() as Promise<T>;
}
export async function download(path: string) { const res = await fetch(`${apiBase()}${path}`, { credentials: "include" }); if (!res.ok) throw new Error("Download failed"); const blob = await res.blob(); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href=url; a.download="research-notes.md"; a.click(); URL.revokeObjectURL(url); }
export async function openPdf(path: string) { const tab = window.open("about:blank", "_blank"); try { const res = await fetch(`${apiBase()}${path}`, { credentials: "include" }); if (!res.ok) throw new Error("Could not open PDF"); const blob = await res.blob(); if (tab) tab.location.href = URL.createObjectURL(blob); else throw new Error("Allow pop-ups to open this PDF."); } catch (error) { tab?.close(); throw error; } }
export type Paper = { id:string; filename:string; title:string; authors:string[]; page_count:number; status:string; error_message?:string; summary?:string; created_at:string };
export type Source = { paper_id:string; filename:string; page_number:number; section:string; chunk_text:string; similarity_score:number };

export function readStructuredResponse(payload: unknown, key: "comparison" | "research_gaps"): { answer: string | Record<string, unknown>; sources: Source[] } {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new Error("The server returned an invalid analysis response. Please try again.");
  const result = payload as Record<string, unknown>;
  const answer = result[key];
  if (typeof answer !== "string" && (!answer || typeof answer !== "object" || Array.isArray(answer))) {
    throw new Error("The server did not return a comparison table. Please try again.");
  }
  if (typeof answer === "string" && !answer.trim()) throw new Error("The server returned an empty analysis. Please try again.");
  if (!Array.isArray(result.sources) || result.sources.some(source => {
    if (!source || typeof source !== "object") return true;
    const item = source as Record<string, unknown>;
    return typeof item.paper_id !== "string" || typeof item.filename !== "string" || !Number.isInteger(item.page_number) || typeof item.chunk_text !== "string" || typeof item.similarity_score !== "number";
  })) throw new Error("The server returned invalid source citations. Please try again.");
  return { answer: answer as string | Record<string, unknown>, sources: result.sources as Source[] };
}
