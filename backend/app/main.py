import json
import logging
import mimetypes
import re
import uuid
from pathlib import Path

from fastapi import BackgroundTasks, Depends, FastAPI, File, HTTPException, Request, Response, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer
from pwdlib import PasswordHash
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.config import settings
from app.database import Base, SessionLocal, engine
from app.models import Analysis, Chat, Message, Paper, User
from app.schemas import (ChatRequest, CompareRequest, GenerationRequest, LoginRequest, PaperOut,
                         RegisterRequest, SearchRequest, UserOut, EvaluationRequest)
from app.services import (context_generation, delete_vectors, extract_pages, grounded_answer,
                          index_paper, normalize_structured_generation, retrieve, sha256_file,
                          structured_paper_analysis)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("research-assistant")
Base.metadata.create_all(bind=engine)
settings.upload_dir.mkdir(parents=True, exist_ok=True)
settings.export_dir.mkdir(parents=True, exist_ok=True)
serializer = URLSafeTimedSerializer(settings.secret_key, salt="research-assistant-session")
password_hash = PasswordHash.recommended()
app = FastAPI(title="BiblioCore", version="1.0.0")
frontend_origins = {settings.frontend_origin.rstrip("/")}
if settings.frontend_origin.startswith("http://localhost:"):
    frontend_origins.add(settings.frontend_origin.replace("localhost", "127.0.0.1").rstrip("/"))
elif settings.frontend_origin.startswith("http://127.0.0.1:"):
    frontend_origins.add(settings.frontend_origin.replace("127.0.0.1", "localhost").rstrip("/"))
app.add_middleware(CORSMiddleware, allow_origins=sorted(frontend_origins), allow_credentials=True,
                   allow_methods=["GET", "POST", "DELETE", "OPTIONS"], allow_headers=["Content-Type"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def current_user(request: Request, db: Session = Depends(get_db)) -> User:
    token = request.cookies.get("research_session")
    if not token:
        raise HTTPException(401, "Please sign in to continue.")
    try:
        user_id = serializer.loads(token, max_age=60 * 60 * 24 * 14)
    except (BadSignature, SignatureExpired):
        raise HTTPException(401, "Your session has expired. Please sign in again.")
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(401, "Please sign in to continue.")
    return user


def paper_out(p: Paper) -> dict:
    return {"id": p.id, "filename": p.filename, "title": p.title or p.filename,
            "authors": json.loads(p.authors or "[]"), "page_count": p.page_count,
            "status": p.status, "error_message": p.error_message, "summary": p.summary,
            "created_at": p.created_at}


def owned_paper(db: Session, user: User, paper_id: str) -> Paper:
    p = db.scalar(select(Paper).where(Paper.id == paper_id, Paper.owner_id == user.id))
    if not p:
        raise HTTPException(404, "Paper not found.")
    return p


def owned_papers(db: Session, user: User, ids: list[str]) -> list[Paper]:
    if not ids or len(set(ids)) != len(ids):
        raise HTTPException(400, "Select one or more unique papers.")
    papers = list(db.scalars(select(Paper).where(Paper.id.in_(ids), Paper.owner_id == user.id, Paper.status == "indexed")))
    if len(papers) != len(ids):
        raise HTTPException(404, "One or more selected papers are unavailable or not indexed.")
    # Keep the user's selection order stable in prompts and paper-per-row tables.
    by_id = {paper.id: paper for paper in papers}
    return [by_id[paper_id] for paper_id in ids]


@app.exception_handler(Exception)
async def safe_error_handler(request: Request, exc: Exception):
    logger.exception("Unhandled API error at %s", request.url.path)
    from fastapi.responses import JSONResponse
    return JSONResponse(status_code=500, content={"detail": "The request could not be completed. Please try again."})


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "research-assistant", "openai_configured": bool(settings.openai_api_key)}


@app.post("/api/auth/register", response_model=UserOut)
def register(payload: RegisterRequest, response: Response, db: Session = Depends(get_db)):
    email = payload.email.lower()
    if db.scalar(select(User).where(User.email == email)):
        raise HTTPException(409, "An account with this email already exists.")
    user = User(email=email, name=payload.name.strip(), password_hash=password_hash.hash(payload.password))
    db.add(user); db.commit(); db.refresh(user)
    response.set_cookie("research_session", serializer.dumps(user.id), httponly=True, secure=settings.cookie_secure,
                        samesite="strict", max_age=60 * 60 * 24 * 14, path="/")
    return user


@app.post("/api/auth/login", response_model=UserOut)
def login(payload: LoginRequest, response: Response, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.email == payload.email.lower()))
    if not user or not password_hash.verify(payload.password, user.password_hash):
        raise HTTPException(401, "Email or password is incorrect.")
    response.set_cookie("research_session", serializer.dumps(user.id), httponly=True, secure=settings.cookie_secure,
                        samesite="strict", max_age=60 * 60 * 24 * 14, path="/")
    return user


@app.post("/api/auth/logout")
def logout(response: Response):
    response.delete_cookie("research_session", path="/", httponly=True, samesite="strict")
    return {"status": "signed_out"}


@app.get("/api/auth/me", response_model=UserOut)
def me(user: User = Depends(current_user)):
    return user


@app.post("/api/papers/upload")
async def upload_papers(background_tasks: BackgroundTasks, files: list[UploadFile] = File(...), user: User = Depends(current_user), db: Session = Depends(get_db)):
    if not files or len(files) > 10:
        raise HTTPException(400, "Upload between 1 and 10 PDFs at a time.")
    results = []
    for upload in files:
        raw_name = Path(upload.filename or "paper.pdf").name
        safe_name = re.sub(r"[^A-Za-z0-9._ -]", "_", raw_name)[:180]
        if not safe_name.lower().endswith(".pdf"):
            raise HTTPException(415, f"{safe_name} is not a PDF.")
        content = await upload.read(settings.max_upload_mb * 1024 * 1024 + 1)
        if len(content) > settings.max_upload_mb * 1024 * 1024:
            raise HTTPException(413, f"{safe_name} exceeds the {settings.max_upload_mb} MB upload limit.")
        if not content.startswith(b"%PDF-"):
            raise HTTPException(415, f"{safe_name} is not a valid PDF file.")
        digest = __import__("hashlib").sha256(content).hexdigest()
        prior = db.scalar(select(Paper).where(Paper.owner_id == user.id, Paper.sha256 == digest))
        if prior:
            results.append({**paper_out(prior), "duplicate": True}); continue
        path = settings.upload_dir / user.id
        path.mkdir(parents=True, exist_ok=True)
        dest = path / f"{uuid.uuid4()}_{safe_name}"
        dest.write_bytes(content)
        paper = Paper(owner_id=user.id, filename=safe_name, file_path=str(dest), sha256=digest, status="processing")
        db.add(paper); db.commit(); db.refresh(paper)
        background_tasks.add_task(process_paper, paper.id)
        results.append({**paper_out(paper), "duplicate": False})
    return {"papers": results}


def process_paper(paper_id: str) -> None:
    db = SessionLocal()
    try:
        paper = db.get(Paper, paper_id)
        if not paper:
            return
        paper.status = "extracting"; db.commit()
        pages = extract_pages(paper.file_path)
        paper.page_count = len(pages)
        first_text = next((p["text"] for p in pages if p["text"]), "")
        title = next((line.strip() for line in first_text.splitlines() if len(line.strip()) > 8), paper.filename)
        paper.title = title[:500]
        def update_stage(stage: str) -> None:
            paper.status = stage; db.commit()
        count = index_paper(paper, pages, update_stage)
        paper.status = "indexed"; paper.error_message = ""; db.commit()
        logger.info("Indexed paper %s with %s chunks", paper.id, count)
    except Exception as exc:
        logger.exception("Could not process uploaded paper %s", paper_id)
        paper = db.get(Paper, paper_id)
        if paper:
            paper.status = "failed"
            paper.error_message = str(exc) if isinstance(exc, ValueError) else "Indexing failed. Check the backend log and retry."
            db.commit()
    finally:
        db.close()


@app.get("/api/papers")
def list_papers(user: User = Depends(current_user), db: Session = Depends(get_db)):
    return [paper_out(p) for p in db.scalars(select(Paper).where(Paper.owner_id == user.id).order_by(Paper.created_at.desc()))]


@app.get("/api/papers/{paper_id}")
def get_paper(paper_id: str, user: User = Depends(current_user), db: Session = Depends(get_db)):
    p = owned_paper(db, user, paper_id)
    return {**paper_out(p), "analysis": json.loads(p.analysis_json or "{}")}


@app.get("/api/papers/{paper_id}/file")
def get_paper_file(paper_id: str, user: User = Depends(current_user), db: Session = Depends(get_db)):
    p = owned_paper(db, user, paper_id)
    return FileResponse(p.file_path, media_type="application/pdf", filename=p.filename)


@app.delete("/api/papers/{paper_id}")
def remove_paper(paper_id: str, user: User = Depends(current_user), db: Session = Depends(get_db)):
    paper = owned_paper(db, user, paper_id)
    delete_vectors(paper.id)
    Path(paper.file_path).unlink(missing_ok=True)
    db.execute(delete(Analysis).where(Analysis.paper_id == paper.id, Analysis.owner_id == user.id))
    db.delete(paper); db.commit()
    return {"deleted": True}


@app.post("/api/papers/{paper_id}/reindex")
def reindex_paper(paper_id: str, user: User = Depends(current_user), db: Session = Depends(get_db)):
    paper = owned_paper(db, user, paper_id)
    try:
        pages = extract_pages(paper.file_path)
        paper.page_count = len(pages)
        count = index_paper(paper, pages)
        paper.status = "indexed"; paper.error_message = ""; db.commit()
        return {**paper_out(paper), "chunks_indexed": count}
    except Exception as exc:
        logger.exception("Reindex failed for %s", paper.id)
        raise HTTPException(500, str(exc) if isinstance(exc, ValueError) else "Re-indexing failed.")


@app.post("/api/papers/{paper_id}/analyze")
def analyze_paper(paper_id: str, user: User = Depends(current_user), db: Session = Depends(get_db)):
    paper = owned_paper(db, user, paper_id)
    if paper.status != "indexed": raise HTTPException(409, "Paper must be indexed first.")
    chunks = retrieve("title authors research problem objective methodology datasets models results limitations future work key findings", user.id, [paper.id], top_k=12)
    try:
        result = structured_paper_analysis(paper, chunks)
    except (RuntimeError, ValueError) as exc:
        raise HTTPException(503, str(exc))
    paper.analysis_json = json.dumps(result)
    db.add(Analysis(owner_id=user.id, paper_id=paper.id, kind="analysis", result_json=paper.analysis_json))
    db.commit()
    return result


@app.post("/api/papers/{paper_id}/summarize")
def summarize_paper(paper_id: str, user: User = Depends(current_user), db: Session = Depends(get_db)):
    paper = owned_paper(db, user, paper_id)
    chunks = retrieve("paper overview abstract research objective method main results and conclusion", user.id, [paper.id], top_k=8)
    answer, sources, refused = _answer_with_sources("Summarize the paper's problem, objective, method, findings, and limitations.", chunks)
    if not refused:
        paper.summary = answer; db.commit()
    return {"summary": answer, "sources": sources}


def _answer_with_sources(question: str, chunks: list[dict], history: list[dict] | None = None):
    try:
        answer, refused = grounded_answer(question, chunks, history)
    except RuntimeError as exc:
        raise HTTPException(503, str(exc))
    relevant = [c for c in chunks if c["similarity_score"] >= settings.similarity_threshold]
    return answer, relevant, refused


@app.post("/api/chat")
def chat(payload: ChatRequest, user: User = Depends(current_user), db: Session = Depends(get_db)):
    papers = owned_papers(db, user, payload.paper_ids) if payload.paper_ids else list(db.scalars(select(Paper).where(Paper.owner_id == user.id, Paper.status == "indexed")))
    if not papers: raise HTTPException(400, "Upload and index at least one paper first.")
    if payload.chat_id:
        convo = db.scalar(select(Chat).where(Chat.id == payload.chat_id, Chat.owner_id == user.id))
        if not convo: raise HTTPException(404, "Conversation not found.")
    else:
        convo = Chat(owner_id=user.id, title=payload.question[:80], paper_ids=json.dumps([p.id for p in papers]))
        db.add(convo); db.commit(); db.refresh(convo)
    # Carry prior questions for resolving short follow-ups, but exclude earlier
    # model answers so they cannot become unsupported context.
    history = [{"role": "user", "content": m.content} for m in convo.messages if m.role == "user"][-3:]
    prior_question = next((m["content"] for m in reversed(history) if m["role"] == "user"), "")
    retrieval_query = f"{prior_question}\n{payload.question}" if prior_question else payload.question
    chunks = retrieve(retrieval_query, user.id, [p.id for p in papers])
    answer, sources, refused = _answer_with_sources(payload.question, chunks, history)
    db.add_all([Message(chat_id=convo.id, role="user", content=payload.question),
                Message(chat_id=convo.id, role="assistant", content=answer, sources_json=json.dumps(sources))])
    db.commit()
    return {"chat_id": convo.id, "answer": answer, "sources": sources, "refused": refused}


@app.get("/api/chats")
def list_chats(user: User = Depends(current_user), db: Session = Depends(get_db)):
    chats = db.scalars(select(Chat).where(Chat.owner_id == user.id).order_by(Chat.created_at.desc()))
    return [{"id": c.id, "title": c.title, "created_at": c.created_at} for c in chats]


@app.get("/api/chats/{chat_id}")
def get_chat(chat_id: str, user: User = Depends(current_user), db: Session = Depends(get_db)):
    convo = db.scalar(select(Chat).where(Chat.id == chat_id, Chat.owner_id == user.id))
    if not convo: raise HTTPException(404, "Conversation not found.")
    return {"id": convo.id, "title": convo.title, "paper_ids": json.loads(convo.paper_ids),
            "messages": [{"id": m.id, "role": m.role, "content": m.content, "sources": json.loads(m.sources_json)} for m in convo.messages]}


@app.delete("/api/chats/{chat_id}")
def delete_chat(chat_id: str, user: User = Depends(current_user), db: Session = Depends(get_db)):
    convo = db.scalar(select(Chat).where(Chat.id == chat_id, Chat.owner_id == user.id))
    if not convo: raise HTTPException(404, "Conversation not found.")
    db.delete(convo); db.commit(); return {"deleted": True}


@app.post("/api/search")
def search(payload: SearchRequest, user: User = Depends(current_user), db: Session = Depends(get_db)):
    if payload.paper_ids: owned_papers(db, user, payload.paper_ids)
    try: return {"results": retrieve(payload.query, user.id, payload.paper_ids, payload.top_k)}
    except Exception as exc:
        logger.exception("Search error"); raise HTTPException(503, "Semantic search is temporarily unavailable.") from exc


@app.post("/api/compare")
def compare(payload: CompareRequest, user: User = Depends(current_user), db: Session = Depends(get_db)):
    papers = owned_papers(db, user, payload.paper_ids)
    paper_names = [p.filename for p in papers]
    task = (f"Compare these selected papers: {json.dumps(paper_names)}. Use the user's focus: {payload.focus}. "
            "Return ONLY valid JSON in this exact format: "
            '{"rows":[{"paper":"exact filename from the selected papers",'
            '"research_problem":"...","methods":"...","data":"...","results":"...",'
            '"limitations":"...","future_work":"..."}],'
            '"overall_synthesis":"Brief synthesis across the selected studies."}. '
            "Return exactly one row for EVERY selected filename, in the same order as listed. The table has one paper per row "
            "and these six comparison columns: research_problem, methods, data, results, limitations, future_work. Each cell "
            "must describe that paper only, in 1–3 concise sentences. Never combine two papers in one row. If the retrieved "
            "excerpts do not identify a detail for a paper, write exactly 'Not identified in the retrieved excerpts.' in that "
            "cell. Use only the supplied passages. Do not add markdown, code fences, extra keys, prose outside JSON, invented "
            "facts, or citations.")
    try:
        answer, sources = context_generation(task, [p.__dict__ for p in papers], payload.focus, json_mode=True)
        structured = normalize_structured_generation(answer, "comparison", paper_names)
    except RuntimeError as exc: raise HTTPException(503, str(exc))
    return {"comparison": structured, "sources": sources}


@app.post("/api/literature-review")
def literature_review(payload: GenerationRequest, user: User = Depends(current_user), db: Session = Depends(get_db)):
    papers = owned_papers(db, user, payload.paper_ids)
    task = ("Draft a readable academic literature review focused specifically on the user's topic. Organize it with these headings: "
            "Scope and themes, Cross-study synthesis, Methods and evidence, Limitations and open questions, Conclusion. "
            "Synthesize and compare the selected studies rather than writing one isolated summary per paper. Cite every substantive "
            "claim inline as [exact filename, p. N], using only the filename and page markers attached to the supplied excerpts. "
            "Do not invent citations, paper details, or claims of comprehensive coverage. If evidence is sparse or conflicting, say so. "
            "Return polished plain text with headings and paragraphs, no JSON or table.")
    try:
        answer, sources = context_generation(task, [p.__dict__ for p in papers], payload.topic)
    except RuntimeError as exc:
        raise HTTPException(503, str(exc))
    if not answer.strip() or not sources:
        raise HTTPException(422, "No relevant evidence was retrieved. Try a more specific topic or select different indexed papers.")
    return {"literature_review": answer, "sources": sources}


@app.post("/api/research-gaps")
def research_gaps(payload: GenerationRequest, user: User = Depends(current_user), db: Session = Depends(get_db)):
    papers = owned_papers(db, user, payload.paper_ids)
    paper_names = [p.filename for p in papers]
    task = (f"Analyze possible research gaps for topic {payload.topic!r} across these selected papers: {json.dumps(paper_names)}. "
            "Return ONLY valid JSON in this exact format: "
            '{"rows":[{"paper":"exact filename from the selected papers",'
            '"research_problem":"...","methods":"...","data":"...","results":"...",'
            '"limitations":"...","future_work":"...",'
            '"potential_research_gap":"...","evidence_and_rationale":"...",'
            '"suggested_validation":"..."}],"overall_synthesis":"..."}. '
            "Return exactly one row for EVERY selected filename, in the same order. The first six analysis fields must summarize "
            "that paper's evidence, using only its retrieved excerpts. The potential_research_gap must be a cautious, specific "
            "hypothesis about what is missing or could be investigated next; it is not a claim of novelty. In evidence_and_rationale, "
            "explain which findings, limitations, or unaddressed questions support that hypothesis. In suggested_validation, propose "
            "one practical next research or literature-review step. If any paper lacks enough retrieved evidence, keep its row and "
            "state 'Not identified in the retrieved excerpts.' Do not combine papers into one row, do not invent a gap or citations, "
            "and do not add markdown, code fences, extra keys, or prose outside the JSON.")
    try:
        answer, sources = context_generation(task, [p.__dict__ for p in papers], payload.topic, json_mode=True)
        structured = normalize_structured_generation(answer, "research_gaps", paper_names)
    except RuntimeError as exc: raise HTTPException(503, str(exc))
    return {"research_gaps": structured, "sources": sources}


@app.get("/api/dashboard")
def dashboard(user: User = Depends(current_user), db: Session = Depends(get_db)):
    papers = list(db.scalars(select(Paper).where(Paper.owner_id == user.id).order_by(Paper.created_at.desc())))
    chats = list(db.scalars(select(Chat).where(Chat.owner_id == user.id).order_by(Chat.created_at.desc()).limit(5)))
    return {"total_papers": len(papers), "indexed_papers": sum(p.status == "indexed" for p in papers),
            "processing_papers": sum(p.status == "processing" for p in papers), "recent_papers": [paper_out(p) for p in papers[:5]],
            "recent_chats": [{"id": c.id, "title": c.title} for c in chats]}


@app.get("/api/papers/{paper_id}/export")
def export_paper(paper_id: str, user: User = Depends(current_user), db: Session = Depends(get_db)):
    p = owned_paper(db, user, paper_id)
    body = f"# {p.title or p.filename}\n\n**File:** {p.filename}\n\n**Pages:** {p.page_count}\n\n## Summary\n\n{p.summary or 'No summary generated yet.'}\n\n## Structured analysis\n\n```json\n{json.dumps(json.loads(p.analysis_json or '{}'), indent=2)}\n```\n"
    dest = settings.export_dir / f"{p.id}.md"; dest.write_text(body, encoding="utf-8")
    return FileResponse(dest, media_type="text/markdown", filename=f"{Path(p.filename).stem}-research-notes.md")


@app.get("/api/evaluation/status")
def evaluation_status(user: User = Depends(current_user), db: Session = Depends(get_db)):
    return {"available": True, "message": "Submit reviewed questions with expected paper IDs and optional pages to calculate retrieval metrics."}


@app.post("/api/evaluation/run")
def run_evaluation(payload: EvaluationRequest, user: User = Depends(current_user), db: Session = Depends(get_db)):
    case_results = []
    for case in payload.cases:
        expected = owned_papers(db, user, case.expected_paper_ids)
        # Retrieve from the full owner-scoped library; filtering to expected IDs
        # would make every paper-level hit metric trivially optimistic.
        hits = retrieve(case.query, user.id, None, payload.top_k)
        rank = next((i + 1 for i, h in enumerate(hits) if h["paper_id"] in case.expected_paper_ids), None)
        page_hit = any(h["paper_id"] in case.expected_paper_ids and h["page_number"] in case.expected_pages for h in hits) if case.expected_pages else None
        case_results.append({"query": case.query, "hit_at_k": rank is not None,
                             "reciprocal_rank": (1 / rank) if rank else 0.0,
                             "expected_page_hit": page_hit, "retrieved": hits})
    page_cases = [c["expected_page_hit"] for c in case_results if c["expected_page_hit"] is not None]
    n = len(case_results)
    return {"count": n, "top_k": payload.top_k,
            "hit_at_k": sum(c["hit_at_k"] for c in case_results) / n,
            "mrr": sum(c["reciprocal_rank"] for c in case_results) / n,
            "page_hit_rate": sum(page_cases) / len(page_cases) if page_cases else None,
            "cases": case_results}
