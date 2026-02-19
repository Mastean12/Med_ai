from pydantic import BaseModel

class SymptomCheckIn(BaseModel):
    symptoms: str

class SymptomCheckOut(BaseModel):
    message: str
    disclaimer: str
