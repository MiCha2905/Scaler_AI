from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.core.database import get_db
from backend.app.schemas.schemas import ActionItemCreate, ActionItemUpdate, ActionItemResponse
from backend.app.services.meeting_service import (
    get_action_items,
    create_action_item,
    update_action_item,
    delete_action_item,
    get_meeting,
)

router = APIRouter(tags=["action-items"])


@router.get("/meetings/{meeting_id}/action-items", response_model=List[ActionItemResponse])
def list_meeting_action_items(meeting_id: int, db: Session = Depends(get_db)):
    meeting = get_meeting(db, meeting_id)
    if not meeting:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "not_found", "message": f"Meeting with ID {meeting_id} not found", "details": []}}
        )
    items = get_action_items(db, meeting_id)
    return [ActionItemResponse.model_validate(item) for item in items]


@router.post("/meetings/{meeting_id}/action-items", response_model=ActionItemResponse, status_code=status.HTTP_201_CREATED)
def add_meeting_action_item(meeting_id: int, item_in: ActionItemCreate, db: Session = Depends(get_db)):
    meeting = get_meeting(db, meeting_id)
    if not meeting:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "not_found", "message": f"Meeting with ID {meeting_id} not found", "details": []}}
        )

    # Validate assignee is part of meeting participants if provided
    if item_in.assignee_id:
        participant_ids = {p.id for p in meeting.participants}
        if item_in.assignee_id not in participant_ids:
            # Check if participant exists at all
            from backend.app.models.models import Participant
            p = db.query(Participant).filter(Participant.id == item_in.assignee_id).first()
            if not p:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail={"error": {"code": "invalid_assignee", "message": f"Participant with ID {item_in.assignee_id} does not exist", "details": []}}
                )
            # Auto-link participant to meeting if not already linked
            meeting.participants.append(p)
            db.flush()

    item = create_action_item(db, meeting_id, item_in)
    return ActionItemResponse.model_validate(item)


@router.patch("/action-items/{id}", response_model=ActionItemResponse)
def update_action_item_endpoint(id: int, item_in: ActionItemUpdate, db: Session = Depends(get_db)):
    item = update_action_item(db, id, item_in)
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "not_found", "message": f"Action item with ID {id} not found", "details": []}}
        )
    return ActionItemResponse.model_validate(item)


@router.delete("/action-items/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_action_item_endpoint(id: int, db: Session = Depends(get_db)):
    success = delete_action_item(db, id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "not_found", "message": f"Action item with ID {id} not found", "details": []}}
        )
    return None
