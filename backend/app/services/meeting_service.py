from datetime import datetime
import json
from typing import List, Optional, Tuple, Dict, Any, Union
from sqlalchemy.orm import Session
from sqlalchemy import desc, asc, func, or_

from backend.app.models.models import (
    Meeting,
    Participant,
    TranscriptSegment,
    Summary,
    Chapter,
    ActionItem,
    Tag,
    Comment,
    meeting_participants,
    meeting_tags,
)
from backend.app.schemas.schemas import (
    MeetingCreate,
    MeetingUpdate,
    ParticipantInputItem,
    ParticipantCreate,
    ActionItemCreate,
    ActionItemUpdate,
    TagCreate,
)
from backend.app.services.parser_service import (
    parse_vtt,
    parse_json_transcript,
    parse_txt,
    parse_pasted_transcript,
    ParseError,
)
from backend.app.services.ai_service import generate_meeting_ai_data


# ----------------------------------------------------
# Participant Helpers
# ----------------------------------------------------

def resolve_or_create_participant(db: Session, item: Union[int, ParticipantInputItem, ParticipantCreate, Dict[str, Any]]) -> Participant:
    """Resolves participant by ID or creates/reuses by email or name."""
    if isinstance(item, int):
        p = db.query(Participant).filter(Participant.id == item).first()
        if not p:
            raise ValueError(f"Participant with ID {item} not found")
        return p

    name = getattr(item, "name", None) or (item.get("name") if isinstance(item, dict) else None)
    email = getattr(item, "email", None) or (item.get("email") if isinstance(item, dict) else None)
    pid = getattr(item, "id", None) or (item.get("id") if isinstance(item, dict) else None)

    if pid:
        p = db.query(Participant).filter(Participant.id == pid).first()
        if p:
            return p

    if email:
        p = db.query(Participant).filter(Participant.email == email.strip()).first()
        if p:
            if name and not p.name:
                p.name = name.strip()
                db.flush()
            return p

    if not name:
        raise ValueError("Participant name is required")

    # Reuse if matching name and no email exists
    p = db.query(Participant).filter(func.lower(Participant.name) == name.strip().lower()).first()
    if p:
        if email and not p.email:
            p.email = email.strip()
            db.flush()
        return p

    # Create new
    new_p = Participant(name=name.strip(), email=email.strip() if email else None)
    db.add(new_p)
    db.flush()
    return new_p


def get_or_create_participant_by_speaker_label(db: Session, label: str) -> Participant:
    """Finds or creates a participant from a speaker label."""
    clean_name = label.strip()
    if not clean_name or clean_name.lower() == "speaker":
        clean_name = "Speaker"
    p = db.query(Participant).filter(func.lower(Participant.name) == clean_name.lower()).first()
    if not p:
        p = Participant(name=clean_name, email=None)
        db.add(p)
        db.flush()
    return p


# ----------------------------------------------------
# Meeting Queries
# ----------------------------------------------------

def get_meetings(
    db: Session,
    q: Optional[str] = None,
    participant_id: Optional[int] = None,
    tag: Optional[str] = None,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    sort: str = "date_desc",
    page: int = 1,
    page_size: int = 20
) -> Tuple[List[Meeting], int]:
    """Lists meetings with filters, sorting, and pagination."""
    query = db.query(Meeting)

    if q and q.strip():
        search_term = f"%{q.strip()}%"
        # Search title, or matching transcript segment text
        matching_seg_meeting_ids = (
            db.query(TranscriptSegment.meeting_id)
            .filter(TranscriptSegment.text.ilike(search_term))
            .distinct()
        )
        query = query.filter(
            or_(
                Meeting.title.ilike(search_term),
                Meeting.id.in_(matching_seg_meeting_ids)
            )
        )

    if participant_id:
        query = query.join(Meeting.participants).filter(Participant.id == participant_id)

    if tag and tag.strip():
        query = query.join(Meeting.tags).filter(func.lower(Tag.name) == tag.strip().lower())

    if date_from:
        query = query.filter(Meeting.date >= date_from)

    if date_to:
        query = query.filter(Meeting.date <= date_to)

    # Sort
    if sort == "date_asc":
        query = query.order_by(asc(Meeting.date))
    elif sort == "title":
        query = query.order_by(asc(Meeting.title))
    else:
        query = query.order_by(desc(Meeting.date))

    total = query.distinct().count()
    items = query.distinct().offset((page - 1) * page_size).limit(page_size).all()
    return items, total


def get_meeting(db: Session, meeting_id: int) -> Optional[Meeting]:
    return db.query(Meeting).filter(Meeting.id == meeting_id).first()


# ----------------------------------------------------
# Meeting Creation & Processing
# ----------------------------------------------------

async def create_meeting(db: Session, meeting_in: MeetingCreate) -> Meeting:
    """Creates a meeting, links participants & tags, and parses transcript if present."""
    meeting_date = meeting_in.date or datetime.utcnow()
    meeting = Meeting(
        title=meeting_in.title.strip(),
        date=meeting_date,
        duration_sec=0,
        source="manual",
    )
    db.add(meeting)
    db.flush()

    # Link participants
    linked_participants: List[Participant] = []
    if meeting_in.participants:
        for p_item in meeting_in.participants:
            try:
                p = resolve_or_create_participant(db, p_item)
                if p not in linked_participants:
                    linked_participants.append(p)
            except Exception:
                continue

    # Link tags
    if meeting_in.tag_ids:
        tags = db.query(Tag).filter(Tag.id.in_(meeting_in.tag_ids)).all()
        meeting.tags = tags

    # Process transcript if provided
    raw_segments: List[Dict[str, Any]] = []
    if meeting_in.transcript_text and meeting_in.transcript_text.strip():
        raw_segments = parse_pasted_transcript(meeting_in.transcript_text)

    if raw_segments:
        # Resolve speakers and create participants
        speaker_map: Dict[str, Participant] = {p.name.lower(): p for p in linked_participants}
        for seg in raw_segments:
            spk_label = seg.get("speaker_label", "Speaker")
            if spk_label.lower() not in speaker_map:
                p = get_or_create_participant_by_speaker_label(db, spk_label)
                speaker_map[spk_label.lower()] = p
                if p not in linked_participants:
                    linked_participants.append(p)
            seg["speaker_id"] = speaker_map[spk_label.lower()].id

        # Insert segments
        for idx, seg in enumerate(raw_segments):
            seg_obj = TranscriptSegment(
                meeting_id=meeting.id,
                speaker_id=seg.get("speaker_id"),
                speaker_label=seg.get("speaker_label", "Speaker"),
                start_sec=seg["start_sec"],
                end_sec=seg["end_sec"],
                text=seg["text"],
                position=idx,
            )
            db.add(seg_obj)

        # Calculate duration
        last_seg = raw_segments[-1]
        meeting.duration_sec = int(round(last_seg["end_sec"]))

        meeting.participants = linked_participants
        db.flush()

        # Run AI generation (safe with 10s timeout + mock fallback)
        ai_data = await generate_meeting_ai_data(meeting.title, raw_segments)

        # Create summary
        if ai_data.get("overview") or ai_data.get("keywords"):
            summary = Summary(
                meeting_id=meeting.id,
                overview=ai_data.get("overview"),
                keywords_json=json.dumps(ai_data.get("keywords", [])),
            )
            db.add(summary)

        # Create chapters
        for ch in ai_data.get("chapters", []):
            ch_obj = Chapter(
                meeting_id=meeting.id,
                title=ch["title"],
                description=ch.get("description"),
                start_sec=ch["start_sec"],
                position=ch.get("position", 0),
            )
            db.add(ch_obj)

        # Create action items
        for ai in ai_data.get("action_items", []):
            ai_obj = ActionItem(
                meeting_id=meeting.id,
                assignee_id=ai.get("assignee_id"),
                text=ai["text"],
                due_date=ai.get("due_date"),
                is_completed=ai.get("is_completed", False),
            )
            db.add(ai_obj)

    else:
        meeting.participants = linked_participants

    db.commit()
    db.refresh(meeting)
    return meeting


async def create_meeting_from_upload(
    db: Session,
    content_bytes: bytes,
    filename: str,
    title: Optional[str] = None,
    date: Optional[datetime] = None
) -> Meeting:
    """Parses uploaded file, creates participants, segments, and auto-generates AI data."""
    text_content = content_bytes.decode("utf-8", errors="replace")
    lower_fn = filename.lower()

    if lower_fn.endswith(".vtt"):
        raw_segments = parse_vtt(text_content)
    elif lower_fn.endswith(".json"):
        raw_segments = parse_json_transcript(text_content)
    else:
        # .txt or pasted
        raw_segments = parse_pasted_transcript(text_content)

    if not raw_segments:
        raise ParseError("No transcript segments could be parsed from the uploaded file")

    meeting_title = title.strip() if title and title.strip() else filename.rsplit(".", 1)[0].replace("_", " ").title()
    meeting_date = date or datetime.utcnow()

    meeting = Meeting(
        title=meeting_title,
        date=meeting_date,
        duration_sec=int(round(raw_segments[-1]["end_sec"])),
        source="upload",
    )
    db.add(meeting)
    db.flush()

    # Create participants for unique speaker labels
    linked_participants: List[Participant] = []
    speaker_map: Dict[str, Participant] = {}

    for seg in raw_segments:
        spk_label = seg.get("speaker_label", "Speaker").strip()
        if spk_label.lower() not in speaker_map:
            p = get_or_create_participant_by_speaker_label(db, spk_label)
            speaker_map[spk_label.lower()] = p
            if p not in linked_participants:
                linked_participants.append(p)
        seg["speaker_id"] = speaker_map[spk_label.lower()].id

    meeting.participants = linked_participants

    # Insert transcript segments
    for idx, seg in enumerate(raw_segments):
        seg_obj = TranscriptSegment(
            meeting_id=meeting.id,
            speaker_id=seg.get("speaker_id"),
            speaker_label=seg.get("speaker_label", "Speaker"),
            start_sec=seg["start_sec"],
            end_sec=seg["end_sec"],
            text=seg["text"],
            position=idx,
        )
        db.add(seg_obj)

    db.flush()

    # Generate AI insights
    ai_data = await generate_meeting_ai_data(meeting.title, raw_segments)

    # Summary
    if ai_data.get("overview") or ai_data.get("keywords"):
        summary = Summary(
            meeting_id=meeting.id,
            overview=ai_data.get("overview"),
            keywords_json=json.dumps(ai_data.get("keywords", [])),
        )
        db.add(summary)

    # Chapters
    for ch in ai_data.get("chapters", []):
        ch_obj = Chapter(
            meeting_id=meeting.id,
            title=ch["title"],
            description=ch.get("description"),
            start_sec=ch["start_sec"],
            position=ch.get("position", 0),
        )
        db.add(ch_obj)

    # Action items
    for ai in ai_data.get("action_items", []):
        ai_obj = ActionItem(
            meeting_id=meeting.id,
            assignee_id=ai.get("assignee_id"),
            text=ai["text"],
            due_date=ai.get("due_date"),
            is_completed=ai.get("is_completed", False),
        )
        db.add(ai_obj)

    db.commit()
    db.refresh(meeting)
    return meeting


# ----------------------------------------------------
# Meeting Update & Participant Unlinking
# ----------------------------------------------------

def update_meeting(db: Session, meeting_id: int, meeting_update: MeetingUpdate) -> Optional[Meeting]:
    """Updates meeting metadata and handles friendly participant unlinking with SET NULL in service."""
    meeting = get_meeting(db, meeting_id)
    if not meeting:
        return None

    if meeting_update.title is not None:
        meeting.title = meeting_update.title.strip()

    if meeting_update.date is not None:
        meeting.date = meeting_update.date

    if meeting_update.tag_ids is not None:
        tags = db.query(Tag).filter(Tag.id.in_(meeting_update.tag_ids)).all()
        meeting.tags = tags

    if meeting_update.participants is not None:
        # Resolve target participant set
        new_participants: List[Participant] = []
        for p_item in meeting_update.participants:
            try:
                p = resolve_or_create_participant(db, p_item)
                if p not in new_participants:
                    new_participants.append(p)
            except Exception:
                continue

        current_pids = {p.id for p in meeting.participants}
        new_pids = {p.id for p in new_participants}
        removed_pids = current_pids - new_pids

        # Friendly unlinking: SET speaker_id and assignee_id to NULL in service
        if removed_pids:
            for r_pid in removed_pids:
                db.query(TranscriptSegment).filter(
                    TranscriptSegment.meeting_id == meeting_id,
                    TranscriptSegment.speaker_id == r_pid
                ).update({"speaker_id": None}, synchronize_session="fetch")

                db.query(ActionItem).filter(
                    ActionItem.meeting_id == meeting_id,
                    ActionItem.assignee_id == r_pid
                ).update({"assignee_id": None}, synchronize_session="fetch")

        meeting.participants = new_participants

    db.commit()
    db.refresh(meeting)
    return meeting


def delete_meeting(db: Session, meeting_id: int) -> bool:
    """Deletes meeting and cascades all child rows."""
    meeting = get_meeting(db, meeting_id)
    if not meeting:
        return False
    db.delete(meeting)
    db.commit()
    return True


async def regenerate_meeting_summary(db: Session, meeting_id: int) -> Optional[Summary]:
    """Re-runs AI summary & chapters for a meeting without deleting manual action items."""
    meeting = get_meeting(db, meeting_id)
    if not meeting or not meeting.transcript_segments:
        return None

    segments_data = [
        {
            "speaker_label": s.speaker_label,
            "speaker_id": s.speaker_id,
            "start_sec": s.start_sec,
            "end_sec": s.end_sec,
            "text": s.text,
        }
        for s in meeting.transcript_segments
    ]

    ai_data = await generate_meeting_ai_data(meeting.title, segments_data)

    # Update or create summary
    summary = meeting.summary
    if not summary:
        summary = Summary(meeting_id=meeting.id)
        db.add(summary)

    summary.overview = ai_data.get("overview")
    summary.keywords_json = json.dumps(ai_data.get("keywords", []))
    summary.generated_at = datetime.utcnow()

    # Refresh chapters
    db.query(Chapter).filter(Chapter.meeting_id == meeting_id).delete()
    for ch in ai_data.get("chapters", []):
        ch_obj = Chapter(
            meeting_id=meeting.id,
            title=ch["title"],
            description=ch.get("description"),
            start_sec=ch["start_sec"],
            position=ch.get("position", 0),
        )
        db.add(ch_obj)

    db.commit()
    db.refresh(summary)
    return summary


# ----------------------------------------------------
# Action Items Operations
# ----------------------------------------------------

def get_action_items(db: Session, meeting_id: int) -> List[ActionItem]:
    return db.query(ActionItem).filter(ActionItem.meeting_id == meeting_id).order_by(ActionItem.id.asc()).all()


def create_action_item(db: Session, meeting_id: int, item_in: ActionItemCreate) -> ActionItem:
    item = ActionItem(
        meeting_id=meeting_id,
        assignee_id=item_in.assignee_id,
        text=item_in.text.strip(),
        due_date=item_in.due_date,
        is_completed=False,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


def update_action_item(db: Session, item_id: int, item_in: ActionItemUpdate) -> Optional[ActionItem]:
    item = db.query(ActionItem).filter(ActionItem.id == item_id).first()
    if not item:
        return None

    if item_in.text is not None:
        item.text = item_in.text.strip()
    if item_in.assignee_id is not None:
        item.assignee_id = item_in.assignee_id
    if item_in.due_date is not None:
        item.due_date = item_in.due_date
    if item_in.is_completed is not None:
        item.is_completed = item_in.is_completed

    db.commit()
    db.refresh(item)
    return item


def delete_action_item(db: Session, item_id: int) -> bool:
    item = db.query(ActionItem).filter(ActionItem.id == item_id).first()
    if not item:
        return False
    db.delete(item)
    db.commit()
    return True


# ----------------------------------------------------
# Tags & Participants Queries
# ----------------------------------------------------

def get_all_participants(db: Session) -> List[Participant]:
    return db.query(Participant).order_by(Participant.name.asc()).all()


def get_all_tags(db: Session) -> List[Tag]:
    return db.query(Tag).order_by(Tag.name.asc()).all()


def create_tag(db: Session, tag_in: TagCreate) -> Tag:
    clean_name = tag_in.name.strip()
    tag = db.query(Tag).filter(func.lower(Tag.name) == clean_name.lower()).first()
    if not tag:
        tag = Tag(name=clean_name)
        db.add(tag)
        db.commit()
        db.refresh(tag)
    return tag


def set_meeting_tags(db: Session, meeting_id: int, tag_ids: List[int]) -> Optional[Meeting]:
    meeting = get_meeting(db, meeting_id)
    if not meeting:
        return None
    tags = db.query(Tag).filter(Tag.id.in_(tag_ids)).all()
    meeting.tags = tags
    db.commit()
    db.refresh(meeting)
    return meeting
