# GenAI concepts for a viva

- **LLM:** OpenAI generates a natural-language answer from the question and selected evidence.
- **Embedding:** A local Sentence Transformer represents a text passage or question as a vector.
- **Vector database:** ChromaDB indexes those vectors and retrieves semantically similar chunks.
- **RAG:** Retrieval happens before generation; the model receives relevant passages instead of the full library.
- **Prompt engineering:** System instructions require evidence-only responses and explicit uncertainty.
- **Grounding:** Returned source metadata points to the actual page and excerpt retrieved from the PDF.
- **Structured output:** Pydantic validates model-created analysis fields before the UI displays them.

RAG reduces unsupported answers but cannot guarantee correctness. PDF extraction, retrieval thresholds, and model generation can all fail; citations let the reader inspect evidence.
