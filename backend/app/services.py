import hashlib
import json
import logging
import re
import uuid
from functools import lru_cache
from pathlib import Path
from typing import Any

import chromadb
import fitz
import numpy as np
from openai import OpenAI, RateLimitError
from sentence_transformers import SentenceTransformer

from app.config import settings
from app.prompts import ANALYSIS_PROMPT, RAG_SYSTEM_PROMPT, SYNTHESIS_PROMPT
from app.schemas import ComparisonResult, ResearchGapResult

logger = logging.getLogger(__name__)


def extract_pages(path: str | Path) -> list[dict[str, Any]]:
    try:
        doc = fitz.open(path)
    except Exception as exc:
        raise ValueError("This file is not a readable PDF.") from exc
    if not len(doc):
        raise ValueError("The PDF contains no pages.")
    pages = []
    for i, page in enumerate(doc, 1):
        text = re.sub(r"[ \t]+", " ", page.get_text("text"))
        text = re.sub(r"\n{3,}", "\n\n", text).strip()
        pages.append({"page_number": i, "text": text})
    doc.close()
    if not any(p["text"] for p in pages):
        raise ValueError("No selectable text was found. This appears to be a scanned PDF; OCR is not configured.")
    return pages


def chunk_pages(pages: list[dict[str, Any]]) -> list[dict[str, Any]]:
    chunks: list[dict[str, Any]] = []
    # Character windows approximate the configured token target while retaining
    # page provenance. Each chunk belongs to one page, so citations stay exact.
    size = settings.chunk_size * 4
    overlap = settings.chunk_overlap * 4
    for page in pages:
        text = page["text"]
        if not text:
            continue
        start = 0
        while start < len(text):
            end = min(start + size, len(text))
            if end < len(text):
                boundary = max(text.rfind("\n", start, end), text.rfind(". ", start, end))
                if boundary > start + size // 2:
                    end = boundary + 1
            content = text[start:end].strip()
            if content:
                chunks.append({"page_number": page["page_number"], "chunk_index": len(chunks), "text": content})
            if end >= len(text):
                break
            start = max(end - overlap, start + 1)
    return chunks


@lru_cache(maxsize=1)
def embedding_model() -> SentenceTransformer:
    logger.info("Loading local embedding model %s", settings.embedding_model)
    return SentenceTransformer(settings.embedding_model)


def encode_texts(texts: list[str], batch_size: int = 32) -> list[list[float]]:
    """Embed complete passages despite MiniLM's 256-token encoder limit.

    Each RAG chunk is split into model-sized token windows, then their normalized
    vectors are averaged into one normalized vector for the original chunk.
    """
    model = embedding_model()
    tokenizer = model.tokenizer
    window_size = max(8, model.max_seq_length - tokenizer.num_special_tokens_to_add(pair=False))
    segments: list[str] = []
    token_weights: list[int] = []
    groups: list[tuple[int, int]] = []
    for text in texts:
        token_ids = tokenizer.encode(text, add_special_tokens=False, truncation=False)
        start = len(segments)
        for offset in range(0, max(len(token_ids), 1), window_size):
            part = token_ids[offset:offset + window_size]
            segments.append(tokenizer.decode(part, skip_special_tokens=True) if part else text[:1000])
            token_weights.append(max(1, len(part)))
        groups.append((start, len(segments)))
    encoded = model.encode(segments, batch_size=batch_size, normalize_embeddings=True, show_progress_bar=False)
    output: list[list[float]] = []
    for start, end in groups:
        vector = np.average(np.asarray(encoded[start:end]), axis=0, weights=token_weights[start:end])
        vector /= max(float(np.linalg.norm(vector)), 1e-12)
        output.append(vector.tolist())
    return output


@lru_cache(maxsize=1)
def chroma_collection():
    client = chromadb.PersistentClient(path=str(settings.chroma_dir))
    return client.get_or_create_collection("research_chunks", metadata={"hnsw:space": "cosine"})


def index_paper(paper: Any, pages: list[dict[str, Any]], on_stage=None) -> int:
    collection = chroma_collection()
    # Keep the previous working index until the replacement has been embedded
    # and fully added; remove it only after the new batch succeeds.
    existing = collection.get(where={"paper_id": paper.id}, include=[])
    chunks = chunk_pages(pages)
    if not chunks:
        raise ValueError("No text was available to index.")
    if on_stage:
        on_stage("embedding")
    texts = [x["text"] for x in chunks]
    vectors = encode_texts(texts, batch_size=32)
    if on_stage:
        on_stage("indexing")
    run_id = str(uuid.uuid4())
    new_ids = [f"{paper.id}:{run_id}:{c['chunk_index']}" for c in chunks]
    added: list[str] = []
    try:
        for start in range(0, len(chunks), 400):
            batch = chunks[start:start + 400]
            batch_ids = new_ids[start:start + 400]
            collection.add(
                ids=batch_ids,
                documents=[c["text"] for c in batch],
                embeddings=vectors[start:start + 400],
                metadatas=[{"paper_id": paper.id, "owner_id": paper.owner_id, "filename": paper.filename,
                            "page_number": c["page_number"], "section": "", "chunk_index": c["chunk_index"]} for c in batch],
            )
            added.extend(batch_ids)
    except Exception:
        if added:
            collection.delete(ids=added)
        raise
    if existing["ids"]:
        collection.delete(ids=existing["ids"])
    return len(chunks)


def delete_vectors(paper_id: str) -> None:
    col = chroma_collection()
    found = col.get(where={"paper_id": paper_id}, include=[])
    if found["ids"]:
        col.delete(ids=found["ids"])


def retrieve(query: str, owner_id: str, paper_ids: list[str] | None = None, top_k: int | None = None) -> list[dict[str, Any]]:
    col = chroma_collection()
    if not col.count():
        return []
    where: dict[str, Any] = {"owner_id": owner_id}
    if paper_ids:
        where = {"$and": [{"owner_id": owner_id}, {"paper_id": {"$in": paper_ids}}]}
    qv = encode_texts([query], batch_size=1)
    raw = col.query(query_embeddings=qv, n_results=min(top_k or settings.top_k, col.count()), where=where,
                    include=["documents", "metadatas", "distances"])
    results = []
    for text, meta, distance in zip(raw["documents"][0], raw["metadatas"][0], raw["distances"][0]):
        score = max(0.0, min(1.0, 1.0 - float(distance)))
        results.append({"paper_id": meta["paper_id"], "filename": meta["filename"],
                        "page_number": int(meta["page_number"]), "section": meta.get("section", ""),
                        "chunk_text": text, "similarity_score": score})
    return results


class LLMProvider:
    def generate(self, prompt: str, temperature: float | None = None, json_mode: bool = False) -> str:
        raise NotImplementedError


class OpenAIProvider(LLMProvider):
    def __init__(self) -> None:
        if not settings.openai_api_key:
            raise RuntimeError("OpenAI is not configured. Add OPENAI_API_KEY to backend/.env.")
        self.client = OpenAI(api_key=settings.openai_api_key, timeout=90.0, max_retries=2)

    def generate(self, prompt: str, temperature: float | None = None, json_mode: bool = False) -> str:
        request: dict[str, Any] = {
            "model": settings.openai_model,
            "input": prompt,
            "store": False,
        }
        # GPT-6 Luna supports effort=none; this keeps the focused RAG workload
        # fast and allows the configured sampling temperature.
        if settings.openai_model == "gpt-6-luna":
            request["reasoning"] = {"effort": "none"}
            request["temperature"] = settings.llm_temperature if temperature is None else temperature
        elif not settings.openai_model.startswith("gpt-6"):
            request["temperature"] = settings.llm_temperature if temperature is None else temperature
        if json_mode:
            request["text"] = {"format": {"type": "json_object"}}
        try:
            response = self.client.responses.create(**request)
        except RateLimitError as exc:
            error = exc.body.get("error", {}) if isinstance(exc.body, dict) else {}
            error_code = error.get("code") if isinstance(error, dict) else None
            logger.warning("OpenAI rate/quota limit reached (code=%s)", error_code or "unknown")
            if error_code == "insufficient_quota":
                raise RuntimeError("OpenAI API quota is exhausted. Check billing or choose an API project with available quota.") from exc
            raise RuntimeError("OpenAI's token rate limit was reached for the configured model. Wait for its limit to reset or choose a model with available capacity, then retry.") from exc
        except Exception as exc:
            logger.exception("OpenAI generation failed")
            raise RuntimeError("OpenAI could not complete the request. Check OPENAI_API_KEY, model access, quota, and service status.") from exc
        if not response.output_text:
            raise RuntimeError("OpenAI returned an empty response.")
        return response.output_text


def llm_provider() -> LLMProvider:
    return OpenAIProvider()


def grounded_answer(question: str, chunks: list[dict[str, Any]], history: list[dict[str, str]] | None = None) -> tuple[str, bool]:
    relevant = [c for c in chunks if c["similarity_score"] >= settings.similarity_threshold]
    if not relevant:
        return "The available documents do not contain enough relevant information to answer this question.", True
    context = "\n\n".join(f"[Source {i+1}: {c['filename']}, page {c['page_number']}]\n{c['chunk_text']}" for i, c in enumerate(relevant))
    prior_turns = "\n".join(f"{turn['role']}: {turn['content'][:1200]}" for turn in (history or []))
    history_block = f"Recent conversation (for resolving references only):\n{prior_turns}\n\n" if prior_turns else ""
    prompt = f"{RAG_SYSTEM_PROMPT}\n\n{history_block}Context:\n{context}\n\nQuestion:\n{question}"
    answer = llm_provider().generate(prompt)
    return answer, False


def structured_paper_analysis(paper: Any, chunks: list[dict[str, Any]]) -> dict[str, Any]:
    if not chunks:
        raise ValueError("No relevant paper text was retrieved for analysis.")
    context = "\n\n".join(f"[page {c['page_number']}] {c['chunk_text']}" for c in chunks)
    prompt = ANALYSIS_PROMPT + "\n\n" + context
    raw = llm_provider().generate(prompt, json_mode=True)
    from app.schemas import StructuredAnalysis
    return StructuredAnalysis.model_validate(json.loads(raw)).model_dump()


def context_generation(task: str, papers: list[dict[str, Any]], topic: str, json_mode: bool = False) -> tuple[str, list[dict[str, Any]]]:
    combined = []
    for paper in papers:
        # Bound context per paper. This keeps multi-paper prompts within model
        # rate limits and prevents the most relevant paper from crowding out
        # every other selected paper in comparison/research-gap tasks.
        combined.extend(retrieve(topic, paper["owner_id"], [paper["id"]], top_k=2))
    combined = sorted(combined, key=lambda x: x["similarity_score"], reverse=True)
    relevant = [c for c in combined if c["similarity_score"] >= settings.similarity_threshold]
    if not relevant:
        return "The available documents do not contain enough relevant information for this request.", []
    context = "\n\n".join(f"[{c['filename']} page {c['page_number']}] {c['chunk_text']}" for c in relevant)
    answer = llm_provider().generate(f"{SYNTHESIS_PROMPT}\n\nTask: {task}\nTopic: {topic}\n\n{context}", json_mode=json_mode)
    return answer, relevant


def _decode_generated_json(raw: str) -> Any | None:
    """Decode JSON even when a model wraps it in prose, fences, or a JSON string."""
    candidate = raw.strip()
    for _ in range(3):
        candidate = re.sub(r"^```(?:json)?\s*|\s*```$", "", candidate, flags=re.IGNORECASE).strip()
        try:
            decoded = json.loads(candidate)
        except (json.JSONDecodeError, TypeError):
            decoded = None
        if decoded is not None:
            if isinstance(decoded, str) and decoded.strip() != candidate:
                candidate = decoded.strip()
                continue
            return decoded

        # Find a balanced object/array embedded in explanatory text. Ignore
        # braces inside JSON strings so prose or examples do not truncate it.
        start = next((i for i, char in enumerate(candidate) if char in "{["), -1)
        if start < 0:
            return None
        opening = candidate[start]
        closing = "}" if opening == "{" else "]"
        depth = 0
        quoted = escaped = False
        end = -1
        for index in range(start, len(candidate)):
            char = candidate[index]
            if quoted:
                if escaped:
                    escaped = False
                elif char == "\\":
                    escaped = True
                elif char == '"':
                    quoted = False
                continue
            if char == '"':
                quoted = True
            elif char == opening:
                depth += 1
            elif char == closing:
                depth -= 1
                if depth == 0:
                    end = index + 1
                    break
        if end < 0:
            return None
        candidate = candidate[start:end]
    return None


def _as_text(value: Any, default: str = "") -> str:
    if value is None:
        return default
    if isinstance(value, str):
        return value.strip() or default
    if isinstance(value, list):
        return "; ".join(filter(None, (_as_text(item) for item in value))) or default
    if isinstance(value, dict):
        return "; ".join(f"{key}: {_as_text(item)}" for key, item in value.items()) or default
    return str(value)


def _result_rows(parsed: Any) -> list[Any]:
    if isinstance(parsed, list):
        return parsed
    if not isinstance(parsed, dict):
        return []
    for key in ("rows", "dimensions", "gaps", "comparisons", "research_gaps", "items", "results"):
        value = parsed.get(key)
        if isinstance(value, list):
            return value
    return []


def _field(row: dict[str, Any], *names: str) -> Any:
    normalized = {re.sub(r"[^a-z0-9]+", "_", str(key).lower()).strip("_"): value for key, value in row.items()}
    for name in names:
        key = re.sub(r"[^a-z0-9]+", "_", name.lower()).strip("_")
        if normalized.get(key) not in (None, ""):
            return normalized[key]
    return None


def _dimension_key(label: Any) -> str | None:
    value = re.sub(r"[^a-z]+", " ", _as_text(label).lower()).strip()
    aliases = {
        "research_problem": ("research problem", "problem", "research question", "question", "objective", "aim", "purpose"),
        "methods": ("method", "methods", "methodology", "research design", "study design", "approach"),
        "data": ("data", "dataset", "datasets", "sample", "participants"),
        "results": ("result", "results", "finding", "findings", "contribution"),
        "limitations": ("limitation", "limitations", "caveat", "caveats"),
        "future_work": ("future work", "future research", "recommendation", "recommendations", "next steps"),
    }
    return next((key for key, terms in aliases.items() if value in terms), None)


def _split_comparison_by_paper(text: str, paper_names: list[str]) -> dict[str, str]:
    starts: list[tuple[int, str]] = []
    for name in paper_names:
        match = re.search(re.escape(name), text, re.IGNORECASE)
        if match:
            starts.append((match.start(), name))
    starts.sort()
    result: dict[str, str] = {}
    for index, (start, name) in enumerate(starts):
        end = starts[index + 1][0] if index + 1 < len(starts) else len(text)
        result[name] = text[start + len(name):end].strip(" \t\r\n:;,.—-[]")
    return result


def _missing_paper_row(name: str) -> dict[str, str]:
    missing = "Not identified in the retrieved excerpts."
    return {"paper": name, "research_problem": missing, "methods": missing, "data": missing,
            "results": missing, "limitations": missing, "future_work": missing}


def normalize_structured_generation(raw: str, kind: str, paper_names: list[str] | None = None) -> dict[str, Any]:
    """Validate model output and return a paper-per-row research matrix."""
    paper_names = paper_names or []
    parsed = _decode_generated_json(raw)
    raw_rows = _result_rows(parsed)
    if not raw_rows:
        # Older outputs may be markdown or plain text. Keep a deterministic
        # fallback and never send an unparsed JSON blob to the browser.
        table_lines = [line.strip() for line in raw.splitlines() if line.strip().startswith("|") and line.strip().endswith("|")]
        if len(table_lines) >= 2:
            headers = [cell.strip() for cell in table_lines[0].strip("|").split("|")]
            raw_rows = [dict(zip(headers, [cell.strip() for cell in line.strip().strip("|").split("|")]))
                        for line in table_lines[1:] if not re.match(r"^\|\s*:?-{2,}", line.strip())]
        else:
            clean = re.sub(r"^```(?:json)?\s*|\s*```$", "", raw.strip(), flags=re.IGNORECASE)
            parts = [re.sub(r"^\s*(?:[-*•]|\d+[.)])\s*", "", line).strip() for line in clean.splitlines()]
            parts = [part for part in parts if part and not part.startswith(("{", "}", "[", "]"))]
            raw_rows = parts or ["The available evidence did not produce a structured result. Review the cited excerpts and try again."]

    summary = ""
    if isinstance(parsed, dict):
        summary = _as_text(parsed.get("overall_synthesis") or parsed.get("summary") or parsed.get("conclusion"))
    elif "not contain enough relevant information" in raw.lower():
        summary = raw.strip()

    paper_rows: dict[str, dict[str, Any]] = {}
    legacy_dimensions: dict[str, dict[str, str]] = {}
    legacy_gaps: list[str] = []
    for item in raw_rows:
        row = item if isinstance(item, dict) else {}
        paper = _as_text(_field(row, "paper", "paper_name", "filename", "study", "source"))
        if kind == "comparison" and _field(row, "dimension", "aspect", "criterion") is not None:
            dimension = _dimension_key(_field(row, "dimension", "aspect", "criterion"))
            comparison = _as_text(_field(row, "comparison", "analysis", "findings", "observation", "details", "evidence"))
            if dimension and comparison:
                for name, text in _split_comparison_by_paper(comparison, paper_names).items():
                    legacy_dimensions.setdefault(name, {})[dimension] = text
            continue
        if kind == "research_gaps" and not paper and _field(row, "potential_gap", "gap", "research_gap", "opportunity", "hypothesis") is not None:
            legacy_gaps.append(_as_text(_field(row, "potential_gap", "gap", "research_gap", "opportunity", "hypothesis")))
            continue

        if not paper and paper_names:
            combined = _as_text(item)
            matches = [name for name in paper_names if re.search(re.escape(name), combined, re.IGNORECASE)]
            paper = matches[0] if len(matches) == 1 else ""
        if not paper:
            continue
        key = paper.lower()
        target = next((name for name in paper_names if name.lower() == key or Path(name).stem.lower() == Path(paper).stem.lower()), paper)

        if kind == "comparison":
            current = _missing_paper_row(target)
            for field, aliases in {
                "research_problem": ("research_problem", "research_question", "problem", "objective", "aim"),
                "methods": ("methods", "methodology", "method", "research_design", "approach"),
                "data": ("data", "dataset", "datasets", "sample", "participants"),
                "results": ("results", "result", "findings", "key_findings"),
                "limitations": ("limitations", "limitation", "caveats"),
                "future_work": ("future_work", "future_research", "recommendations", "next_steps"),
            }.items():
                current[field] = _as_text(_field(row, *aliases), current[field])
            paper_rows[target] = current
        else:
            current = _missing_paper_row(target)
            for field, aliases in {
                "research_problem": ("research_problem", "research_question", "problem", "objective"),
                "methods": ("methods", "methodology", "method", "research_design"),
                "data": ("data", "dataset", "datasets", "sample"),
                "results": ("results", "result", "findings"),
                "limitations": ("limitations", "limitation", "caveats"),
                "future_work": ("future_work", "future_research", "recommendations"),
            }.items():
                current[field] = _as_text(_field(row, *aliases), current[field])
            current.update({
                "potential_research_gap": _as_text(_field(row, "potential_research_gap", "potential_gap", "gap", "research_gap", "opportunity", "hypothesis"), "No specific gap is supported by the retrieved excerpts."),
                "evidence_and_rationale": _as_text(_field(row, "evidence_and_rationale", "existing_evidence", "evidence", "basis", "why_it_matters")),
                "suggested_validation": _as_text(_field(row, "suggested_validation", "validation", "next_step", "recommendation")),
                "confidence": _as_text(_field(row, "confidence"), "Low").capitalize(),
            })
            if current["confidence"] not in {"Low", "Medium", "High"}:
                current["confidence"] = "Low"
            paper_rows[target] = current

    if paper_names:
        rows = []
        for name in paper_names:
            row = paper_rows.get(name)
            if row is None and name in legacy_dimensions:
                row = _missing_paper_row(name)
                row.update(legacy_dimensions[name])
            if row is None:
                row = _missing_paper_row(name)
            if kind == "research_gaps":
                default_gap = "No specific gap is supported by the retrieved excerpts."
                row.setdefault("potential_research_gap", default_gap)
                row.setdefault("evidence_and_rationale", "")
                row.setdefault("suggested_validation", "")
                row.setdefault("confidence", "Low")
                if legacy_gaps:
                    if row["potential_research_gap"] == default_gap:
                        row["potential_research_gap"] = " ".join(legacy_gaps)
                    if not row["evidence_and_rationale"]:
                        row["evidence_and_rationale"] = "Gap suggestions were returned in the previous non paper-specific format; verify them against this paper's cited excerpts."
            rows.append(row)
    else:
        rows = list(paper_rows.values())
        if not rows:
            rows = [_missing_paper_row("Selected papers")]
        if kind == "research_gaps":
            for row in rows:
                row.setdefault("potential_research_gap", "No specific gap is supported by the retrieved excerpts.")
                row.setdefault("evidence_and_rationale", "")
                row.setdefault("suggested_validation", "")
                row.setdefault("confidence", "Low")

    if kind == "comparison":
        return ComparisonResult.model_validate({"rows": rows, "overall_synthesis": summary}).model_dump()
    return ResearchGapResult.model_validate({"rows": rows, "overall_synthesis": summary}).model_dump()


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as f:
        for block in iter(lambda: f.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()
