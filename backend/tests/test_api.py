import pytest
import io
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event, text
from sqlalchemy.engine import Engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from backend.app.core.database import Base, get_db
from backend.app.main import app
from backend.app.models.models import Comment, TranscriptSegment, Meeting
from backend.app.seed.seed_data import seed_database
from backend.app.services.parser_service import parse_vtt, parse_json_transcript, parse_txt, synthesize_timestamps

# Setup test in-memory SQLite DB
TEST_DATABASE_URL = "sqlite:///:memory:"

test_engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)

# @event.listens_for(test_engine, "connect")
# def set_sqlite_pragma(dbapi_conn, _):
#     cur = dbapi_conn.cursor()
#     cur.execute("PRAGMA foreign_keys=ON")
#     cur.close()

TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(scope="function", autouse=True)
def setup_test_db():
    Base.metadata.create_all(bind=test_engine)
    db = TestingSessionLocal()
    seed_database(db)
    db.close()
    yield
    Base.metadata.drop_all(bind=test_engine)


@pytest.fixture
def client():
    return TestClient(app)


# ----------------------------------------------------
# 1. Health Endpoint
# ----------------------------------------------------

def test_health_check(client):
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ok"
    assert data["database"] == "connected"


# ----------------------------------------------------
# 2. Meetings Listing & Filtering
# ----------------------------------------------------

def test_list_seeded_meetings(client):
    res = client.get("/api/meetings")
    assert res.status_code == 200
    data = res.json()
    assert data["total"] == 6
    assert len(data["items"]) == 6
    first = data["items"][0]
    assert "title" in first
    assert "duration_sec" in first
    assert len(first["participants"]) > 0


def test_search_meetings_by_query(client):
    res = client.get("/api/meetings?q=Roadmap")
    assert res.status_code == 200
    data = res.json()
    assert data["total"] >= 1
    assert "Roadmap" in data["items"][0]["title"]


def test_filter_meetings_by_participant(client):
    # Get participants first
    p_res = client.get("/api/participants")
    assert p_res.status_code == 200
    participants = p_res.json()
    assert len(participants) > 0
    p_id = participants[0]["id"]

    res = client.get(f"/api/meetings?participant_id={p_id}")
    assert res.status_code == 200
    data = res.json()
    assert data["total"] > 0
    for m in data["items"]:
        pids = [p["id"] for p in m["participants"]]
        assert p_id in pids


# ----------------------------------------------------
# 3. Meeting Detail & Seed Assertions
# ----------------------------------------------------

def test_get_meeting_detail(client):
    res = client.get("/api/meetings/1")
    assert res.status_code == 200
    data = res.json()
    assert data["id"] == 1
    assert data["summary"] is not None
    assert len(data["chapters"]) >= 3
    assert len(data["action_items"]) >= 2
    assert data["duration_sec"] > 1000


def test_get_meeting_transcript(client):
    res = client.get("/api/meetings/1/transcript")
    assert res.status_code == 200
    segments = res.json()
    assert len(segments) >= 20
    assert segments[0]["start_sec"] == 0.0
    assert segments[0]["end_sec"] > segments[0]["start_sec"]
    assert "speaker_label" in segments[0]


# ----------------------------------------------------
# 4. Form-Only Meeting (No Transcript)
# ----------------------------------------------------

def test_create_meeting_without_transcript(client):
    payload = {
        "title": "Quick Standup",
        "date": datetime.utcnow().isoformat(),
        "participants": [{"name": "Bob Builder", "email": "bob@example.com"}]
    }
    res = client.post("/api/meetings", json=payload)
    assert res.status_code == 201
    data = res.json()
    assert data["title"] == "Quick Standup"
    assert data["duration_sec"] == 0
    assert data["summary"] is None
    assert len(data["chapters"]) == 0
    assert len(data["action_items"]) == 0
    assert len(data["participants"]) == 1
    assert data["participants"][0]["name"] == "Bob Builder"

    # Verify transcript endpoint returns empty list
    t_res = client.get(f"/api/meetings/{data['id']}/transcript")
    assert t_res.status_code == 200
    assert t_res.json() == []


# ----------------------------------------------------
# 5. Create Meeting with Pasted Transcript (Auto-Gen)
# ----------------------------------------------------

def test_create_meeting_with_pasted_transcript(client):
    pasted_txt = """Alice: Let's discuss the release timeline for v2.0.
Bob: I'll finish the unit tests by Wednesday and review the pull request.
Alice: Great, we should deploy to staging on Thursday.
Bob: Sounds like a plan. I will follow up with QA."""

    payload = {
        "title": "Release Sync",
        "transcript_text": pasted_txt
    }
    res = client.post("/api/meetings", json=payload)
    assert res.status_code == 201
    data = res.json()
    assert data["title"] == "Release Sync"
    assert data["duration_sec"] > 0
    assert data["summary"] is not None
    assert len(data["chapters"]) >= 1
    assert len(data["action_items"]) >= 1

    # Verify Alice and Bob were created as participants
    names = [p["name"] for p in data["participants"]]
    assert "Alice" in names
    assert "Bob" in names


# ----------------------------------------------------
# 6. Upload Endpoint & 2MB Streaming Limit
# ----------------------------------------------------

def test_upload_vtt_transcript(client):
    vtt_content = """WEBVTT

00:00:01.000 --> 00:00:04.000
<v Charlie>Welcome everyone to our design check-in.

00:00:04.500 --> 00:00:09.000
<v Diana>I will prepare the design token documentation by tomorrow.
"""
    file_bytes = io.BytesIO(vtt_content.encode("utf-8"))
    res = client.post(
        "/api/meetings/upload",
        files={"file": ("meeting.vtt", file_bytes, "text/vtt")},
        data={"title": "Design Check-in"}
    )
    assert res.status_code == 201
    data = res.json()
    assert data["title"] == "Design Check-in"
    assert data["duration_sec"] == 9
    assert len(data["participants"]) == 2


def test_upload_oversized_file_rejected(client):
    # 2.5MB payload
    large_payload = b"A" * (2500 * 1024)
    file_bytes = io.BytesIO(large_payload)
    res = client.post(
        "/api/meetings/upload",
        files={"file": ("huge.txt", file_bytes, "text/plain")}
    )
    assert res.status_code == 413
    assert res.json()["error"]["code"] == "file_too_large"


# ----------------------------------------------------
# 7. Friendly Participant Removal (SET NULL in Service)
# ----------------------------------------------------

def test_friendly_participant_removal(client):
    # Meeting 1 has Alex Rivera with action items and segments
    m_res = client.get("/api/meetings/1")
    meeting = m_res.json()
    participants = meeting["participants"]
    assert len(participants) >= 2

    alex = next((p for p in participants if "Alex" in p["name"]), None)
    assert alex is not None

    # Update meeting to remove Alex
    remaining_participants = [p for p in participants if p["id"] != alex["id"]]
    patch_payload = {
        "participants": [{"id": p["id"]} for p in remaining_participants]
    }
    update_res = client.patch("/api/meetings/1", json=patch_payload)
    assert update_res.status_code == 200
    updated_meeting = update_res.json()
    assert len(updated_meeting["participants"]) == len(remaining_participants)

    # Verify Alex is no longer linked to meeting
    updated_pids = [p["id"] for p in updated_meeting["participants"]]
    assert alex["id"] not in updated_pids

    # Verify segments that belonged to Alex now have speaker_id = None but retain speaker_label
    t_res = client.get("/api/meetings/1/transcript")
    segments = t_res.json()
    for s in segments:
        if s["speaker_label"] == "Alex Rivera":
            assert s["speaker_id"] is None
            assert s["speaker"] is None


# ----------------------------------------------------
# 8. Action Items CRUD
# ----------------------------------------------------

def test_action_items_crud(client):
    # Create action item
    create_res = client.post(
        "/api/meetings/1/action-items",
        json={"text": "Review architecture doc", "due_date": "2026-11-01"}
    )
    assert create_res.status_code == 201
    item = create_res.json()
    assert item["text"] == "Review architecture doc"
    assert item["is_completed"] is False
    item_id = item["id"]

    # Patch action item
    patch_res = client.patch(
        f"/api/action-items/{item_id}",
        json={"is_completed": True, "text": "Review architecture doc (completed)"}
    )
    assert patch_res.status_code == 200
    updated_item = patch_res.json()
    assert updated_item["is_completed"] is True
    assert updated_item["text"] == "Review architecture doc (completed)"

    # Delete action item
    del_res = client.delete(f"/api/action-items/{item_id}")
    assert del_res.status_code == 204


# ----------------------------------------------------
# 9. Cascade Deletes
# ----------------------------------------------------

def test_delete_meeting_cascades(client):
    del_res = client.delete("/api/meetings/1")
    assert del_res.status_code == 204

    # Verify meeting is gone
    get_res = client.get("/api/meetings/1")
    assert get_res.status_code == 404

    # Verify transcript is gone
    t_res = client.get("/api/meetings/1/transcript")
    assert t_res.status_code == 404


# ----------------------------------------------------
# 10. Parsers Unit Tests
# ----------------------------------------------------

def test_parser_vtt():
    vtt = """WEBVTT

00:01:00.000 --> 00:01:05.000
<v Sarah>Hello world.
"""
    segs = parse_vtt(vtt)
    assert len(segs) == 1
    assert segs[0]["speaker_label"] == "Sarah"
    assert segs[0]["start_sec"] == 60.0
    assert segs[0]["end_sec"] == 65.0
    assert segs[0]["text"] == "Hello world."


def test_parser_json():
    json_txt = '{"segments": [{"speaker": "John", "text": "Hi there", "start_sec": 10, "end_sec": 15}]}'
    segs = parse_json_transcript(json_txt)
    assert len(segs) == 1
    assert segs[0]["speaker_label"] == "John"
    assert segs[0]["start_sec"] == 10.0


def test_parser_txt_synthesis():
    txt = """First line of discussion.
Second line with more content and words.
Third line concluded."""
    segs = parse_txt(txt)
    assert len(segs) == 3
    assert segs[0]["start_sec"] == 0.0
    assert segs[1]["start_sec"] == segs[0]["end_sec"]
    assert segs[2]["start_sec"] == segs[1]["end_sec"]


# ----------------------------------------------------
# 11. Global Search & Export
# ----------------------------------------------------

def test_global_search(client):
    res = client.get("/api/search?q=Sprint")
    assert res.status_code == 200
    data = res.json()
    assert data["total"] > 0


def test_export_markdown(client):
    res = client.get("/api/meetings/2/export?format=md")
    assert res.status_code == 200
    assert "text/markdown" in res.headers["content-type"]
    assert "# Engineering Sprint Retrospective" in res.text
    assert "## Transcript" in res.text


# ----------------------------------------------------
# 12. Comments 3NF Invariants & Cascades
# ----------------------------------------------------

def test_meeting_cascade_deletes_comments(client):
    # Meeting 1 has transcript segments. Let's create a comment on segment 1.
    res = client.post(
        "/api/meetings/1/comments",
        json={"segment_id": 1, "body": "Key product takeaway"}
    )
    assert res.status_code == 201
    comment_data = res.json()
    comment_id = comment_data["id"]

    db = TestingSessionLocal()
    # Verify comment exists in database
    comment = db.query(Comment).filter(Comment.id == comment_id).first()
    assert comment is not None

    # Delete Meeting 1
    del_res = client.delete("/api/meetings/1")
    assert del_res.status_code == 204

    # Verify comment was cascade-deleted (via Meeting -> Segment -> Comment cascade with PRAGMA foreign_keys=ON)
    deleted_comment = db.query(Comment).filter(Comment.id == comment_id).first()
    assert deleted_comment is None
    db.close()


def test_create_comment_cross_meeting_segment_fails_422(client):
    # Segment 1 belongs to Meeting 1. Attempting to add a comment to Meeting 2 with segment 1 must fail with 422.
    res = client.post(
        "/api/meetings/2/comments",
        json={"segment_id": 1, "body": "Cross-meeting attempt"}
    )
    assert res.status_code == 422
    data = res.json()
    assert data["error"]["code"] == "invalid_segment"


def test_sqlite_pragma_foreign_keys_and_raw_sql_cascade():
    # 1. Direct verification that PRAGMA foreign_keys is ON on a fresh raw connection
    with test_engine.connect() as conn:
        pragma_val = conn.execute(text("PRAGMA foreign_keys")).scalar()
        assert pragma_val == 1, "PRAGMA foreign_keys must be enabled (1)"

        # 2. Insert a comment on segment 1 via raw SQL
        conn.execute(
            text("INSERT INTO comments (segment_id, body, kind, created_at) VALUES (1, 'Raw SQL note', 'comment', datetime('now'))")
        )
        conn.commit()

        # Confirm comment exists
        comment_count = conn.execute(text("SELECT COUNT(*) FROM comments WHERE segment_id = 1")).scalar()
        assert comment_count >= 1

        # 3. Delete meeting 1 via RAW SQL (bypassing ORM session entirely)
        conn.execute(text("DELETE FROM meetings WHERE id = 1"))
        conn.commit()

        # 4. Assert SQLite engine-level foreign key cascade deleted child segments AND grandchild comments
        remaining_segments = conn.execute(text("SELECT COUNT(*) FROM transcript_segments WHERE meeting_id = 1")).scalar()
        assert remaining_segments == 0, "All segments for meeting 1 must be deleted by SQLite engine cascade"

        remaining_comments = conn.execute(text("SELECT COUNT(*) FROM comments WHERE segment_id = 1")).scalar()
        assert remaining_comments == 0, "All comments for segment 1 must be cascade-deleted by SQLite engine without ORM involvement"


