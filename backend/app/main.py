from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routers import flashcards

from app.api.routers import documents, student, public, billing, test

app = FastAPI(title="Noctual AI Backend")


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(documents.router, prefix="/documents", tags=["Documents"])
app.include_router(student.router, prefix="/student", tags=["Student"])
app.include_router(public.router, prefix="/public", tags=["Public"])
app.include_router(billing.router, prefix="/billing", tags=["Billing"])
app.include_router(test.router, prefix="/test", tags=["Test"])
app.include_router(flashcards.router)


@app.get("/")
def read_root():
    return {"status": "ok", "message": "Noctual AI backend running"}


@app.get("/health")
def health():
    return {"status": "ok"}