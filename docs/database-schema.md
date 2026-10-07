# Database schema

SQLite contains `users`, `papers`, `chats`, `messages`, and `analyses`. Papers are unique per owner by SHA-256 to detect duplicate uploads. Chat and paper records carry `owner_id`; messages belong to chats. Deleting an account cascades application metadata. The vector store is separate and contains no SQLite foreign keys or embeddings.

Chroma chunk metadata includes paper ID, owner ID, original safe filename, page number, section (empty when unavailable), and chunk index. The actual PDF is stored at a generated path under `data/uploads/<user-id>/`.
