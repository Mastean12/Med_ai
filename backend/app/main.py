import re
import logging
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.api.routers import flashcards

from app.api.routers import documents, student, public, billing, test, auth, tutor, notes, exam, adaptive, research, settings
from app.core.config import ENV, CORS_ORIGINS

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%S",
)

app = FastAPI(
    title="Noctual AI Backend",
    docs_url="/docs" if ENV != "production" else None,
    redoc_url=None,
)

# Expand wildcard origins (*.vercel.app) into a regex pattern
cors_list = [o.strip() for o in CORS_ORIGINS.split(",")]
cors_regex_patterns = []
static_origins = []
for origin in cors_list:
    if "*." in origin:
        escaped = re.escape(origin).replace(r"\*\.", r"[a-zA-Z0-9\-]+.")
        cors_regex_patterns.append(escaped)
    else:
        static_origins.append(origin)

cors_regex = "|".join(cors_regex_patterns) if cors_regex_patterns else None

app.add_middleware(
    CORSMiddleware,
    allow_origins=static_origins,
    allow_origin_regex=cors_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger = logging.getLogger("noctual.error")
    logger.error("Unhandled error: %s", str(exc), exc_info=True)
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})


app.include_router(documents.router, prefix="/documents", tags=["Documents"])
app.include_router(student.router, prefix="/student", tags=["Student"])
app.include_router(public.router, prefix="/public", tags=["Public"])
app.include_router(billing.router, prefix="/billing", tags=["Billing"])
app.include_router(test.router, prefix="/test", tags=["Test"])
app.include_router(flashcards.router)
app.include_router(auth.router)
app.include_router(tutor.router)
app.include_router(notes.router)
app.include_router(exam.router)
app.include_router(adaptive.router)
app.include_router(research.router)
app.include_router(settings.router)


@app.get("/")
def read_root():
    return {"status": "ok", "message": "Noctual AI backend running"}


@app.get("/health")
def health():
    return {"status": "ok"}