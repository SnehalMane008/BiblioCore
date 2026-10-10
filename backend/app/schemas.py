from datetime import datetime
from typing import Literal
from pydantic import BaseModel, ConfigDict, EmailStr, Field


class RegisterRequest(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    email: EmailStr
    password: str = Field(min_length=8, max_length=8)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: str
    name: str
    email: str


class PaperOut(BaseModel):
    id: str
    filename: str
    title: str
    authors: list[str]
    page_count: int
    status: str
    error_message: str = ""
    summary: str = ""
    created_at: datetime


class Source(BaseModel):
    paper_id: str
    filename: str
    page_number: int
    section: str = ""
    chunk_text: str
    similarity_score: float


class ChatRequest(BaseModel):
    question: str = Field(min_length=1, max_length=4000)
    paper_ids: list[str] = []
    chat_id: str | None = None


class ChatOut(BaseModel):
    chat_id: str
    answer: str
    sources: list[Source]
    refused: bool = False


class StructuredAnalysis(BaseModel):
    title: str = ""
    authors: list[str] = []
    research_problem: str = ""
    objective: str = ""
    methodology: str = ""
    datasets: list[str] = []
    models: list[str] = []
    evaluation_metrics: list[str] = []
    results: str = ""
    limitations: list[str] = []
    future_work: list[str] = []
    key_findings: list[str] = []


class ComparisonRow(BaseModel):
    paper: str = Field(min_length=1)
    research_problem: str = "Not identified in the retrieved excerpts."
    methods: str = "Not identified in the retrieved excerpts."
    data: str = "Not identified in the retrieved excerpts."
    results: str = "Not identified in the retrieved excerpts."
    limitations: str = "Not identified in the retrieved excerpts."
    future_work: str = "Not identified in the retrieved excerpts."


class ComparisonResult(BaseModel):
    rows: list[ComparisonRow] = Field(min_length=1)
    overall_synthesis: str = ""


class ResearchGapRow(BaseModel):
    paper: str = Field(min_length=1)
    research_problem: str = "Not identified in the retrieved excerpts."
    methods: str = "Not identified in the retrieved excerpts."
    data: str = "Not identified in the retrieved excerpts."
    results: str = "Not identified in the retrieved excerpts."
    limitations: str = "Not identified in the retrieved excerpts."
    future_work: str = "Not identified in the retrieved excerpts."
    potential_research_gap: str = "No specific gap is supported by the retrieved excerpts."
    evidence_and_rationale: str = ""
    suggested_validation: str = ""
    confidence: Literal["Low", "Medium", "High"] = "Low"


class ResearchGapResult(BaseModel):
    rows: list[ResearchGapRow] = Field(min_length=1)
    overall_synthesis: str = ""


class CompareRequest(BaseModel):
    paper_ids: list[str] = Field(min_length=2, max_length=5)
    focus: str = "Compare the research problem, methods, data, results, limitations, and future work."


class GenerationRequest(BaseModel):
    paper_ids: list[str] = Field(min_length=1, max_length=10)
    topic: str = Field(min_length=2, max_length=1000)


class SearchRequest(BaseModel):
    query: str = Field(min_length=1, max_length=2000)
    paper_ids: list[str] = []
    top_k: int | None = Field(default=None, ge=1, le=20)


class EvaluationCase(BaseModel):
    query: str = Field(min_length=1, max_length=2000)
    expected_paper_ids: list[str] = Field(min_length=1)
    expected_pages: list[int] = []


class EvaluationRequest(BaseModel):
    cases: list[EvaluationCase] = Field(min_length=1, max_length=200)
    top_k: int = Field(default=5, ge=1, le=20)
