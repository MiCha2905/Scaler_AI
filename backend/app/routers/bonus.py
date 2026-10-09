from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc

from backend.app.core.database import get_db
from backend.app.models.models import Meeting, TranscriptSegment, Summary, Chapter, ActionItem, Comment
from backend.app.schemas.schemas import CommentCreate, CommentResponse
from backend.app.services.meeting_service import get_meeting
from backend.app.services.ai_service import answer_meeting_chat_question

router = APIRouter(tags=["bonus"])


# ----------------------------------------------------
# Global Search
# ----------------------------------------------------

class SearchResultItem(BaseModel):
    meeting_id: int
    meeting_title: str
    match_type: str  # 'title' | 'transcript' | 'summary' | 'action_item'
    snippet: str
    timestamp_sec: Optional[float] = None
    created_at: datetime


class GlobalSearchResponse(BaseModel):
    query: str
    total: int
    results: List[SearchResultItem]


@router.get("/search", response_model=GlobalSearchResponse)
def global_search(
    q: str = Query(..., min_length=1, description="Search query string"),
    type: Optional[str] = Query(None, description="Filter search by type: title, transcript, summary, action_item"),
    db: Session = Depends(get_db)
):
    search_term = f"%{q.strip()}%"
    results: List[SearchResultItem] = []

    # 1. Search Titles
    if not type or type == "title":
        title_matches = db.query(Meeting).filter(Meeting.title.ilike(search_term)).limit(10).all()
        for m in title_matches:
            results.append(SearchResultItem(
                meeting_id=m.id,
                meeting_title=m.title,
                match_type="title",
                snippet=m.title,
                timestamp_sec=None,
                created_at=m.created_at
            ))

    # 2. Search Transcripts
    if not type or type == "transcript":
        transcript_matches = (
            db.query(TranscriptSegment, Meeting)
            .join(Meeting, TranscriptSegment.meeting_id == Meeting.id)
            .filter(TranscriptSegment.text.ilike(search_term))
            .limit(20)
            .all()
        )
        for seg, m in transcript_matches:
            results.append(SearchResultItem(
                meeting_id=m.id,
                meeting_title=m.title,
                match_type="transcript",
                snippet=f"{seg.speaker_label}: {seg.text}",
                timestamp_sec=seg.start_sec,
                created_at=m.created_at
            ))

    # 3. Search Summaries
    if not type or type == "summary":
        summary_matches = (
            db.query(Summary, Meeting)
            .join(Meeting, Summary.meeting_id == Meeting.id)
            .filter(or_(Summary.overview.ilike(search_term), Summary.keywords_json.ilike(search_term)))
            .limit(10)
            .all()
        )
        for s, m in summary_matches:
            results.append(SearchResultItem(
                meeting_id=m.id,
                meeting_title=m.title,
                match_type="summary",
                snippet=(s.overview[:200] + "...") if s.overview and len(s.overview) > 200 else (s.overview or ""),
                timestamp_sec=None,
                created_at=m.created_at
            ))

    # 4. Search Action Items
    if not type or type == "action_item":
        action_matches = (
            db.query(ActionItem, Meeting)
            .join(Meeting, ActionItem.meeting_id == Meeting.id)
            .filter(ActionItem.text.ilike(search_term))
            .limit(10)
            .all()
        )
        for a, m in action_matches:
            results.append(SearchResultItem(
                meeting_id=m.id,
                meeting_title=m.title,
                match_type="action_item",
                snippet=a.text,
                timestamp_sec=None,
                created_at=m.created_at
            ))

    return GlobalSearchResponse(
        query=q,
        total=len(results),
        results=results
    )


# ----------------------------------------------------
# Comments & Highlights
# ----------------------------------------------------

@router.get("/meetings/{meeting_id}/comments", response_model=List[CommentResponse])
def list_comments(meeting_id: int, db: Session = Depends(get_db)):
    comments = (
        db.query(Comment)
        .join(TranscriptSegment, Comment.segment_id == TranscriptSegment.id)
        .filter(TranscriptSegment.meeting_id == meeting_id)
        .order_by(Comment.created_at.asc())
        .all()
    )
    return [CommentResponse.model_validate(c) for c in comments]


@router.post("/meetings/{meeting_id}/comments", response_model=CommentResponse, status_code=status.HTTP_201_CREATED)
def create_comment(meeting_id: int, comment_in: CommentCreate, db: Session = Depends(get_db)):
    meeting = get_meeting(db, meeting_id)
    if not meeting:
        raise HTTPException(status_code=404, detail={"error": {"code": "not_found", "message": "Meeting not found", "details": []}})

    seg = db.query(TranscriptSegment).filter(
        TranscriptSegment.id == comment_in.segment_id,
        TranscriptSegment.meeting_id == meeting_id
    ).first()
    if not seg:
        raise HTTPException(status_code=404, detail={"error": {"code": "not_found", "message": "Transcript segment not found", "details": []}})

    c = Comment(
        segment_id=comment_in.segment_id,
        body=comment_in.body.strip(),
        kind=comment_in.kind or "comment"
    )
    db.add(c)
    db.commit()
    db.refresh(c)
    return CommentResponse.model_validate(c)


@router.delete("/comments/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_comment(id: int, db: Session = Depends(get_db)):
    c = db.query(Comment).filter(Comment.id == id).first()
    if not c:
        raise HTTPException(status_code=404, detail={"error": {"code": "not_found", "message": "Comment not found", "details": []}})
    db.delete(c)
    db.commit()
    return None


# ----------------------------------------------------
# Export Endpoint (Markdown & TXT)
# ----------------------------------------------------

@router.get("/meetings/{meeting_id}/export")
def export_meeting(
    meeting_id: int,
    format: str = Query("md", description="Export format: md or txt"),
    db: Session = Depends(get_db)
):
    meeting = get_meeting(db, meeting_id)
    if not meeting:
        raise HTTPException(status_code=404, detail={"error": {"code": "not_found", "message": "Meeting not found", "details": []}})

    safe_title = "".join(c for c in meeting.title if c.isalnum() or c in (" ", "-", "_")).strip().replace(" ", "_")
    date_str = meeting.date.strftime("%Y-%m-%d")

    if format.lower() == "txt":
        lines = [
            f"MEETING: {meeting.title}",
            f"DATE: {meeting.date.strftime('%Y-%m-%d %H:%M UTC')}",
            f"DURATION: {meeting.duration_sec // 60}m {meeting.duration_sec % 60}s",
            f"PARTICIPANTS: {', '.join(p.name for p in meeting.participants) if meeting.participants else 'None'}",
            "",
            "=== SUMMARY ===",
            meeting.summary.overview if meeting.summary and meeting.summary.overview else "No summary available.",
            "",
            "=== ACTION ITEMS ==="
        ]
        if meeting.action_items:
            for ai in meeting.action_items:
                assignee_name = ai.assignee.name if ai.assignee else "Unassigned"
                status_mark = "[x]" if ai.is_completed else "[ ]"
                lines.append(f"{status_mark} {ai.text} (Assigned: {assignee_name})")
        else:
            lines.append("No action items.")

        lines.extend(["", "=== TRANSCRIPT ==="])
        for seg in (meeting.transcript_segments or []):
            m = int(seg.start_sec // 60)
            s = int(seg.start_sec % 60)
            lines.append(f"[{m:02d}:{s:02d}] {seg.speaker_label}: {seg.text}")

        content = "\n".join(lines)
        return Response(
            content=content,
            media_type="text/plain; charset=utf-8",
            headers={"Content-Disposition": f'attachment; filename="{safe_title}_{date_str}.txt"'}
        )

    # Markdown export (default)
    lines = [
        f"# {meeting.title}",
        f"**Date:** {meeting.date.strftime('%B %d, %Y at %H:%M UTC')}  ",
        f"**Duration:** {meeting.duration_sec // 60} min {meeting.duration_sec % 60} sec  ",
        f"**Participants:** {', '.join(f'`{p.name}`' for p in meeting.participants) if meeting.participants else 'None'}  ",
        "",
        "## Summary",
        meeting.summary.overview if meeting.summary and meeting.summary.overview else "*No summary available.*",
        ""
    ]

    if meeting.chapters:
        lines.append("## Chapters")
        for ch in meeting.chapters:
            m = int(ch.start_sec // 60)
            s = int(ch.start_sec % 60)
            lines.append(f"- **`{m:02d}:{s:02d}` {ch.title}**: {ch.description or ''}")
        lines.append("")

    lines.append("## Action Items")
    if meeting.action_items:
        for ai in meeting.action_items:
            assignee_name = f"@{ai.assignee.name}" if ai.assignee else "Unassigned"
            box = "- [x]" if ai.is_completed else "- [ ]"
            due = f" *(due: {ai.due_date})*" if ai.due_date else ""
            lines.append(f"{box} {ai.text} — {assignee_name}{due}")
    else:
        lines.append("*No action items identified.*")
    lines.append("")

    lines.append("## Transcript")
    for seg in (meeting.transcript_segments or []):
        m = int(seg.start_sec // 60)
        s = int(seg.start_sec % 60)
        lines.append(f"> **`[{m:02d}:{s:02d}]` {seg.speaker_label}:** {seg.text}\n>")

    content = "\n".join(lines)
    return Response(
        content=content,
        media_type="text/markdown; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{safe_title}_{date_str}.md"'}
    )


# ----------------------------------------------------
# Interactive Chat Q&A
# ----------------------------------------------------

class ChatQuestion(BaseModel):
    question: str = Field(..., min_length=1)


class ChatAnswer(BaseModel):
    question: str
    answer: str
    relevant_segments: List[int] = []


@router.post("/meetings/{meeting_id}/chat", response_model=ChatAnswer)
async def chat_with_meeting(meeting_id: int, chat_in: ChatQuestion, db: Session = Depends(get_db)):
    meeting = get_meeting(db, meeting_id)
    if not meeting:
        raise HTTPException(status_code=404, detail={"error": {"code": "not_found", "message": "Meeting not found", "details": []}})

    segments_data = [
        {"id": s.id, "speaker_label": s.speaker_label, "text": s.text, "start_sec": s.start_sec}
        for s in (meeting.transcript_segments or [])
    ]

    chat_result = await answer_meeting_chat_question(
        meeting_title=meeting.title,
        segments=segments_data,
        question=chat_in.question
    )

    return ChatAnswer(
        question=chat_in.question,
        answer=chat_result.get("answer", "No answer found."),
        relevant_segments=chat_result.get("relevant_segments", [])
    )
