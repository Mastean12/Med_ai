from fastapi import FastAPI
from app.api.routers import documents, student, public, billing, test


app = FastAPI(title="Noctual AI Backend")

app.include_router(documents.router, prefix="/documents", tags=["Documents"])
app.include_router(student.router, prefix="/student", tags=["Student"])
app.include_router(public.router, prefix="/public", tags=["Public"])
app.include_router(billing.router, prefix="/billing", tags=["Billing"])
app.include_router(test.router, prefix="/test", tags=["Test"])


@app.get("/")
def read_root():
    return {"status": "ok", "message": "Noctual AI backend running"}


@app.get("/health")
def health():
    return {"status": "ok"}
