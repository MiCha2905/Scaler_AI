import os
import re
import json
import asyncio
from typing import List, Dict, Any, Optional
import httpx
from dotenv import load_dotenv

load_dotenv()
load_dotenv(dotenv_path="../.env")

GROQ_MODELS = [
    "openai/gpt-oss-120b",
    "openai/gpt-oss-20b",
    "qwen/qwen3.8-27b",
    "llama-3.1-8b-instant",
    "llama3-70b-8192",
    "mixtral-8x7b-32768",
]

OPENAI_MODELS = [
    "gpt-4o-mini",
    "gpt-4o",
]

STOP_WORDS = {
    "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "with",
    "by", "about", "against", "between", "into", "through", "during", "before",
    "after", "above", "below", "from", "up", "down", "of", "off", "over", "under",
    "again", "further", "then", "once", "here", "there", "when", "where", "why",
    "how", "all", "any", "both", "each", "few", "more", "most", "other", "some",
    "such", "no", "nor", "not", "only", "own", "same", "so", "than", "too", "very",
    "s", "t", "can", "will", "just", "don", "should", "now", "d", "ll", "m", "o",
    "re", "ve", "y", "ain", "aren", "couldn", "didn", "doesn", "hadn", "hasn",
    "haven", "isn", "ma", "mightn", "mustn", "needn", "shan", "shouldn", "wasn",
    "weren", "won", "wouldn", "i", "me", "my", "myself", "we", "our", "ours",
    "ourselves", "you", "your", "yours", "yourself", "yourselves", "he", "him",
    "his", "himself", "she", "her", "hers", "herself", "it", "its", "itself",
    "they", "them", "their", "theirs", "themselves", "what", "which", "who", "whom",
    "this", "that", "these", "those", "am", "is", "are", "was", "were", "be",
    "been", "being", "have", "has", "had", "having", "do", "does", "did", "doing",
    "like", "yeah", "okay", "think", "know", "going", "really", "right", "good",
    "well", "also", "get", "got", "see", "make", "sure", "let"
}


def extract_mock_keywords(segments: List[Dict[str, Any]]) -> List[str]:
    all_text = " ".join(seg.get("text", "") for seg in segments).lower()
    words = re.findall(r"\b[a-z]{3,20}\b", all_text)
    freq: Dict[str, int] = {}
    for w in words:
        if w not in STOP_WORDS:
            freq[w] = freq.get(w, 0) + 1

    sorted_words = [w for w, count in sorted(freq.items(), key=lambda x: x[1], reverse=True) if count >= 2]
    keywords = sorted_words[:10]
    if len(keywords) < 4:
        keywords = [w for w, _ in sorted(freq.items(), key=lambda x: x[1], reverse=True)[:8]]
    return keywords


def extract_mock_summary(segments: List[Dict[str, Any]], meeting_title: str) -> str:
    if not segments:
        return f"Discussion regarding {meeting_title}."
    if len(segments) == 1:
        return segments[0]["text"].strip()
    opening = " ".join(seg["text"].strip() for seg in segments[:min(2, len(segments))])
    if len(segments) > 2:
        closing = segments[-1]["text"].strip()
        return f"Meeting commenced with: \"{opening}\". The group concluded with key next steps: \"{closing}\"."
    return opening


def extract_mock_chapters(segments: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    if not segments:
        return []
    count = len(segments)
    num_chapters = min(6, max(3, count // 10))
    if count < 3:
        num_chapters = count
    step = max(1, count // num_chapters)
    chapters = []
    for i in range(num_chapters):
        seg_idx = min(i * step, count - 1)
        seg = segments[seg_idx]
        title_raw = seg["text"].strip().split(".")[0].split("?")[0].split("!")[0]
        title = title_raw.strip() or f"Topic {i+1}"
        if len(title) > 60:
            title = title[:57] + "..."
        chapters.append({
            "title": title,
            "description": f"Discussion led by {seg.get('speaker_label', 'Speaker')} starting at {int(seg['start_sec'])}s.",
            "start_sec": seg["start_sec"],
            "position": i
        })
    return chapters


def extract_mock_action_items(segments: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    triggers = [
        r"\b(?:i'll|i will)\s+([^\.\?\!\n]+)",
        r"\b(?:we should|we need to|let's)\s+([^\.\?\!\n]+)",
        r"\b(?:action item|follow up on|will do)\s+([^\.\?\!\n]+)",
        r"\b(?:need to)\s+([^\.\?\!\n]+)"
    ]
    compiled = [re.compile(t, re.IGNORECASE) for t in triggers]
    action_items = []
    seen = set()

    for seg in segments:
        text = seg.get("text", "")
        for pattern in compiled:
            match = pattern.search(text)
            if match:
                raw_item = match.group(0).strip()
                clean_item = raw_item[0].upper() + raw_item[1:]
                if len(clean_item) > 120:
                    clean_item = clean_item[:117] + "..."
                key = clean_item.lower()[:30]
                if key not in seen:
                    seen.add(key)
                    action_items.append({
                        "text": clean_item,
                        "assignee_id": seg.get("speaker_id"),
                        "speaker_label": seg.get("speaker_label"),
                        "due_date": None,
                        "is_completed": False
                    })
                if len(action_items) >= 5:
                    break
        if len(action_items) >= 5:
            break

    if not action_items and segments:
        last_seg = segments[-1]
        action_items.append({
            "text": f"Review meeting takeaways with {last_seg.get('speaker_label', 'team')}",
            "assignee_id": last_seg.get("speaker_id"),
            "speaker_label": last_seg.get("speaker_label"),
            "due_date": None,
            "is_completed": False
        })
    return action_items


async def generate_meeting_ai_data(
    meeting_title: str,
    segments: List[Dict[str, Any]]
) -> Dict[str, Any]:
    if not segments:
        return {
            "overview": None,
            "keywords": [],
            "chapters": [],
            "action_items": []
        }

    groq_key = os.getenv("GROQ_API_KEY", "").strip()
    openai_key = os.getenv("OPENAI_API_KEY", "").strip()

    if not groq_key and not openai_key:
        return {
            "overview": extract_mock_summary(segments, meeting_title),
            "keywords": extract_mock_keywords(segments),
            "chapters": extract_mock_chapters(segments),
            "action_items": extract_mock_action_items(segments)
        }

    transcript_formatted = "\n".join(
        f"[{int(s['start_sec'])}s] {s.get('speaker_label', 'Speaker')}: {s['text']}"
        for s in segments[:100]
    )
    prompt = f"""You are an executive AI meeting assistant for Fireflies.
Analyze this transcript for the meeting '{meeting_title}'.
Return a valid JSON object matching this exact schema:
{{
  "overview": "A clear, professional 2-3 paragraph summary of the discussions, decisions, and outcomes",
  "keywords": ["5 to 8 key discussion terms"],
  "chapters": [
    {{"title": "Short descriptive chapter title (max 50 chars)", "description": "1 sentence takeaway", "start_sec": <numeric start_sec from an actual segment>}}
  ],
  "action_items": [
    {{"text": "Actionable task description", "speaker_label": "Name of responsible speaker or null"}}
  ]
}}

Transcript:
{transcript_formatted}
"""

    async def call_groq():
        async with httpx.AsyncClient(timeout=8.0) as client:
            for model_name in GROQ_MODELS:
                try:
                    res = await client.post(
                        "https://api.groq.com/openai/v1/chat/completions",
                        headers={"Authorization": f"Bearer {groq_key}", "Content-Type": "application/json"},
                        json={
                            "model": model_name,
                            "response_format": {"type": "json_object"},
                            "messages": [
                                {"role": "system", "content": "You are an AI meeting assistant. Output valid JSON only."},
                                {"role": "user", "content": prompt}
                            ],
                            "temperature": 0.2
                        }
                    )
                    if res.status_code == 200:
                        return json.loads(res.json()["choices"][0]["message"]["content"])
                except Exception:
                    continue
            raise Exception("All Groq models failed")

    async def call_openai():
        async with httpx.AsyncClient(timeout=8.0) as client:
            for model_name in OPENAI_MODELS:
                try:
                    res = await client.post(
                        "https://api.openai.com/v1/chat/completions",
                        headers={"Authorization": f"Bearer {openai_key}", "Content-Type": "application/json"},
                        json={
                            "model": model_name,
                            "response_format": {"type": "json_object"},
                            "messages": [
                                {"role": "system", "content": "You are an AI meeting assistant. Output valid JSON only."},
                                {"role": "user", "content": prompt}
                            ],
                            "temperature": 0.2
                        }
                    )
                    if res.status_code == 200:
                        return json.loads(res.json()["choices"][0]["message"]["content"])
                except Exception:
                    continue
            raise Exception("OpenAI call failed")

    try:
        llm_result = None
        if groq_key:
            try:
                llm_result = await asyncio.wait_for(call_groq(), timeout=9.0)
            except Exception:
                pass

        if not llm_result and openai_key:
            try:
                llm_result = await asyncio.wait_for(call_openai(), timeout=9.0)
            except Exception:
                pass

        if not llm_result:
            raise Exception("No LLM response")

        overview = llm_result.get("overview") or extract_mock_summary(segments, meeting_title)
        keywords = llm_result.get("keywords") or extract_mock_keywords(segments)

        raw_chapters = llm_result.get("chapters") or []
        chapters = []
        for idx, ch in enumerate(raw_chapters):
            ch_start = float(ch.get("start_sec", 0.0))
            nearest_seg = min(segments, key=lambda s: abs(s["start_sec"] - ch_start))
            chapters.append({
                "title": str(ch.get("title", f"Chapter {idx+1}"))[:60],
                "description": ch.get("description"),
                "start_sec": nearest_seg["start_sec"],
                "position": idx
            })
        if not chapters:
            chapters = extract_mock_chapters(segments)

        speaker_map = {s.get("speaker_label", "").lower(): s.get("speaker_id") for s in segments if s.get("speaker_label")}
        action_items = []
        for ai in (llm_result.get("action_items") or [])[:6]:
            spk_label = ai.get("speaker_label")
            spk_id = speaker_map.get(spk_label.lower()) if spk_label else None
            action_items.append({
                "text": str(ai.get("text", "")).strip(),
                "assignee_id": spk_id,
                "speaker_label": spk_label,
                "due_date": None,
                "is_completed": False
            })
        if not action_items:
            action_items = extract_mock_action_items(segments)

        return {
            "overview": overview,
            "keywords": keywords,
            "chapters": chapters,
            "action_items": action_items
        }

    except Exception:
        return {
            "overview": extract_mock_summary(segments, meeting_title),
            "keywords": extract_mock_keywords(segments),
            "chapters": extract_mock_chapters(segments),
            "action_items": extract_mock_action_items(segments)
        }


def format_time_label(sec: float) -> str:
    s = int(sec)
    m = s // 60
    rem = s % 60
    return f"{m:02d}:{rem:02d}"


async def answer_meeting_chat_question(
    meeting_title: str,
    segments: List[Dict[str, Any]],
    question: str
) -> Dict[str, Any]:
    groq_key = os.getenv("GROQ_API_KEY", "").strip()
    openai_key = os.getenv("OPENAI_API_KEY", "").strip()

    q_lower = question.lower().strip()

    # Smart offline detection for identity and roles
    if not groq_key and not openai_key:
        if any(phrase in q_lower for phrase in ["who am i", "my role", "my responsibility", "what is my role", "what are my roles", "my tasks"]):
            sarah_segs = [s for s in segments if "sarah" in s.get("speaker_label", "").lower()]
            if sarah_segs:
                first_ts = format_time_label(sarah_segs[0].get("start_sec", 0))
                return {
                    "answer": f"You are logged in as **Sarah Chen** (Meeting Host & Product Lead).\n\n"
                              f"- **Role**: Facilitator and Product Lead for *{meeting_title}*.\n"
                              f"- **Key Responsibilities**: Leading roadmap alignment, coordinating cross-team milestones with engineering and design, and reviewing deliverable checkpoints ([{first_ts}]).",
                    "relevant_segments": [s["id"] for s in sarah_segs[:2] if "id" in s]
                }
            return {
                "answer": f"You are logged in as **Sarah Chen** (Meeting Host & Product Lead for *{meeting_title}*).",
                "relevant_segments": []
            }

        matching_segs = [s for s in segments if any(w in s["text"].lower() for w in q_lower.split() if len(w) > 3)]
        if matching_segs:
            top = matching_segs[:2]
            ts = format_time_label(top[0].get("start_sec", 0))
            return {
                "answer": f"Based on the transcript at [{ts}], this was discussed by {top[0]['speaker_label']}: \"{top[0]['text']}\"",
                "relevant_segments": [s["id"] for s in top if "id" in s]
            }
        return {
            "answer": f"The attendees reviewed core items for {meeting_title}.",
            "relevant_segments": []
        }

    transcript_formatted = "\n".join(
        f"[{format_time_label(s.get('start_sec', 0))}] {s.get('speaker_label', 'Speaker')}: {s['text']}"
        for s in segments[:100]
    )

    prompt = f"""You are an executive AI assistant for Fireflies.
Answer the user's question concisely, professionally, and accurately based ONLY on this meeting transcript for '{meeting_title}'.

Current User Context:
- The user interacting with this chat is **Sarah Chen** (Meeting Host / Product Lead).
- When the user asks 'Who am I?', 'What is my role?', 'What are my roles?', 'What are my responsibilities?', or 'What are my tasks?', answer specifically about Sarah Chen's role, contributions, and assignments in this meeting.

Formatting Rules:
1. Always format timestamps in standard [MM:SS] format (e.g. [00:07], [02:15]).
2. Use clean markdown formatting with bullet points and bold headers.
3. Keep answers structured, crisp, and easy to read.

Transcript:
{transcript_formatted}

Question: {question}
"""

    if groq_key:
        for model_name in GROQ_MODELS:
            try:
                async with httpx.AsyncClient(timeout=8.0) as client:
                    res = await client.post(
                        "https://api.groq.com/openai/v1/chat/completions",
                        headers={"Authorization": f"Bearer {groq_key}", "Content-Type": "application/json"},
                        json={
                            "model": model_name,
                            "messages": [
                                {"role": "system", "content": "You are a concise, factual meeting assistant. The current user is Sarah Chen. Format timestamps as [MM:SS]."},
                                {"role": "user", "content": prompt}
                            ],
                            "temperature": 0.2
                        }
                    )
                    if res.status_code == 200:
                        ans = res.json()["choices"][0]["message"]["content"]
                        return {"answer": ans, "relevant_segments": []}
            except Exception:
                continue

    if openai_key:
        for model_name in OPENAI_MODELS:
            try:
                async with httpx.AsyncClient(timeout=8.0) as client:
                    res = await client.post(
                        "https://api.openai.com/v1/chat/completions",
                        headers={"Authorization": f"Bearer {openai_key}", "Content-Type": "application/json"},
                        json={
                            "model": model_name,
                            "messages": [
                                {"role": "system", "content": "You are a concise, factual meeting assistant. The current user is Sarah Chen. Format timestamps as [MM:SS]."},
                                {"role": "user", "content": prompt}
                            ],
                            "temperature": 0.2
                        }
                    )
                    if res.status_code == 200:
                        ans = res.json()["choices"][0]["message"]["content"]
                        return {"answer": ans, "relevant_segments": []}
            except Exception:
                continue

    return {
        "answer": f"According to the meeting records for {meeting_title}, this topic was addressed in the agenda.",
        "relevant_segments": []
    }
