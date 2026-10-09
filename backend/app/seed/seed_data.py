import json
from pathlib import Path
from datetime import datetime, date
from sqlalchemy.orm import Session
from backend.app.models.models import (
    Meeting,
    Participant,
    TranscriptSegment,
    Summary,
    Chapter,
    ActionItem,
    Tag,
)

SEED_JSON_PATH = Path(__file__).resolve().parent / "seeded_meetings.json"


def seed_database(db: Session) -> bool:
    """
    Idempotent seed loader.
    Only seeds if the meetings table is empty.
    Loads measured timestamps and audio URLs from seeded_meetings.json as the single source of truth.
    """
    existing_count = db.query(Meeting).count()
    if existing_count > 0:
        return False  # Already seeded

    if not SEED_JSON_PATH.exists():
        raise FileNotFoundError(f"Seeded meetings definition not found at: {SEED_JSON_PATH}")

    with open(SEED_JSON_PATH, "r", encoding="utf-8") as f:
        seeded_meetings_data = json.load(f)

    tag_map: dict[str, Tag] = {}
    participant_map: dict[str, Participant] = {}

    for m_data in seeded_meetings_data:
        # 1. Ensure Participants exist
        for p_info in m_data.get("participants", []):
            p_name = p_info["name"]
            if p_name not in participant_map:
                p = db.query(Participant).filter(Participant.name == p_name).first()
                if not p:
                    p = Participant(name=p_name, email=p_info.get("email"))
                    db.add(p)
                    db.flush()
                participant_map[p_name] = p

        # 2. Ensure Tags exist
        meeting_tags_list = []
        for t_name in m_data.get("tags", []):
            if t_name not in tag_map:
                t = db.query(Tag).filter(Tag.name == t_name).first()
                if not t:
                    t = Tag(name=t_name)
                    db.add(t)
                    db.flush()
                tag_map[t_name] = t
            meeting_tags_list.append(tag_map[t_name])

        # 3. Create Meeting record
        dt = datetime.fromisoformat(m_data["date"])
        meeting = Meeting(
            title=m_data["title"],
            date=dt,
            duration_sec=int(m_data["duration_sec"]),
            audio_url=m_data.get("audio_url", f"/static/audio/meeting_{m_data['id']}.mp3"),
            source="seed",
        )
        meeting.tags = meeting_tags_list
        meeting.participants = [
            participant_map[p["name"]]
            for p in m_data.get("participants", [])
            if p["name"] in participant_map
        ]
        db.add(meeting)
        db.flush()

        # 4. Insert Transcript Segments
        for s in m_data.get("segments", []):
            spk = participant_map.get(s["speaker"])
            seg_obj = TranscriptSegment(
                meeting_id=meeting.id,
                speaker_id=spk.id if spk else None,
                speaker_label=s["speaker"],
                start_sec=float(s["start_sec"]),
                end_sec=float(s["end_sec"]),
                text=s["text"],
                position=int(s["position"]),
            )
            db.add(seg_obj)

        # 5. Insert Summary
        summary = Summary(
            meeting_id=meeting.id,
            overview=m_data.get("summary_overview", ""),
            keywords_json=json.dumps(m_data.get("keywords", [])),
        )
        db.add(summary)

        # 6. Insert Chapters
        for ch in m_data.get("chapters", []):
            ch_obj = Chapter(
                meeting_id=meeting.id,
                title=ch["title"],
                description=ch.get("description", ""),
                start_sec=float(ch["start_sec"]),
                position=int(ch["position"]),
            )
            db.add(ch_obj)

        # 7. Insert Action Items
        for ai in m_data.get("action_items", []):
            spk = participant_map.get(ai["speaker"]) if ai.get("speaker") else None
            due = date.fromisoformat(ai["due_date"]) if ai.get("due_date") else None
            ai_obj = ActionItem(
                meeting_id=meeting.id,
                assignee_id=spk.id if spk else None,
                text=ai["text"],
                due_date=due,
                is_completed=bool(ai.get("is_completed", False)),
            )
            db.add(ai_obj)

    db.commit()
    return True
