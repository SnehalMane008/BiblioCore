"""Evidence-only analytics derived from papers in a single user's library."""

import json
import re
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any

from app.services import extract_pages

TONE_CUES = {
    "hedging": ("may", "might", "could", "possibly", "potential", "suggest", "suggests", "suggested", "appears", "likely", "perhaps"),
    "limitations": ("limitation", "limitations", "challenge", "challenges", "bias", "uncertain", "uncertainty", "weakness", "weaknesses", "constraint", "constraints"),
    "evidence": ("show", "shows", "shown", "demonstrate", "demonstrates", "demonstrated", "find", "finds", "found", "report", "reports", "reported", "evidence", "result", "results"),
}
SECTION_PATTERNS = (
    ("Abstract", re.compile(r"^(?:abstract|summary)$", re.I)),
    ("Introduction", re.compile(r"^(?:introduction|background|related work|literature review|state of the art)$", re.I)),
    ("Methods", re.compile(r"^(?:method|methods|methodology|research design|materials and methods|experimental setup|study design)$", re.I)),
    ("Results", re.compile(r"^(?:results?|findings|experiments?)$", re.I)),
    ("Discussion", re.compile(r"^(?:discussion|results and discussion)$", re.I)),
    ("Conclusion", re.compile(r"^(?:conclusions?|concluding remarks|limitations and future work)$", re.I)),
)

STOPWORDS = set("""a about above after again against all am an and any are as at be because been before being below between both but by could did do does doing down during each few for from further had has have having he her here hers herself him himself his how i if in into is it its itself just me more most my myself no nor not of off on once only or other our ours ourselves out over own same she should so some such than that the their theirs them themselves then there these they this those through to too under until up very was we were what when where which while who whom why will with would you your yours yourself yourselves abstract analysis approach approaches based data dataset evaluate evaluation experimental figure findings first framework general however including introduction literature may method methodology methods model models new paper papers proposed research results section study studies table using use used using various""".split())


def _authors(paper: Any) -> list[str]:
    values: list[Any] = []
    try:
        values.extend(json.loads(paper.authors or "[]"))
    except (TypeError, json.JSONDecodeError):
        pass
    try:
        analysis = json.loads(paper.analysis_json or "{}")
        if isinstance(analysis, dict):
            values.extend(_string_list(analysis.get("authors", [])))
    except (TypeError, json.JSONDecodeError):
        pass
    return list(dict.fromkeys(str(value).strip() for value in values if str(value).strip()))


def _string_list(value: Any) -> list[str]:
    values = value if isinstance(value, list) else [value] if isinstance(value, str) else []
    return [str(item).strip() for item in values if str(item).strip()]


def _bibliography(text: str) -> str:
    match = re.search(r"(?im)^\s*(references|bibliography|works cited|literature cited)\s*$", text)
    return text[match.end():] if match else ""


def _readability(text: str) -> tuple[int, float, float]:
    words = re.findall(r"[A-Za-z][A-Za-z'-]*", text)
    sentences = [part for part in re.split(r"[.!?]+", text) if len(re.findall(r"[A-Za-z]+", part)) >= 3]
    if not words:
        return 0, 0.0, 0.0
    average_sentence_words = len(words) / max(len(sentences), 1)
    lexical_diversity = len({word.lower() for word in words}) / len(words)
    return len(words), round(average_sentence_words, 1), round(lexical_diversity * 100, 1)


def _section_tone(text: str) -> dict[str, dict[str, Any]]:
    sections: dict[str, list[str]] = defaultdict(list)
    current: str | None = None
    for line in text.splitlines():
        heading = re.sub(r"^\s*\d+(?:\.\d+)*\.?\s*", "", line).strip().rstrip(":").strip()
        section = next((label for label, pattern in SECTION_PATTERNS if pattern.fullmatch(heading)), None)
        if section:
            current = section
            continue
        if current:
            sections[current].append(line)
    result: dict[str, dict[str, Any]] = {}
    for section, lines in sections.items():
        content = " ".join(lines)
        words = re.findall(r"\b[a-zA-Z]+\b", content)
        if len(words) < 25:
            continue
        lowered = f" {content.lower()} "
        counts = {key: sum(len(re.findall(rf"\b{re.escape(term)}\b", lowered)) for term in cues)
                  for key, cues in TONE_CUES.items()}
        result[section] = {"word_count": len(words), "counts": counts}
    return result


def build_library_analytics(papers: list[Any]) -> dict[str, Any]:
    indexed = [paper for paper in papers if paper.status == "indexed" and Path(paper.file_path).is_file()]
    paper_rows: list[dict[str, Any]] = []
    terms: Counter[str] = Counter()
    coauthor_edges: Counter[tuple[str, str]] = Counter()
    author_papers: dict[str, set[str]] = defaultdict(set)
    tone_totals: dict[str, dict[str, int]] = defaultdict(lambda: {"word_count": 0, **{key: 0 for key in TONE_CUES}})
    prepared: list[dict[str, Any]] = []

    for paper in indexed:
        text = "\n".join(page["text"] for page in extract_pages(paper.file_path))
        references = _bibliography(text)
        title = paper.title or paper.filename
        authors = _authors(paper)
        try:
            analysis = json.loads(paper.analysis_json or "{}")
        except (TypeError, json.JSONDecodeError):
            analysis = {}
        methodology = str(analysis.get("methodology", "")).strip() if isinstance(analysis, dict) else ""
        datasets = _string_list(analysis.get("datasets", [])) if isinstance(analysis, dict) else []
        models = _string_list(analysis.get("models", [])) if isinstance(analysis, dict) else []
        evaluation_metrics = _string_list(analysis.get("evaluation_metrics", [])) if isinstance(analysis, dict) else []
        results = str(analysis.get("results", "")).strip() if isinstance(analysis, dict) else ""
        word_count, average_sentence_words, lexical_diversity = _readability(text)
        prepared.append({"paper": paper, "text": text, "references": references, "title": title, "authors": authors,
                         "methodology": methodology, "datasets": datasets, "models": models,
                         "evaluation_metrics": evaluation_metrics, "results": results, "word_count": word_count,
                         "average_sentence_words": average_sentence_words, "lexical_diversity": lexical_diversity,
                         "bibliography_word_count": len(re.findall(r"\b[\w'-]+\b", references))})

        for author in authors:
            author_papers[author].add(title)
        for left_index, left in enumerate(authors):
            for right in authors[left_index + 1:]:
                pair = tuple(sorted((left, right), key=str.casefold))
                coauthor_edges[pair] += 1

        tokens = [token.lower() for token in re.findall(r"\b[a-zA-Z][a-zA-Z'-]{2,}\b", text)]
        terms.update(token for token in tokens if token not in STOPWORDS and not token.isdigit())
        for section, stats in _section_tone(text).items():
            tone_totals[section]["word_count"] += stats["word_count"]
            for key, count in stats["counts"].items():
                tone_totals[section][key] += count

    for entry in prepared:
        paper = entry["paper"]
        paper_rows.append({
            "id": paper.id,
            "title": entry["title"],
            "filename": paper.filename,
            "authors": entry["authors"],
            "page_count": paper.page_count,
            "bibliography_word_count": entry["bibliography_word_count"],
            "word_count": entry["word_count"],
            "average_sentence_words": entry["average_sentence_words"],
            "lexical_diversity_percent": entry["lexical_diversity"],
            "methodology": entry["methodology"],
            "datasets": entry["datasets"],
            "models": entry["models"],
            "evaluation_metrics": entry["evaluation_metrics"],
            "results": entry["results"],
        })

    coauthors = [{"name": name, "papers": sorted(titles)} for name, titles in sorted(author_papers.items())]
    return {
        "papers": paper_rows,
        "keywords": [{"term": term, "count": count} for term, count in terms.most_common(18)],
        "coauthors": coauthors,
        "coauthor_edges": [{"source": pair[0], "target": pair[1], "paper_count": count} for pair, count in coauthor_edges.items()],
        "tone_sections": [{"section": section, "word_count": totals["word_count"], **{key: totals[key] for key in TONE_CUES}}
                          for section, totals in tone_totals.items()],
        "coverage": {
            "indexed_papers": len(indexed),
        },
    }
