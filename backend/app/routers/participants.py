from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.app.core.database import get_db
from backend.app.schemas.schemas import ParticipantResponse
from backend.app.services.meeting_service import get_all_participants

router = APIRouter(prefix="/participants", tags=["participants"])


@router.get("", response_model=List[ParticipantResponse])
def list_participants(db: Session = Depends(get_db)):
    participants = get_all_participants(db)
    return [ParticipantResponse.model_validate(p) for p in participants]
