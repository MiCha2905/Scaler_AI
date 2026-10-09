import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, HTTPException, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv

# Load env variables
load_dotenv()
load_dotenv(dotenv_path="../.env")

from backend.app.core.database import engine, Base, SessionLocal
from backend.app.models.models import *
from backend.app.seed.seed_data import seed_database
from backend.app.routers import meetings, action_items, participants, tags, health, bonus


from pathlib import Path

STATIC_DIR = Path(__file__).resolve().parent / "static"
AUDIO_DIR = STATIC_DIR / "audio"
AUDIO_DIR.mkdir(parents=True, exist_ok=True)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure static directories exist
    AUDIO_DIR.mkdir(parents=True, exist_ok=True)
    # Initialize DB tables
    Base.metadata.create_all(bind=engine)
    # Run idempotent seed loader
    db = SessionLocal()
    try:
        seed_database(db)
    finally:
        db.close()
    yield


app = FastAPI(
    title="Fireflies Clone API",
    description="Meeting intelligence platform with synchronized audio playback, AI summaries, and action item tracking.",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# Static files for real audio tracks (robust absolute path)
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

# CORS configuration
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3001",
]

env_cors = os.getenv("CORS_ORIGINS")
if env_cors:
    for origin in env_cors.split(","):
        clean = origin.strip()
        if clean and clean not in origins:
            origins.append(clean)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    if isinstance(exc.detail, dict) and "error" in exc.detail:
        return JSONResponse(status_code=exc.status_code, content=exc.detail)
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": "http_error",
                "message": str(exc.detail),
                "details": []
            }
        }
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error": {
                "code": "validation_error",
                "message": "Invalid request parameters or payload",
                "details": exc.errors()
            }
        }
    )


# Include Routers under /api
app.include_router(meetings.router, prefix="/api")
app.include_router(action_items.router, prefix="/api")
app.include_router(participants.router, prefix="/api")
app.include_router(tags.router, prefix="/api")
app.include_router(health.router, prefix="/api")
app.include_router(bonus.router, prefix="/api")


@app.get("/")
def root():
    return {
        "message": "Fireflies Clone API is running",
        "documentation": "/docs",
        "health": "/api/health"
    }
