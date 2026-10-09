# 🔥 Fireflies.ai Clone — Meeting Intelligence Platform

An enterprise-grade meeting intelligence platform that transcribes, summarizes, and extracts actionable insights from audio recordings with **real-time synchronized audio playback**, **AI-generated summaries**, and **action item tracking**.

Built with **Next.js 14 (App Router)**, **TypeScript**, **Tailwind CSS**, **FastAPI**, **SQLAlchemy 2.0**, and **SQLite**.

---

## ✨ Key Features

- 🎧 **Synchronized Playback Engine**: Pluggable playback engine featuring both real HTML5 audio support and an elapsed-time **Simulated Clock Engine** powered by `performance.now()`. Immune to background-tab timer throttling.
- 🗣 **Microsoft Edge Neural Voice Synthesis**: 100% free, multi-speaker neural voice generation (zero API keys needed). Automatically assigns unique neural voice personas to each meeting participant with frame-exact speech alignment.
- ⚡ **Bidirectional Sync & Click-to-Speak**: Active transcript segments are tracked in $O(\log N)$ via binary search. Clicking ANY transcript box, chapter pill, or chat timestamp instantly seeks playback and starts speaking from that exact dialogue turn.
- 🤖 **AI Executive Summaries & Chapters**: Auto-generates structured executive summaries, key discussion topics, clickable chapter markers, and action items with speaker attribution.
- 💬 **Interactive Meeting Q&A ("Ask AI")**: Context-aware meeting chatbot that answers questions, identifies roles, extracts commitments, and provides clickable timestamp badges linked to audio playback.
- ⏱ **Resilient AI Pipeline**: LLM calls support Groq/OpenAI with automatic offline heuristic fallback so meeting creation and summaries never fail.
- 🔍 **In-Transcript & Global Search**: Real-time search with match counters ("3 of 12"), next/previous navigation, and XSS-safe text highlights.
- 👥 **Many-to-Many Participants**: Unified participant directory across meetings. Friendly participant unlinking in service layer with confirmation dialogs.
- 📁 **Multi-Format Transcript Ingestion**: Upload `.vtt`, `.txt`, or `.json` transcripts, or paste raw text. Includes streaming 2MB size enforcement and automatic word-count timestamp synthesis for un-timestamped text.
- 🎨 **Fireflies Design System**: Polished dark/light modes, Radix UI accessible dialogs, speaker avatar color hashing, and responsive mobile/tablet layouts.

---

## 🏛 Architecture & Tech Stack

```
Browser (Next.js 14 App Router + TypeScript + Tailwind CSS)
  pages -> components -> hooks -> api client (typed fetch)
                              |
                        REST / JSON
                              |
FastAPI (Python 3.11)
  routers (HTTP only) -> services (business logic) -> models (SQLAlchemy 2.0) -> SQLite
                              |
                          ai_service (LLM with 10s timeout or mock fallback)
```

| Layer | Technology | Rationale |
|---|---|---|
| **Frontend** | Next.js 14 (App Router), TypeScript, Tailwind CSS | Client-side reactive audio syncing, typed API client, and fast responsive UI |
| **Backend** | FastAPI, Pydantic v2, SQLAlchemy 2.0 | High-performance async Python, automated OpenAPI `/docs`, strong validation |
| **Database** | SQLite with Foreign Keys Enforced | Required by brief. `PRAGMA foreign_keys=ON` listener enforced on every connection |
| **TTS Engine** | Microsoft Edge Neural Voice | Zero-cost multi-speaker neural voice generation with frame-exact synchronization |
| **Playback** | Custom `PlaybackEngine` interface | Pluggable `SimulatedEngine` and `AudioEngine` sharing unified sync hooks |

### 🗄 Relational Database Schema (3NF Normalized)

```
meetings            1     ─── *     transcript_segments   (CASCADE on delete)
meetings            1     ─── *     chapters              (CASCADE on delete)
meetings            1     ─── 0..1  summaries             (CASCADE on delete, unique FK)
meetings            1     ─── *     action_items          (CASCADE on delete)
meetings            *     ─── *     participants          (via meeting_participants join table)
meetings            *     ─── *     tags                  (via meeting_tags join table)
participants        0..1  ─── *     transcript_segments   (speaker_id FK, SET NULL on delete)
participants        0..1  ─── *     action_items          (assignee_id FK, SET NULL on delete)
transcript_segments 1     ─── *     comments              (segment_id FK, CASCADE on delete) [Bonus]
```

---

## 🚀 Getting Started

### Prerequisites
- Python 3.11+
- Node.js 18+ (or Node 20+)

### 1. Backend Setup

```bash
cd backend

# Create virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install fastapi "uvicorn[standard]" "sqlalchemy>=2.0" pydantic python-multipart pytest httpx python-dotenv

# Run backend development server (automatically seeds 6 realistic meetings on startup)
uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```

The FastAPI backend will start at `http://127.0.0.1:8000` (API documentation available at `http://127.0.0.1:8000/docs`).

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start Next.js development server
npm run dev -- -p 3000
```

Open `http://localhost:3000` in your browser.

---

## 🧪 Running Tests

The backend includes a comprehensive pytest suite covering CRUD operations, cascade deletions, VTT/TXT/JSON parsers, timestamp synthesis, streaming upload limits, and participant unlinking:

```bash
PYTHONPATH=. backend/.venv/bin/pytest backend/tests/test_api.py -v
```

---

## 📊 Database Schema & ER Diagram

```
meetings            1 --- *  transcript_segments
meetings            1 --- *  chapters
meetings            1 --- 0..1 summaries
meetings            1 --- *  action_items
meetings            * --- *  participants           (via meeting_participants)
participants        1 --- *  transcript_segments    (speaker_id FK, SET NULL on delete)
participants        1 --- *  action_items           (assignee_id FK, SET NULL on delete)
meetings            * --- *  tags                   (via meeting_tags)
transcript_segments 1 --- *  comments               [bonus]
```

### Architectural Decisions:
1. **Many-to-Many Participants**: Participants are modeled in a dedicated table and linked via `meeting_participants` join table so the same individual (e.g., Sarah Chen) can appear across multiple meetings without duplicating records.
2. **Normalized Transcript Segments**: Segments are stored as individual database rows rather than a monolithic JSON blob, enabling direct indexation, per-segment commenting, and fast search.
3. **SQLite Foreign Key Enforcement**: SQLite turns off foreign keys by default. We configure a SQLAlchemy connection event listener (`PRAGMA foreign_keys=ON`) ensuring strict referential integrity.
4. **Friendly Participant Removal**: When a participant is unlinked from a meeting, service code sets `speaker_id` and `assignee_id` to `NULL` for that meeting's records while retaining `speaker_label` so the transcript remains legible.

---

## 📡 API Reference

Base path: `/api`

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/meetings` | List meetings with search (`q`), `participant_id`, `tag`, `date_from`, `date_to`, `sort`, and pagination |
| `POST` | `/api/meetings` | Create meeting (Form or pasted transcript text with auto-generation) |
| `POST` | `/api/meetings/upload` | Multipart file upload (`.vtt`, `.txt`, `.json`) with 2MB streaming limit |
| `GET` | `/api/meetings/{id}` | Get meeting details, participants, summary, chapters, and action items |
| `PATCH` | `/api/meetings/{id}` | Update title, date, participants (with friendly unlinking), tags |
| `DELETE` | `/api/meetings/{id}` | Delete meeting (cascades all child rows) |
| `GET` | `/api/meetings/{id}/transcript` | Get all transcript segments ordered by position |
| `GET` | `/api/meetings/{id}/summary` | Get AI summary overview, keywords, and chapters |
| `POST` | `/api/meetings/{id}/summary/regenerate` | Re-run AI summary without overwriting manual action items |
| `GET` | `/api/meetings/{id}/action-items` | List action items for a meeting |
| `POST` | `/api/meetings/{id}/action-items` | Create action item (assignee must belong to meeting) |
| `PATCH` | `/api/action-items/{id}` | Flat route: edit text, assignee, due date, completion status |
| `DELETE` | `/api/action-items/{id}` | Delete action item |
| `GET` | `/api/participants` | List all participants across workspace |
| `GET` | `/api/tags` | List all tags |
| `POST` | `/api/tags` | Create a new tag |
| `GET` | `/api/search?q=&type=` | Global search across titles, transcripts, summaries, and action items |
| `GET` | `/api/meetings/{id}/export?format=md\|txt` | Download Markdown or TXT summary export |
| `POST` | `/api/meetings/{id}/chat` | Ask questions about the meeting with transcript citations |
| `GET` | `/api/health` | Health check endpoint for deployment monitoring |

---

## 💡 Key Design Decisions & Interview Notes

1. **Why `performance.now()` for Simulated Clock?**
   Frame accumulation in `requestAnimationFrame` drifts when browser tabs are placed in the background or throttled. By computing `currentTime = startOffset + (performance.now() - startedAt) / 1000`, playback time remains exact regardless of tab focus.
2. **Why `TranscriptLine` Memoization with `isActive: boolean`?**
   Passing raw `currentTime` to 80+ transcript lines would cause all lines to re-render on every animation frame (60fps). Passing `isActive: boolean` ensures only the outgoing and incoming active lines re-render.
3. **How is Active Segment Found in $O(\log N)$?**
   `findActiveSegmentIndex` uses binary search over ordered `start_sec` values instead of a linear scan, providing sub-millisecond lookup even for hour-long transcripts.
4. **How Does Optimistic Action Item Completion Work?**
   The UI immediately reflects the checkbox state and calculates updated progress percentages. If the network request fails, state automatically rolls back and displays an error toast.
5. **How is XSS Prevented in Transcript Highlighting?**
   `highlightText` splits transcript text into native React nodes (`<mark>` and text nodes) rather than using `dangerouslySetInnerHTML`. Special regex characters in search queries are safely escaped.

---

## 🚀 Deployment Guide (Render / Railway & Vercel)

### 🗂 Seeded Meetings Roster (Pre-Synthesized & Aligned)

| ID | Meeting Title | Duration | Segments | Audio Status |
|---|---|---|---|---|
| **1** | Q4 Product Roadmap Planning | **11m 20s** (680s) | 76 turns | 🎙 Pre-synthesized Neural MP3 |
| **2** | Engineering Sprint Retrospective | **6m 44s** (404s) | 51 turns | 🎙 Pre-synthesized Neural MP3 |
| **3** | Client Onboarding — Acme Corp | **5m 37s** (337s) | 44 turns | 🎙 Pre-synthesized Neural MP3 |
| **4** | Weekly Marketing Sync | **4m 08s** (248s) | 35 turns | 🎙 Pre-synthesized Neural MP3 |
| **5** | Design Review: Dashboard Redesign | **7m 18s** (438s) | 60 turns | 🎙 Pre-synthesized Neural MP3 |
| **6** | Investor Update Call | **8m 52s** (532s) | 68 turns | 🎙 Pre-synthesized Neural MP3 |

---

## 🚀 Deployment Guide (Render / Railway & Vercel)

### 1. Backend Deployment (Render / Railway)
- **Runtime**: Python 3.11+
- **Root Directory**: `.` (Repository root)
- **Build Command**: `pip install -r backend/requirements.txt`
- **Start Command**: `uvicorn backend.app.main:app --host 0.0.0.0 --port $PORT`
- **Environment Variables**:
  ```ini
  PYTHON_VERSION=3.11
  DATABASE_URL=sqlite:///./fireflies.db
  CORS_ORIGINS=https://your-frontend.vercel.app,http://localhost:3000
  GROQ_API_KEY=your_groq_api_key_optional
  OPENAI_API_KEY=your_openai_api_key_optional
  ```
- **Health Verification**: Verify `GET /api/health` returns `{"status": "ok", "database": "connected"}` and `GET /api/meetings` returns the 6 seeded meetings on startup.
- **Idempotent Seeding**: The backend startup lifecycle checks `db.query(Meeting).count() == 0` before seeding, preventing duplicate entries on server restarts.

### 2. Frontend Deployment (Vercel)
- **Framework Preset**: Next.js
- **Root Directory**: `frontend`
- **Build Command**: `npm run build`
- **Output Directory**: `.next`
- **Environment Variables**:
  ```ini
  NEXT_PUBLIC_API_URL=https://your-backend.onrender.com/api
  ```
- **CORS Verification**: Open the browser Developer Console on your deployed Vercel site and confirm requests to `/api/meetings` return without CORS header errors.

---

## ⚠️ Persistence & Known Limitations

1. **Free-Tier Cold Starts (30-60 seconds)**:
   Free-tier containers on Render spin down when idle. The first request after a period of inactivity may take 30 to 60 seconds to wake up. The frontend automatically shows skeleton loaders during this initial boot.
2. **Ephemeral Disks on Free Tier Hosts**:
   On free-tier serverless hosting (e.g. standard Render free tier), the local container filesystem resets when the instance sleeps. The 6 core seed meetings and their audio tracks (`meeting_1.mp3` through `meeting_6.mp3`) are tracked in Git and will always exist on boot. Any user-created meetings or new audio files generated at runtime will reset upon container restart unless a **Render Persistent Disk Volume** is mounted at `sqlite:////data/fireflies.db` (available on paid plans).
3. **Audio File Retention**:
   Generated MP3 audio files are saved to `backend/app/static/audio/`. In serverless/stateless container environments, configure object storage (e.g. AWS S3 or Cloudflare R2) if audio files created dynamically at runtime need to persist across container rebuilds.

---

## 📄 License
MIT License
