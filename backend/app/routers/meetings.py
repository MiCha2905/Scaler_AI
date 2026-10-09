from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form, status, Request
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from backend.app.core.database import get_db
from backend.app.schemas.schemas import (
    MeetingCreate,
    MeetingUpdate,
    MeetingListItemResponse,
    MeetingDetailResponse,
    MeetingListPaginationResponse,
    TranscriptSegmentResponse,
    SummaryResponse,
    ChapterResponse,
    ActionItemResponse,
    ParticipantResponse,
    TagResponse,
)
from backend.app.services.meeting_service import (
    get_meetings,
    get_meeting,
    create_meeting,
    create_meeting_from_upload,
    update_meeting,
    delete_meeting,
    regenerate_meeting_summary,
    set_meeting_tags,
)
from backend.app.services.parser_service import ParseError
from backend.app.services.voice_service import generate_meeting_audio_track

router = APIRouter(prefix="/meetings", tags=["meetings"])


def format_meeting_list_item(m) -> MeetingListItemResponse:
    return MeetingListItemResponse(
        id=m.id,
        title=m.title,
        date=m.date,
        duration_sec=m.duration_sec,
        source=m.source,
        created_at=m.created_at,
        updated_at=m.updated_at,
        participants=[ParticipantResponse.model_validate(p) for p in (m.participants or [])],
        tags=[TagResponse.model_validate(t) for t in (m.tags or [])],
        action_items_count=len(m.action_items or []),
        has_transcript=len(m.transcript_segments or []) > 0,
    )


def format_meeting_detail(m) -> MeetingDetailResponse:
    summary_resp = SummaryResponse.from_orm_with_keywords(m.summary, m.chapters) if m.summary else None
    return MeetingDetailResponse(
        id=m.id,
        title=m.title,
        date=m.date,
        duration_sec=m.duration_sec,
        audio_url=m.audio_url,
        source=m.source,
        created_at=m.created_at,
        updated_at=m.updated_at,
        participants=[ParticipantResponse.model_validate(p) for p in (m.participants or [])],
        tags=[TagResponse.model_validate(t) for t in (m.tags or [])],
        summary=summary_resp,
        chapters=[ChapterResponse.model_validate(c) for c in (m.chapters or [])],
        action_items=[ActionItemResponse.model_validate(a) for a in (m.action_items or [])],
    )


@router.get("", response_model=MeetingListPaginationResponse)
def list_meetings(
    q: Optional[str] = Query(None, description="Search term across title and transcript"),
    participant_id: Optional[int] = Query(None, description="Filter by participant ID"),
    tag: Optional[str] = Query(None, description="Filter by tag name"),
    date_from: Optional[datetime] = Query(None, description="Filter date >= date_from (UTC)"),
    date_to: Optional[datetime] = Query(None, description="Filter date <= date_to (UTC)"),
    sort: str = Query("date_desc", description="Sorting: date_desc, date_asc, title"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Page size"),
    db: Session = Depends(get_db)
):
    items, total = get_meetings(
        db,
        q=q,
        participant_id=participant_id,
        tag=tag,
        date_from=date_from,
        date_to=date_to,
        sort=sort,
        page=page,
        page_size=page_size
    )
    formatted = [format_meeting_list_item(m) for m in items]
    return MeetingListPaginationResponse(
        items=formatted,
        total=total,
        page=page,
        page_size=page_size
    )


@router.post("", response_model=MeetingDetailResponse, status_code=status.HTTP_201_CREATED)
async def create_new_meeting(meeting_in: MeetingCreate, db: Session = Depends(get_db)):
    if not meeting_in.title or not meeting_in.title.strip():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"error": {"code": "validation_error", "message": "Meeting title is required", "details": []}}
        )
    meeting = await create_meeting(db, meeting_in)
    return format_meeting_detail(meeting)


@router.post("/upload", response_model=MeetingDetailResponse, status_code=status.HTTP_201_CREATED)
async def upload_meeting_transcript(
    file: UploadFile = File(...),
    title: Optional[str] = Form(None),
    date: Optional[datetime] = Form(None),
    db: Session = Depends(get_db)
):
    MAX_BYTES = 2 * 1024 * 1024
    chunks = []
    total_bytes = 0

    while True:
        chunk = await file.read(64 * 1024)
        if not chunk:
            break
        total_bytes += len(chunk)
        if total_bytes > MAX_BYTES:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail={"error": {"code": "file_too_large", "message": "Uploaded file exceeds maximum limit of 2MB", "details": []}}
            )
        chunks.append(chunk)

    content_bytes = b"".join(chunks)

    try:
        meeting = await create_meeting_from_upload(
            db=db,
            content_bytes=content_bytes,
            filename=file.filename or "transcript.txt",
            title=title,
            date=date
        )
        return format_meeting_detail(meeting)
    except ParseError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"error": {"code": "parse_error", "message": str(e), "details": []}}
        )


@router.get("/{id}", response_model=MeetingDetailResponse)
def get_meeting_by_id(id: int, db: Session = Depends(get_db)):
    meeting = get_meeting(db, id)
    if not meeting:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "not_found", "message": f"Meeting with ID {id} not found", "details": []}}
        )
    return format_meeting_detail(meeting)


@router.patch("/{id}", response_model=MeetingDetailResponse)
def update_meeting_by_id(id: int, meeting_update: MeetingUpdate, db: Session = Depends(get_db)):
    meeting = update_meeting(db, id, meeting_update)
    if not meeting:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "not_found", "message": f"Meeting with ID {id} not found", "details": []}}
        )
    return format_meeting_detail(meeting)


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_meeting_by_id(id: int, db: Session = Depends(get_db)):
    success = delete_meeting(db, id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "not_found", "message": f"Meeting with ID {id} not found", "details": []}}
        )
    return None


@router.get("/{id}/transcript", response_model=List[TranscriptSegmentResponse])
def get_meeting_transcript(id: int, db: Session = Depends(get_db)):
    meeting = get_meeting(db, id)
    if not meeting:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "not_found", "message": f"Meeting with ID {id} not found", "details": []}}
        )
    return [TranscriptSegmentResponse.model_validate(seg) for seg in (meeting.transcript_segments or [])]


@router.get("/{id}/summary", response_model=Optional[SummaryResponse])
def get_meeting_summary(id: int, db: Session = Depends(get_db)):
    meeting = get_meeting(db, id)
    if not meeting:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "not_found", "message": f"Meeting with ID {id} not found", "details": []}}
        )
    if not meeting.summary:
        return SummaryResponse(
            id=0,
            meeting_id=meeting.id,
            overview=None,
            keywords=[],
            generated_at=meeting.created_at,
            chapters=[]
        )
    return SummaryResponse.from_orm_with_keywords(meeting.summary, meeting.chapters)


@router.post("/{id}/summary/regenerate", response_model=SummaryResponse)
async def regenerate_summary_endpoint(id: int, db: Session = Depends(get_db)):
    meeting = get_meeting(db, id)
    if not meeting:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "not_found", "message": f"Meeting with ID {id} not found", "details": []}}
        )
    if not meeting.transcript_segments:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"error": {"code": "no_transcript", "message": "Cannot generate summary for meeting with no transcript", "details": []}}
        )

    summary = await regenerate_meeting_summary(db, id)
    return SummaryResponse.from_orm_with_keywords(summary, meeting.chapters)


@router.post("/{id}/generate-audio", response_model=MeetingDetailResponse)
async def synthesize_meeting_audio_endpoint(id: int, request: Request, db: Session = Depends(get_db)):
    meeting = get_meeting(db, id)
    if not meeting:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "not_found", "message": f"Meeting with ID {id} not found", "details": []}}
        )
    if not meeting.transcript_segments:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"error": {"code": "no_transcript", "message": "No transcript available to synthesize audio", "details": []}}
        )

    segments_data = [
        {"speaker_label": s.speaker_label, "text": s.text, "start_sec": s.start_sec, "end_sec": s.end_sec}
        for s in meeting.transcript_segments
    ]

    audio_res = await generate_meeting_audio_track(id, segments_data)
    if not audio_res or not audio_res.get("audio_path"):
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": {"code": "audio_synthesis_failed", "message": "Failed to synthesize audio with TTS", "details": []}}
        )

    audio_path = audio_res["audio_path"]
    segment_timings = audio_res.get("segment_timings", [])
    total_dur = audio_res.get("total_duration", meeting.duration_sec)

    # Base URL from request
    base_url = str(request.base_url).rstrip("/")
    meeting.audio_url = f"{base_url}{audio_path}"
    
    # Synchronize segment timings in database for 100% accurate player seeking
    if segment_timings:
        meeting.duration_sec = total_dur
        sorted_segs = sorted(meeting.transcript_segments, key=lambda s: s.position)
        for t in segment_timings:
            idx = t["index"]
            if idx < len(sorted_segs):
                sorted_segs[idx].start_sec = t["start_sec"]
                sorted_segs[idx].end_sec = t["end_sec"]
        
        # Also adjust remaining segments if any
        if len(segment_timings) < len(sorted_segs):
            last_end = segment_timings[-1]["end_sec"]
            for s in sorted_segs[len(segment_timings):]:
                s.start_sec = last_end
                s.end_sec = last_end + 5.0
                last_end += 5.0
            meeting.duration_sec = int(round(last_end))

        # Synchronize chapters to the exact new start_sec of matching segment positions
        for ch in (meeting.chapters or []):
            if ch.position < len(sorted_segs):
                ch.start_sec = sorted_segs[ch.position].start_sec

    db.commit()
    db.refresh(meeting)
    return format_meeting_detail(meeting)


@router.put("/{id}/tags", response_model=MeetingDetailResponse)
def set_meeting_tags_endpoint(id: int, tag_ids: List[int], db: Session = Depends(get_db)):
    meeting = set_meeting_tags(db, id, tag_ids)
    if not meeting:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "not_found", "message": f"Meeting with ID {id} not found", "details": []}}
        )
    return format_meeting_detail(meeting)
