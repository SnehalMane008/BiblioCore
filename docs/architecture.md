# Architecture

The monorepo separates the Next.js frontend from the FastAPI backend. SQLite stores account and application metadata; ChromaDB stores vectors and chunk metadata on disk. Sentence Transformers runs locally. OpenAI receives only retrieved passages for generation.

```text
Next.js UI ──cookie-authenticated JSON──> FastAPI
                                         ├── SQLite: accounts, papers, chats, messages, analyses
                                         ├── PyMuPDF: per-page extraction
                                         ├── Sentence Transformers: local vectors
                                         ├── ChromaDB: persistent vectors and page metadata
                                         └── OpenAI Responses API: retrieved context to answer
```

Each vector includes both `owner_id` and `paper_id`; queries filter by owner before returning results. Uploaded files are stored under a per-user directory. Passwords are Argon2 hashed and sessions use signed, HTTP-only, SameSite cookies. This is intended for local development; production deployment should use HTTPS and set the session cookie's `Secure` flag.
