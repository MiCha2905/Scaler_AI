import re
import json
from typing import List, Dict, Any, Tuple


class ParseError(Exception):
    pass


def parse_timestamp_str(ts_str: str) -> float:
    """Parses timestamps in formats like '00:01:23.456', '01:23.456', '01:23' into seconds."""
    ts_str = ts_str.strip().replace(",", ".")
    parts = ts_str.split(":")
    try:
        if len(parts) == 3:
            h = float(parts[0])
            m = float(parts[1])
            s = float(parts[2])
            return round(h * 3600 + m * 60 + s, 3)
        elif len(parts) == 2:
            m = float(parts[0])
            s = float(parts[1])
            return round(m * 60 + s, 3)
        elif len(parts) == 1:
            return round(float(parts[0]), 3)
    except ValueError:
        raise ParseError(f"Invalid timestamp format: {ts_str}")
    raise ParseError(f"Unrecognized timestamp format: {ts_str}")


def synthesize_timestamps(raw_segments: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Synthesizes start_sec and end_sec for segments lacking timestamps at ~150 wpm (~2.5 words/sec)."""
    current_time = 0.0
    result = []
    for i, seg in enumerate(raw_segments):
        text = seg["text"].strip()
        word_count = max(1, len(text.split()))
        # ~150 words per minute = 2.5 words per second -> duration = word_count / 2.5
        duration = max(2.5, round(word_count / 2.5, 2))
        start_sec = current_time
        end_sec = round(start_sec + duration, 2)
        current_time = end_sec

        result.append({
            "speaker_label": seg.get("speaker_label") or "Speaker",
            "text": text,
            "start_sec": start_sec,
            "end_sec": end_sec,
            "position": i
        })
    return result


def parse_vtt(content: str) -> List[Dict[str, Any]]:
    """Parses a WebVTT file into transcript segments."""
    lines = content.strip().splitlines()
    if not lines or not lines[0].strip().startswith("WEBVTT"):
        raise ParseError("Missing WEBVTT header")

    segments: List[Dict[str, Any]] = []
    i = 1
    cue_pattern = re.compile(
        r"((?:\d{2}:)?\d{2}:\d{2}[\.,]\d{3})\s*-->\s*((?:\d{2}:)?\d{2}:\d{2}[\.,]\d{3})"
    )

    while i < len(lines):
        line = lines[i].strip()
        if not line or line.startswith("NOTE"):
            i += 1
            continue

        # Optional cue identifier line
        match = cue_pattern.search(line)
        if not match:
            # Check next line
            if i + 1 < len(lines):
                match = cue_pattern.search(lines[i + 1].strip())
                if match:
                    i += 1

        if match:
            start_sec = parse_timestamp_str(match.group(1))
            end_sec = parse_timestamp_str(match.group(2))
            i += 1

            # Collect text lines for this cue
            cue_text_lines = []
            while i < len(lines) and lines[i].strip() and not cue_pattern.search(lines[i]):
                cue_text_lines.append(lines[i].strip())
                i += 1

            raw_cue_text = " ".join(cue_text_lines).strip()
            if not raw_cue_text:
                continue

            # Extract speaker if present: <v Speaker Name>Text or Speaker Name: Text
            speaker_label = "Speaker"
            text = raw_cue_text

            v_match = re.match(r"<v\s+([^>]+)>(.*)", raw_cue_text, re.DOTALL)
            if v_match:
                speaker_label = v_match.group(1).strip()
                text = v_match.group(2).replace("</v>", "").strip()
            else:
                colon_match = re.match(r"^([A-Za-z0-9\s._'-]{1,40}):\s*(.+)$", raw_cue_text, re.DOTALL)
                if colon_match:
                    speaker_label = colon_match.group(1).strip()
                    text = colon_match.group(2).strip()

            segments.append({
                "speaker_label": speaker_label,
                "text": text,
                "start_sec": start_sec,
                "end_sec": max(end_sec, start_sec + 0.5),
                "position": len(segments)
            })
        else:
            i += 1

    if not segments:
        raise ParseError("No valid cues found in WebVTT content")

    return segments


def parse_json_transcript(content: str) -> List[Dict[str, Any]]:
    """Parses JSON transcript matching { "segments": [ ... ] } or [ ... ]."""
    try:
        data = json.loads(content)
    except Exception as e:
        raise ParseError(f"Invalid JSON format: {str(e)}")

    raw_list = []
    if isinstance(data, dict):
        if "segments" in data and isinstance(data["segments"], list):
            raw_list = data["segments"]
        else:
            raise ParseError("JSON must contain a 'segments' array")
    elif isinstance(data, list):
        raw_list = data
    else:
        raise ParseError("Invalid JSON structure for transcript")

    if not raw_list:
        raise ParseError("Transcript segment list is empty")

    segments: List[Dict[str, Any]] = []
    needs_synthesis = False

    for i, item in enumerate(raw_list):
        if not isinstance(item, dict):
            raise ParseError(f"Segment item at index {i} must be a JSON object")

        speaker = item.get("speaker") or item.get("speaker_label") or "Speaker"
        text = item.get("text") or ""
        if not text.strip():
            continue

        start_sec = item.get("start_sec")
        end_sec = item.get("end_sec")

        if start_sec is None or end_sec is None:
            needs_synthesis = True

        segments.append({
            "speaker_label": str(speaker).strip(),
            "text": str(text).strip(),
            "start_sec": float(start_sec) if start_sec is not None else 0.0,
            "end_sec": float(end_sec) if end_sec is not None else 0.0,
            "position": i
        })

    if not segments:
        raise ParseError("No non-empty segments found in JSON")

    if needs_synthesis:
        return synthesize_timestamps(segments)

    # Validate end >= start
    for seg in segments:
        if seg["end_sec"] < seg["start_sec"]:
            seg["end_sec"] = seg["start_sec"] + 1.0

    return segments


def parse_txt(content: str) -> List[Dict[str, Any]]:
    """
    Parses plain text with lines like:
      [00:12] Alice: Let's get started.
      [00:12 - 00:45] Alice: Let's get started.
      Alice: Let's get started.
    """
    lines = [line.strip() for line in content.splitlines() if line.strip()]
    if not lines:
        raise ParseError("Text content is empty")

    raw_segments: List[Dict[str, Any]] = []
    has_any_timestamps = False

    # Regex patterns for timestamp prefixes
    # Pattern 1: [00:12 - 00:45] Speaker: Text
    range_pattern = re.compile(
        r"^\[\s*((?:\d{1,2}:)?\d{2}:\d{2})\s*-\s*((?:\d{1,2}:)?\d{2}:\d{2})\s*\]\s*(?:([A-Za-z0-9\s._'-]{1,40}):)?\s*(.+)$"
    )
    # Pattern 2: [00:12] Speaker: Text
    single_pattern = re.compile(
        r"^\[\s*((?:\d{1,2}:)?\d{2}:\d{2})\s*\]\s*(?:([A-Za-z0-9\s._'-]{1,40}):)?\s*(.+)$"
    )
    # Pattern 3: Speaker: Text
    speaker_only_pattern = re.compile(
        r"^([A-Za-z0-9\s._'-]{1,40}):\s*(.+)$"
    )

    current_speaker = "Speaker"

    for i, line in enumerate(lines):
        m_range = range_pattern.match(line)
        if m_range:
            has_any_timestamps = True
            start_s = parse_timestamp_str(m_range.group(1))
            end_s = parse_timestamp_str(m_range.group(2))
            speaker = m_range.group(3) or current_speaker
            text = m_range.group(4).strip()
            current_speaker = speaker.strip()
            raw_segments.append({
                "speaker_label": current_speaker,
                "text": text,
                "start_sec": start_s,
                "end_sec": max(end_s, start_s + 1.0),
                "position": len(raw_segments)
            })
            continue

        m_single = single_pattern.match(line)
        if m_single:
            has_any_timestamps = True
            start_s = parse_timestamp_str(m_single.group(1))
            speaker = m_single.group(2) or current_speaker
            text = m_single.group(3).strip()
            current_speaker = speaker.strip()
            raw_segments.append({
                "speaker_label": current_speaker,
                "text": text,
                "start_sec": start_s,
                "end_sec": start_s + 5.0,  # placeholder before fixing below
                "position": len(raw_segments)
            })
            continue

        m_speaker = speaker_only_pattern.match(line)
        if m_speaker:
            speaker = m_speaker.group(1).strip()
            text = m_speaker.group(2).strip()
            current_speaker = speaker
            raw_segments.append({
                "speaker_label": current_speaker,
                "text": text,
                "start_sec": None,
                "end_sec": None,
                "position": len(raw_segments)
            })
            continue

        # Plain unformatted line
        raw_segments.append({
            "speaker_label": current_speaker,
            "text": line,
            "start_sec": None,
            "end_sec": None,
            "position": len(raw_segments)
        })

    if not raw_segments:
        raise ParseError("Could not extract any transcript segments from text")

    if not has_any_timestamps:
        return synthesize_timestamps(raw_segments)

    # If some lines had single timestamps, chain them cleanly
    for idx in range(len(raw_segments)):
        seg = raw_segments[idx]
        if seg["start_sec"] is None:
            prev_end = raw_segments[idx - 1]["end_sec"] if idx > 0 else 0.0
            seg["start_sec"] = prev_end
            seg["end_sec"] = prev_end + max(2.5, len(seg["text"].split()) / 2.5)
        else:
            if idx + 1 < len(raw_segments) and raw_segments[idx + 1]["start_sec"] is not None:
                next_start = raw_segments[idx + 1]["start_sec"]
                if next_start > seg["start_sec"]:
                    seg["end_sec"] = next_start
            if seg["end_sec"] <= seg["start_sec"]:
                seg["end_sec"] = seg["start_sec"] + max(2.5, len(seg["text"].split()) / 2.5)

    return raw_segments


def parse_pasted_transcript(text_content: str) -> List[Dict[str, Any]]:
    """Format rule: if text starts with WEBVTT, parse as VTT; otherwise parse as TXT."""
    stripped = text_content.strip()
    if not stripped:
        return []
    if stripped.startswith("WEBVTT"):
        return parse_vtt(stripped)
    elif stripped.startswith("{") or stripped.startswith("["):
        try:
            return parse_json_transcript(stripped)
        except ParseError:
            return parse_txt(stripped)
    else:
        return parse_txt(stripped)
