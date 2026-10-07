# API overview

All application routes are under `/api`. Authentication uses an HTTP-only signed session cookie. Errors use FastAPI's `detail` field; unhandled failures are logged server-side and returned as a generic message.

| Method | Route | Purpose |
|---|---|---|
| GET | `/api/health` | Service and OpenAI configuration status |
| POST | `/api/auth/register`, `/api/auth/login`, `/api/auth/logout` | Local account lifecycle |
| GET | `/api/auth/me` | Current account |
| POST | `/api/papers/upload` | Upload and index PDF files |
| GET | `/api/papers`, `/api/papers/{id}` | List and inspect owned papers |
| DELETE | `/api/papers/{id}` | Remove file, vectors, and metadata |
| POST | `/api/papers/{id}/reindex` | Replace vectors for a paper |
| POST | `/api/papers/{id}/analyze`, `/summarize` | Grounded paper analysis |
| POST | `/api/chat` | RAG question-answering with citations |
| GET/DELETE | `/api/chats`, `/api/chats/{id}` | Conversation history |
| POST | `/api/search`, `/api/compare`, `/api/literature-review`, `/api/research-gaps` | Retrieval and multi-paper generation |
| GET | `/api/dashboard`, `/api/papers/{id}/file`, `/api/papers/{id}/export` | Dashboard and paper artifacts |

Interactive API documentation is available at `/docs` while the backend runs.

## Structured generation responses

`POST /api/compare` returns `comparison` as an object, not a JSON string. It contains one row per selected paper, in selection order. The columns are `paper`, `research_problem`, `methods`, `data`, `results`, `limitations`, and `future_work`; `overall_synthesis` contains a short synthesis. `POST /api/research-gaps` returns the same per-paper matrix fields plus `potential_research_gap`, `evidence_and_rationale`, `suggested_validation`, and `confidence` (`Low`, `Medium`, or `High`). Both endpoints return retrieved `sources` separately so the UI can display citations from chunk metadata.

The backend parses and validates model output before responding. If the model returns fenced JSON, JSON embedded in prose, a markdown table, or plain text, the backend converts it into the documented row shape. The frontend validates the response and has a second compatibility parser for older server responses.
