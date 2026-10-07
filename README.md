# BiblioCore

A semester-project application for exploring academic PDFs with retrieval-augmented generation. It extracts PDF text by page, creates local Sentence Transformer embeddings, stores chunks in persistent ChromaDB, retrieves evidence, and asks OpenAI to answer using only that context. Citation metadata comes from retrieved chunks.

## Problem statement and objectives

Academic papers are lengthy and difficult to compare manually. This project provides a local workspace for asking questions across user-provided papers while keeping answers tied to retrieved excerpts and page numbers. It demonstrates LLMs, local embeddings, semantic search, persistent vector storage, prompt grounding, structured output, and retrieval evaluation.

## Features

- Private accounts, paper library, PDF upload and indexing, semantic search, paper chat, summaries, structured analysis, multi-paper comparison, literature review drafts, potential research-gap suggestions, and Markdown export.
- Page-aware source excerpts and refusal when retrieval confidence is below the configured threshold.
- Local SQLite metadata, local persistent ChromaDB, local `sentence-transformers/all-MiniLM-L6-v2` embeddings, and backend-only OpenAI credentials.
- Four sample PDFs are in `data/sample_papers/` for manual demonstrations.

## Architecture and stack

Next.js App Router, TypeScript, React, Tailwind CSS, Lucide; FastAPI, Pydantic, SQLAlchemy, PyMuPDF, Sentence Transformers, ChromaDB, SQLite, and Google GenAI SDK. See [architecture](docs/architecture.md), [RAG pipeline](docs/rag-pipeline.md), and [API overview](docs/api-documentation.md).

## Folder guide

`frontend/` contains the Next.js interface, `backend/app/` the FastAPI application, `backend/tests/` backend checks, `data/sample_papers/` demo PDFs, `data/uploads/` private uploaded PDFs, `chroma_db/` persistent vectors, `evaluation/` labeled retrieval questions and CLI, and `docs/` architecture and viva materials.

## Prerequisites

- Python 3.11 or newer (Python 3.12 is recommended for the ML dependency ecosystem).
- Node.js 20 or newer and npm.
- An OpenAI API key for generation. PDF extraction and indexing work without it; answering requires it.

## Configuration

Copy `.env.example` to `backend/.env` and set `OPENAI_API_KEY`. Set `SECRET_KEY` to a long random value. Keep `COOKIE_SECURE=false` for local HTTP; set it to `true` behind HTTPS. Do not commit `.env` or expose the OpenAI key through a `NEXT_PUBLIC_` variable.

Defaults: `DATABASE_URL=sqlite:///./data/research_assistant.db`, `CHROMA_PERSIST_DIRECTORY=./chroma_db`, frontend API URL `http://localhost:8000`, chunk size 1,000 tokens, overlap 150, top-k 5, cosine similarity threshold 0.25, upload size limit 50 MB. OpenAI generation uses the `gpt-6-luna` model by default. The backend calls the Responses API and disables response storage for these requests. See [OpenAI's model documentation](https://developers.openai.com/api/docs/models/gpt-6-luna) and [Responses API guide](https://developers.openai.com/api/docs/guides/text).

## Run locally

Backend terminal:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Frontend terminal:

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:3000`. API docs: `http://localhost:8000/docs`; health: `http://localhost:8000/api/health`. The first indexing request downloads the embedding model and can take a while. Storage lives under `data/`, and Chroma files live under `chroma_db/`.

## First-use walkthrough

1. Register a local account.
2. Upload one sample or real academic PDF in **Paper library**; wait for indexing to finish.
3. Open **Research assistant**, ask a question, and inspect the source paper/page excerpts.
4. Try a question the paper cannot answer; the assistant should decline when retrieval is below threshold.
5. Add multiple papers for comparison, literature-review drafts, and potential gap analysis. Treat generated prose as a draft and verify its cited evidence.

## API

The principal routes are `/api/auth/{register,login,logout,me}`, `/api/papers/upload`, `/api/papers`, `/api/papers/{id}`, `/api/papers/{id}/{analyze,summarize,reindex}`, `/api/chat`, `/api/chats`, `/api/search`, `/api/compare`, `/api/literature-review`, `/api/research-gaps`, and `/api/health`. Full route details are in [docs/api-documentation.md](docs/api-documentation.md).

## Database and evaluation

SQLite stores users, paper metadata, chats, messages, and analyses. ChromaDB stores vectors and chunk metadata. See [database schema](docs/database-schema.md). Add human-reviewed retrieval labels before reporting evaluation metrics; the starter dataset is intentionally empty. See [evaluation guide](docs/evaluation.md) and `evaluation/README.md`.

## Tests

Backend tests: `cd backend && python -m pytest -q`. They cover page extraction, page metadata, chunking, OCR-required detection, auth, provider request formatting, and protected endpoints. Run PDF-to-Chroma integration without an LLM with `RUN_LOCAL_RAG_TESTS=1 python -m pytest -q tests/test_api.py::test_real_pdf_to_chroma_semantic_retrieval`. Run the full OpenAI pipeline with `RUN_LIVE_RAG_TESTS=1 python -m pytest -q tests/test_api.py::test_real_pdf_to_indexed_cited_answer`; it downloads the local model and makes a live OpenAI request. Frontend: `cd frontend && npm run lint && npm run typecheck && npm test`; production compilation: `npm run build`.

## Limitations and future scope

Scanned PDFs require OCR, which is not implemented. Header/footer removal and section detection are basic; the section field is blank when it cannot be safely inferred. Similarity is a heuristic rather than a calibrated confidence probability. The app is local-development software: use HTTPS and a secure cookie configuration before exposing it publicly.

## Future scope

OCR, ArXiv integration, DOI metadata extraction, research-paper web search, citation graphs, voice interaction, multilingual assistance, local LLM support, advanced reranking, hybrid keyword/semantic retrieval, and cross-domain analysis are documented directions and are not implemented.

## Screenshots and project team

Add real application screenshots under `docs/screenshots/` after running the app; no illustrative or placeholder images are presented as working product screens. Add the project team, guide, college, and semester details here before submitting the academic report.

## Project workflow and viva

See [GenAI concepts](docs/genai-concepts.md) and [project workflow](docs/project-workflow.md). Explain the path from page text to chunks and vectors, why ChromaDB retrieval precedes OpenAI generation, how page metadata becomes citations, and what the system does when evidence is weak. Never claim evaluation scores unless you measured them on labeled examples.
