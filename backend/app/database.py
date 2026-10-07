from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.config import settings


class Base(DeclarativeBase):
    pass


database_url = settings.database_url
if database_url.startswith("sqlite:///./"):
    db_file = (Path(__file__).resolve().parents[2] / database_url.removeprefix("sqlite:///./")).resolve()
    db_file.parent.mkdir(parents=True, exist_ok=True)
    database_url = f"sqlite:///{db_file}"
connect_args = {"check_same_thread": False} if database_url.startswith("sqlite") else {}
engine = create_engine(database_url, connect_args=connect_args)
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)
