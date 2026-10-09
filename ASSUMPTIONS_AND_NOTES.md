# 📌 Assumptions, Mocked Data & Technical Notes

---

### 1. Assumptions
* **User Identity Context**: The active user is assumed to be **Sarah Chen** (*Product Lead & Host*). AI role and task queries (e.g., *"What is my role?"*) ground directly to Sarah's commitments.
* **Audio & Transcript Duration Invariant**: Meeting duration is calculated as $\text{duration\_sec} = \lceil\max(\text{end\_sec})\rceil$. The seek bar, countdown badge, and audio reach completion simultaneously with zero drift ($< 0.5\,\text{s}$).
* **Dual-Engine Playback**: Meetings with audio use **HTML5 Audio Byte-Range Streaming** (`HTTP 206 Partial Content`), while un-synthesized raw transcripts fall back to a zero-drift `performance.now()` **Simulated Clock Engine**.
* **3NF Database with Enforced Cascades**: Built on SQLite with an explicit `PRAGMA foreign_keys=ON` hook to guarantee strict referential integrity and automatic cascade deletion for segments, comments, chapters, and summaries.

---

### 2. Mocked & Synthetic Data
* **6 Seeded Enterprise Meetings**: Stored in `backend/app/seeds/seeded_meetings.json` with realistic multi-speaker dialogues, speaker personas, chapters, tags, and action items.
* **Multi-Speaker Neural Audio**: Pre-generated MP3 audio files (`meeting_1.mp3`–`meeting_6.mp3`) synthesized with Microsoft Edge Neural Voices (`en-US-JennyNeural`, `en-US-GuyNeural`, etc.) with millisecond-exact transcript alignment.
* **Deterministic AI Heuristic Fallback**: If no `GROQ_API_KEY` or `OPENAI_API_KEY` is provided, built-in NLP heuristics extract summaries, keywords, chapters, and action items so tests, seeding, and UI features function without external dependencies.

---

### 3. Technical Notes & Deployment Constraints
* **Render Free-Tier Cold Starts**: Free-tier backend containers sleep after inactivity and take ~30–50s to wake up on the first request. The frontend includes skeleton loaders during boot.
* **Ephemeral Storage**: Free-tier Render disks are ephemeral. The 6 core seed meetings and neural audio tracks are tracked in Git and re-seed on boot. User-created meetings persist across the active session but reset on container restart unless a persistent disk volume is mounted.
* **Dynamic CORS**: FastAPI backend includes dynamic regex CORS allowing `http://localhost:*` and `https://*.vercel.app` domains without manual configuration.
