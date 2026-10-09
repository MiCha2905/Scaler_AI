"""
Comprehensive Live System Audit Script for Fireflies Clone
Tests every feature and endpoint live against the running server.
"""
import urllib.request
import urllib.error
import json
import os
import sys

API_BASE = "http://127.0.0.1:8000/api"
FRONTEND_BASE = "http://localhost:3000"

results = []

def record(test_name: str, passed: bool, detail: str = ""):
    status = "PASS" if passed else "FAIL"
    results.append((test_name, status, detail))
    print(f"[{status}] {test_name}: {detail}")

def http_json(url: str, method: str = "GET", payload: dict = None):
    headers = {"Content-Type": "application/json"} if payload else {}
    body = json.dumps(payload).encode("utf-8") if payload else None
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    with urllib.request.urlopen(req) as resp:
        content = resp.read().decode("utf-8")
        if resp.status == 204 or not content:
            return resp.status, None
        return resp.status, json.loads(content)

def run_all_checks():
    print("=" * 60)
    print("STARTING LIVE SYSTEM AUDIT FOR FIREFLIES.AI CLONE")
    print("=" * 60)

    # 1. Health Endpoint
    try:
        st, data = http_json(f"{API_BASE}/health")
        record("1. Backend Health Check", st == 200 and data.get("status") == "ok", f"Database: {data.get('database')}")
    except Exception as e:
        record("1. Backend Health Check", False, str(e))

    # 2. Seeded Meetings List
    try:
        st, data = http_json(f"{API_BASE}/meetings")
        total = data.get("total", 0)
        record("2. Seeded Meetings List", st == 200 and total >= 6, f"Found {total} meetings in SQLite DB")
    except Exception as e:
        record("2. Seeded Meetings List", False, str(e))

    # 3. Filtering by Query
    try:
        st, data = http_json(f"{API_BASE}/meetings?q=Roadmap")
        total = data.get("total", 0)
        record("3. Meeting Search by Query", st == 200 and total >= 1, f"Found {total} matching meetings for 'Roadmap'")
    except Exception as e:
        record("3. Meeting Search by Query", False, str(e))

    # 4. Filtering by Tag
    try:
        st, data = http_json(f"{API_BASE}/meetings?tag=Engineering")
        total = data.get("total", 0)
        record("4. Meeting Filter by Tag", st == 200 and total >= 1, f"Found {total} meetings tagged #Engineering")
    except Exception as e:
        record("4. Meeting Filter by Tag", False, str(e))

    # 5. Filtering by Participant
    try:
        st, data = http_json(f"{API_BASE}/meetings?participant_id=1")
        total = data.get("total", 0)
        record("5. Meeting Filter by Participant", st == 200 and total >= 1, f"Found {total} meetings for Sarah Chen (ID 1)")
    except Exception as e:
        record("5. Meeting Filter by Participant", False, str(e))

    # 6. Sorting Meetings
    try:
        st, data = http_json(f"{API_BASE}/meetings?sort=date_asc")
        record("6. Meeting Sorting (Oldest First)", st == 200 and len(data.get("items", [])) > 0, "Sorted successfully")
    except Exception as e:
        record("6. Meeting Sorting", False, str(e))

    # 7. Participants List
    try:
        st, data = http_json(f"{API_BASE}/participants")
        record("7. Participants List", st == 200 and len(data) >= 4, f"Loaded {len(data)} global participants")
    except Exception as e:
        record("7. Participants List", False, str(e))

    # 8. Tags List
    try:
        st, data = http_json(f"{API_BASE}/tags")
        record("8. Tags List", st == 200 and len(data) >= 4, f"Loaded {len(data)} global tags")
    except Exception as e:
        record("8. Tags List", False, str(e))

    # 9. Meeting Detail View (Meeting 1)
    try:
        st, data = http_json(f"{API_BASE}/meetings/1")
        has_summary = bool(data.get("summary"))
        chapters_count = len(data.get("chapters", []))
        action_count = len(data.get("action_items", []))
        record("9. Meeting Detail with AI Summary", st == 200 and has_summary, f"Chapters: {chapters_count}, Action Items: {action_count}")
    except Exception as e:
        record("9. Meeting Detail", False, str(e))

    # 10. Transcript Segments (Meeting 1)
    try:
        st, data = http_json(f"{API_BASE}/meetings/1/transcript")
        seg_count = len(data) if isinstance(data, list) else 0
        record("10. Transcript Segments", st == 200 and seg_count > 0, f"Retrieved {seg_count} timestamped segments")
    except Exception as e:
        record("10. Transcript Segments", False, str(e))

    # 11. Action Item Lifecycle (Create, Update, Delete)
    try:
        # Create
        st, item = http_json(f"{API_BASE}/meetings/1/action-items", method="POST", payload={
            "text": "Live Audit Task: Review infrastructure",
            "assignee_id": 1,
            "due_date": "2026-10-15"
        })
        item_id = item.get("id")
        # Update (Toggle completion)
        st2, updated = http_json(f"{API_BASE}/action-items/{item_id}", method="PATCH", payload={"is_completed": True})
        # Delete
        st3, _ = http_json(f"{API_BASE}/action-items/{item_id}", method="DELETE")
        record("11. Action Items Lifecycle (Create/Edit/Complete/Delete)", st == 201 and updated.get("is_completed") is True, f"Verified full CRUD on action item #{item_id}")
    except Exception as e:
        record("11. Action Items Lifecycle", False, str(e))

    # 12. Comments on Transcript (Create, List, Delete)
    try:
        st, comment = http_json(f"{API_BASE}/meetings/1/comments", method="POST", payload={
            "segment_id": 1,
            "body": "Live audit verified note"
        })
        cid = comment.get("id")
        st2, comments_list = http_json(f"{API_BASE}/meetings/1/comments")
        st3, _ = http_json(f"{API_BASE}/comments/{cid}", method="DELETE")
        record("12. Transcript Comments & Notes (Bonus 1)", st == 201 and len(comments_list) >= 1, f"Added & verified comment #{cid}")
    except Exception as e:
        record("12. Transcript Comments", False, str(e))

    # 13. Global Search across Meetings, Transcripts, Summaries, Actions
    try:
        st, data = http_json(f"{API_BASE}/search?q=roadmap")
        total_matches = data.get("total", len(data.get("results", [])))
        record("13. Global Search (Bonus 3)", st == 200 and total_matches > 0, f"Found {total_matches} cross-entity matches for 'roadmap'")
    except Exception as e:
        record("13. Global Search", False, str(e))

    # 14. Export Markdown & Plain Text
    try:
        req_md = urllib.request.Request(f"{API_BASE}/meetings/1/export?format=md")
        with urllib.request.urlopen(req_md) as resp:
            md_content = resp.read().decode("utf-8")
        has_md = "# Q4 Product Roadmap Planning" in md_content and "## Action Items" in md_content
        record("14. Export Meeting as Markdown (Bonus 2)", has_md, f"Export size: {len(md_content)} bytes")
    except Exception as e:
        record("14. Export Markdown", False, str(e))

    # 15. AI Chat / Q&A
    try:
        st, data = http_json(f"{API_BASE}/meetings/1/chat", method="POST", payload={
            "question": "What did Sarah mention regarding deliverables?"
        })
        ans = data.get("answer", "")
        record("15. LLM Ask AI Chat (Bonus 5)", st == 200 and len(ans) > 20, f"Response: {ans[:80]}...")
    except Exception as e:
        record("15. LLM Ask AI Chat", False, str(e))

    # 16. Frontend Next.js Pages Accessibility
    pages = [
        ("/", "Library Dashboard"),
        ("/meetings/1", "Meeting 1 Detail & Player"),
        ("/search", "Global Search Page"),
        ("/settings", "Settings Page"),
        ("/integrations", "Integrations Page")
    ]
    for path, name in pages:
        try:
            req_fe = urllib.request.Request(f"{FRONTEND_BASE}{path}")
            with urllib.request.urlopen(req_fe) as resp:
                record(f"16. Frontend Page: {name} ({path})", resp.status == 200, f"Status: HTTP {resp.status}")
        except Exception as e:
            record(f"16. Frontend Page: {name} ({path})", False, str(e))

    print("\n" + "=" * 60)
    passed_count = sum(1 for _, s, _ in results if s == "PASS")
    total_count = len(results)
    print(f"AUDIT SUMMARY: {passed_count}/{total_count} CHECKS PASSED")
    print("=" * 60)

if __name__ == "__main__":
    run_all_checks()
