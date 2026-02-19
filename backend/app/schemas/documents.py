from pydantic import BaseModel

class DocumentStatusOut(BaseModel):
    document_id: str
    status: str
