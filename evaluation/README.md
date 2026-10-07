# Retrieval evaluation dataset

Add reviewed examples to `questions.json` after uploading the associated documents. Each question needs `query`, `expected_paper_ids` (one or more paper IDs belonging to the signed-in account), and optionally `expected_pages` (page numbers that contain supporting evidence). The evaluation dashboard does not invent labels or report scores for an empty dataset.

Run the dashboard evaluation form or `python evaluation/evaluate.py` from the project root while the backend is running. The CLI asks for the local account credentials without echoing the password and prints the API's measured results. The API retrieves from the full owner-scoped library; it does not filter retrieval to the expected documents. Human review of the answer and excerpt is still required for answer quality and faithfulness.
