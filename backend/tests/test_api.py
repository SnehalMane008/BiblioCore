from fastapi.testclient import TestClient
from app.main import app
import uuid
import os
import pytest


def test_health_reports_provider_configuration():
    response = TestClient(app).get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"
    assert isinstance(response.json()["openai_configured"], bool)


def test_protected_papers_requires_login():
    response = TestClient(app).get("/api/papers")
    assert response.status_code == 401


def test_loopback_origins_can_preflight_auth_requests():
    for origin in ("http://localhost:3000", "http://127.0.0.1:3000"):
        response = TestClient(app).options("/api/auth/register", headers={
            "Origin": origin,
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type",
        })
        assert response.status_code == 200
        assert response.headers["access-control-allow-origin"] == origin


def test_register_and_owner_scoped_papers():
    client = TestClient(app)
    email = f"test-{uuid.uuid4()}@example.com"
    password = "correct-horse-battery"
    response = client.post("/api/auth/register", json={"name":"Test Reader", "email":email, "password":password})
    assert response.status_code == 200
    user_id = response.json()["id"]
    assert client.get("/api/papers").json() == []
    client.post("/api/auth/logout")
    assert client.get("/api/papers").status_code == 401
    assert client.get("/api/auth/me").status_code == 401
    assert client.post("/api/auth/login", json={"email":email, "password":"incorrect-password"}).status_code == 401
    login = client.post("/api/auth/login", json={"email":email, "password":password})
    assert login.status_code == 200
    assert login.json()["id"] == user_id
    assert client.get("/api/auth/me").json()["id"] == user_id
    client.post("/api/auth/logout")
    assert client.get("/api/auth/me").status_code == 401


@pytest.mark.skipif(os.environ.get("RUN_LOCAL_RAG_TESTS") != "1", reason="Downloads and runs the local Sentence Transformer model")
def test_real_pdf_to_chroma_semantic_retrieval():
    from pathlib import Path
    client = TestClient(app)
    user = client.post("/api/auth/register", json={"name":"Local RAG Evaluator", "email":f"local-rag-{uuid.uuid4()}@example.com", "password":"correct-horse-battery"})
    assert user.status_code == 200
    sample = Path(__file__).resolve().parents[2] / "data/sample_papers/rp1.pdf"
    with sample.open("rb") as f:
        uploaded = client.post("/api/papers/upload", files=[("files", ("local-sample.pdf", f, "application/pdf"))])
    assert uploaded.status_code == 200, uploaded.text
    paper = next(p for p in client.get("/api/papers").json() if p["filename"] == "local-sample.pdf")
    assert paper["status"] == "indexed", paper
    results = client.post("/api/search", json={"query":"What is the main research objective?", "paper_ids":[paper["id"]]})
    assert results.status_code == 200, results.text
    citations = results.json()["results"]
    assert citations
    assert all(c["paper_id"] == paper["id"] and c["page_number"] > 0 and c["chunk_text"] for c in citations)


@pytest.mark.skipif(os.environ.get("RUN_LIVE_RAG_TESTS") != "1", reason="Live test downloads the local model and calls OpenAI")
def test_real_pdf_to_indexed_cited_answer():
    from pathlib import Path
    client = TestClient(app)
    user = client.post("/api/auth/register", json={"name":"RAG Evaluator", "email":f"rag-{uuid.uuid4()}@example.com", "password":"correct-horse-battery"})
    assert user.status_code == 200
    sample = Path(__file__).resolve().parents[2] / "data/sample_papers/rp1.pdf"
    with sample.open("rb") as f:
        uploaded = client.post("/api/papers/upload", files=[("files", ("sample-study.pdf", f, "application/pdf"))])
    assert uploaded.status_code == 200, uploaded.text
    paper = next(p for p in client.get("/api/papers").json() if p["filename"] == "sample-study.pdf")
    assert paper["status"] == "indexed", paper
    answer = client.post("/api/chat", json={"question":"What is the main research objective of this paper?", "paper_ids":[paper["id"]]})
    assert answer.status_code == 200, answer.text
    body = answer.json()
    assert body["answer"]
    assert body["sources"]
    assert all(source["paper_id"] == paper["id"] and source["page_number"] > 0 and source["chunk_text"] for source in body["sources"])
