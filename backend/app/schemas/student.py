from pydantic import BaseModel

class StudentChatIn(BaseModel):
    document_id: str
    question: str

class StudentChatOut(BaseModel):
    answer: str
    citations: list[str] = []
