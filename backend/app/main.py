"""
Application entry point.  Run from the backend folder:

    uvicorn app.main:app --reload

Interactive API docs appear at http://localhost:8000/docs
"""
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.auth import register_exception_handlers, router as auth_router
from app.auth.seed import seed_from_env
from app.database import Base, engine, migrate_sqlite_columns


@asynccontextmanager
async def lifespan(_app: FastAPI):
    """Startup: create tables (demo shortcut, use Alembic migrations later) and essential seed data."""
    Base.metadata.create_all(engine)
    migrate_sqlite_columns()
    seed_from_env()
    yield


app = FastAPI(title="Brightloop Subscription Management System", lifespan=lifespan)

# Let the Next.js frontend (default http://localhost:3000) call this API from the browser.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("FRONTEND_URL", "http://localhost:3000")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

register_exception_handlers(app)   # one JSON error shape everywhere
app.include_router(auth_router)
# P2 and P3 add their routers here, e.g. app.include_router(products_router)
