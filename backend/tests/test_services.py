import pytest
from unittest.mock import Mock, patch

from app.config import settings
from app.services import OpenAIProvider, chunk_pages, extract_pages


def test_chunking_preserves_page_numbers():
    pages = [{"page_number": 1, "text": "First page has research. " * 300},
             {"page_number": 2, "text": "Second page describes results. " * 300}]
    chunks = chunk_pages(pages)
    assert len(chunks) > 2
    assert {c["page_number"] for c in chunks} == {1, 2}
    assert all(c["text"] for c in chunks)


def test_extract_sample_pdf_page_metadata():
    from pathlib import Path
    sample = Path(__file__).resolve().parents[2] / "data/sample_papers/rp1.pdf"
    pages = extract_pages(sample)
    assert pages
    assert pages[0]["page_number"] == 1
    assert any(p["text"] for p in pages)


def test_scanned_empty_content_requires_ocr():
    from pathlib import Path
    import fitz
    path = Path("/tmp/research-empty-page.pdf")
    doc = fitz.open(); doc.new_page(); doc.save(path); doc.close()
    try:
        try:
            extract_pages(path)
            assert False, "expected OCR guidance"
        except ValueError as exc:
            assert "OCR" in str(exc)
    finally:
        path.unlink(missing_ok=True)


@patch("app.services.OpenAI")
def test_openai_provider_uses_responses_api_and_json_mode(mock_openai, monkeypatch):
    monkeypatch.setattr(settings, "openai_api_key", "test-only-key")
    monkeypatch.setattr(settings, "openai_model", "gpt-6-luna")
    monkeypatch.setattr(settings, "llm_temperature", 0.2)
    mock_openai.return_value.responses.create.return_value.output_text = '{"objective":"Evaluate a method"}'

    provider = OpenAIProvider()
    result = provider.generate("Extract the objective", json_mode=True)

    assert result == '{"objective":"Evaluate a method"}'
    mock_openai.return_value.responses.create.assert_called_once_with(
        model="gpt-6-luna",
        input="Extract the objective",
        store=False,
        reasoning={"effort": "none"},
        temperature=0.2,
        text={"format": {"type": "json_object"}},
    )


def test_openai_provider_requires_backend_key(monkeypatch):
    monkeypatch.setattr(settings, "openai_api_key", "")
    with pytest.raises(RuntimeError, match="OPENAI_API_KEY"):
        OpenAIProvider()
