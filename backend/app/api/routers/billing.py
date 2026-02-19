from fastapi import APIRouter, Depends
from app.core.auth import get_current_user
from app.services.billing_service import get_plan_status

router = APIRouter()

@router.get("/status")
def status(user=Depends(get_current_user)):
    return get_plan_status(user_id=user["id"])

