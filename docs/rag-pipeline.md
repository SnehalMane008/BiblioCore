# RAG pipeline

1. Validate the PDF and store it with a generated server-side name.
2. Extract selectable text by page with PyMuPDF. Empty/image-only files receive an explicit OCR-required error.
3. Split each page into overlapping text windows; every chunk retains paper ID, filename, page, and chunk index.
4. Embed batches with the cached local `all-MiniLM-L6-v2` model.
5. Persist chunk text, vectors, and metadata in ChromaDB. Re-indexing deletes and replaces that paper's vectors.
6. Embed a question and retrieve top-k chunks filtered to the signed-in owner's selected papers.
7. Convert Chroma cosine distance to a bounded similarity score and refuse below the configured threshold.
8. Send only the retrieved evidence to OpenAI. Return citations from Chroma metadata, never model-generated source labels.

Similarity is a retrieval heuristic, not a calibrated probability. The user should inspect source excerpts and verify claims against the PDF.
