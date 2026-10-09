from datetime import datetime, date
from typing import List, Optional, Union
import json
from pydantic import BaseModel, Field, ConfigDict, field_validator


# ----------------------------------------------------
# Base / Shared Schemas
# ----------------------------------------------------

class ParticipantBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    email: Optional[str] = Field(None, max_length=255)


class ParticipantCreate(ParticipantBase):
    pass


class ParticipantResponse(ParticipantBase):
    id: int
    model_config = ConfigDict(from_attributes=True)


class TagBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)


class TagCreate(TagBase):
    pass


class TagResponse(TagBase):
    id: int
    model_config = ConfigDict(from_attributes=True)


# ----------------------------------------------------
# Transcript Segment Schemas
# ----------------------------------------------------

class TranscriptSegmentResponse(BaseModel):
    id: int
    meeting_id: int
    speaker_id: Optional[int] = None
    speaker_label: str
    start_sec: float
    end_sec: float
    text: str
    position: int
    speaker: Optional[ParticipantResponse] = None

    model_config = ConfigDict(from_attributes=True)


# ----------------------------------------------------
# Chapter Schemas
# ----------------------------------------------------

class ChapterBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    start_sec: float
    position: int


class ChapterResponse(ChapterBase):
    id: int
    meeting_id: int
    model_config = ConfigDict(from_attributes=True)


# ----------------------------------------------------
# Action Item Schemas
# ----------------------------------------------------

class ActionItemCreate(BaseModel):
    text: str = Field(..., min_length=1)
    assignee_id: Optional[int] = None
    due_date: Optional[date] = None


class ActionItemUpdate(BaseModel):
    text: Optional[str] = None
    assignee_id: Optional[int] = None
    due_date: Optional[date] = None
    is_completed: Optional[bool] = None


class ActionItemResponse(BaseModel):
    id: int
    meeting_id: int
    assignee_id: Optional[int] = None
    text: str
    due_date: Optional[date] = None
    is_completed: bool
    created_at: datetime
    assignee: Optional[ParticipantResponse] = None

    model_config = ConfigDict(from_attributes=True)


# ----------------------------------------------------
# Summary Schemas
# ----------------------------------------------------

class SummaryResponse(BaseModel):
    id: int
    meeting_id: int
    overview: Optional[str] = None
    keywords: List[str] = []
    generated_at: datetime
    chapters: List[ChapterResponse] = []

    model_config = ConfigDict(from_attributes=True)

    @classmethod
    def from_orm_with_keywords(cls, summary_obj, chapters=None):
        if not summary_obj:
            return None
        kw_list = []
        if summary_obj.keywords_json:
            try:
                kw_list = json.loads(summary_obj.keywords_json)
            except Exception:
                kw_list = []
        return cls(
            id=summary_obj.id,
            meeting_id=summary_obj.meeting_id,
            overview=summary_obj.overview,
            keywords=kw_list,
            generated_at=summary_obj.generated_at,
            chapters=[ChapterResponse.model_validate(c) for c in (chapters or [])]
        )


# ----------------------------------------------------
# Meeting Schemas
# ----------------------------------------------------

class ParticipantInputItem(BaseModel):
    id: Optional[int] = None
    name: Optional[str] = None
    email: Optional[str] = None


class MeetingCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    date: Optional[datetime] = None
    participants: Optional[List[Union[int, ParticipantInputItem, ParticipantCreate]]] = None
    transcript_text: Optional[str] = None
    tag_ids: Optional[List[int]] = None


class MeetingUpdate(BaseModel):
    title: Optional[str] = None
    date: Optional[datetime] = None
    participants: Optional[List[Union[int, ParticipantInputItem, ParticipantCreate]]] = None
    tag_ids: Optional[List[int]] = None


class MeetingListItemResponse(BaseModel):
    id: int
    title: str
    date: datetime
    duration_sec: int
    source: str
    created_at: datetime
    updated_at: datetime
    participants: List[ParticipantResponse] = []
    tags: List[TagResponse] = []
    action_items_count: int = 0
    has_transcript: bool = False

    model_config = ConfigDict(from_attributes=True)


class MeetingDetailResponse(BaseModel):
    id: int
    title: str
    date: datetime
    duration_sec: int
    audio_url: Optional[str] = None
    source: str
    created_at: datetime
    updated_at: datetime
    participants: List[ParticipantResponse] = []
    tags: List[TagResponse] = []
    summary: Optional[SummaryResponse] = None
    chapters: List[ChapterResponse] = []
    action_items: List[ActionItemResponse] = []

    model_config = ConfigDict(from_attributes=True)


class MeetingListPaginationResponse(BaseModel):
    items: List[MeetingListItemResponse]
    total: int
    page: int
    page_size: int


# ----------------------------------------------------
# Comment Schemas (Bonus)
# ----------------------------------------------------

class CommentCreate(BaseModel):
    segment_id: int
    body: str = Field(..., min_length=1)
    kind: Optional[str] = "comment"


class CommentResponse(BaseModel):
    id: int
    meeting_id: int
    segment_id: int
    body: str
    kind: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ----------------------------------------------------
# Health Check Schema
# ----------------------------------------------------

class HealthResponse(BaseModel):
    status: str
    database: str
    timestamp: datetime
