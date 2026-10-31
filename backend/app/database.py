"""
Database engine, session factory and declarative Base.

Every model in the project inherits from `Base`. Every router gets its
DB session through the `get_db` dependency.

Money columns elsewhere must be NUMERIC(12,2), never float.
"""
import os
from datetime import datetime, timezone
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

from sqlalchemy import create_engine, text
from sqlalchemy.orm import DeclarativeBase, sessionmaker

# Canonical database path: subs-hub/brightloop.db
BASE_PROJECT_DIR = Path(__file__).resolve().parent.parent.parent
CANONICAL_DB_FILE = BASE_PROJECT_DIR / "brightloop.db"

raw_url = os.getenv("DATABASE_URL")
if not raw_url or raw_url == "sqlite:///./brightloop.db":
    DATABASE_URL = f"sqlite:///{CANONICAL_DB_FILE.as_posix()}"
else:
    DATABASE_URL = raw_url

# SQLite needs this flag because FastAPI serves requests from several threads.
_connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(DATABASE_URL, connect_args=_connect_args, pool_pre_ping=True)

# expire_on_commit=False keeps objects readable after commit(), which saves
# an extra SELECT per request when we return the object we just saved.
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


class Base(DeclarativeBase):
    """Parent class of every SQLAlchemy model."""


def utcnow() -> datetime:
    """
    Current time in UTC as a *naive* datetime.

    We store naive-UTC everywhere so the same code behaves identically on
    SQLite (which drops tzinfo) and PostgreSQL. Never mix this with
    timezone-aware datetimes in comparisons.
    """
    return datetime.now(timezone.utc).replace(tzinfo=None)


def migrate_sqlite_columns() -> None:
    """Ensure newly added columns exist in SQLite customers table without dropping data."""
    if not DATABASE_URL.startswith("sqlite"):
        return

    with engine.connect() as conn:
        try:
            # Check existing columns in customers table
            result = conn.execute(text("PRAGMA table_info(customers);")).fetchall()
            existing_cols = {row[1] for row in result}

            new_columns = [
                ("company_name", "VARCHAR(150)"),
                ("phone", "VARCHAR(50)"),
                ("address", "VARCHAR(255)"),
                ("device_id", "VARCHAR(100)"),
                ("device_name", "VARCHAR(150)"),
                ("last_login", "DATETIME"),
            ]

            for col_name, col_type in new_columns:
                if col_name not in existing_cols:
                    conn.execute(text(f"ALTER TABLE customers ADD COLUMN {col_name} {col_type};"))
                    conn.commit()
        except Exception:
            # Table may not exist yet before create_all
            pass


def get_db():
    """FastAPI dependency: one DB session per request, always closed."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
