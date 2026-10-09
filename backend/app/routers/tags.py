from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.core.database import get_db
from backend.app.schemas.schemas import TagCreate, TagResponse
from backend.app.services.meeting_service import get_all_tags, create_tag

router = APIRouter(prefix="/tags", tags=["tags"])


@router.get("", response_model=List[TagResponse])
def list_tags(db: Session = Depends(get_db)):
    tags = get_all_tags(db)
    return [TagResponse.model_validate(t) for t in tags]


@router.post("", response_model=TagResponse, status_code=status.HTTP_201_CREATED)
def create_new_tag(tag_in: TagCreate, db: Session = Depends(get_db)):
    if not tag_in.name or not tag_in.name.strip():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"error": {"code": "validation_error", "message": "Tag name is required", "details": []}}
        )
    tag = create_tag(db, tag_in)
    return TagResponse.model_validate(tag)
