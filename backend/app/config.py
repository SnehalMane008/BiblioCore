from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    openai_api_key: str = ""
    openai_model: str = "gpt-6-luna"
    secret_key: str = "development-only-change-me"
    cookie_secure: bool = False
    database_url: str = "sqlite:///./data/research_assistant.db"
    chroma_persist_directory: str = "./chroma_db"
    next_public_api_url: str = "http://localhost:8000"
    frontend_origin: str = "http://localhost:3000"
    chunk_size: int = Field(default=1000, gt=0)
    chunk_overlap: int = Field(default=150, ge=0)
    top_k: int = Field(default=3, ge=1, le=50)
    similarity_threshold: float = Field(default=0.25, ge=0, le=1)
    max_upload_mb: int = Field(default=50, gt=0, le=500)
    llm_temperature: float = Field(default=0.2, ge=0, le=2)
    embedding_model: str = "sentence-transformers/all-MiniLM-L6-v2"
    model_config = SettingsConfigDict(
        env_file=str(Path(__file__).resolve().parents[1] / ".env"),
        extra="ignore",
        case_sensitive=False,
    )

    @property
    def upload_dir(self) -> Path:
        return (Path(__file__).resolve().parents[2] / "data/uploads").resolve()

    @property
    def export_dir(self) -> Path:
        return (Path(__file__).resolve().parents[2] / "data/exports").resolve()

    @property
    def chroma_dir(self) -> Path:
        path = Path(self.chroma_persist_directory)
        if not path.is_absolute():
            path = Path(__file__).resolve().parents[2] / path
        return path.resolve()


@lru_cache
def get_settings() -> Settings:
    settings = Settings()
    if settings.chunk_overlap >= settings.chunk_size:
        raise ValueError("CHUNK_OVERLAP must be smaller than CHUNK_SIZE")
    return settings


settings = get_settings()
