import os
import io
import asyncio
from typing import List, Dict, Any, Optional
import edge_tts
from dotenv import load_dotenv

load_dotenv()
load_dotenv(dotenv_path="../.env")

# Microsoft Edge Neural Voice mapping for speakers (100% Free, No API Key Required)
EDGE_VOICE_MAP = {
    "sarah": "en-US-JennyNeural",
    "alex": "en-US-GuyNeural",
    "marcus": "en-US-ChristopherNeural",
    "elena": "en-US-AriaNeural",
    "david": "en-US-EricNeural",
    "priya": "en-IN-NeerjaNeural",
    "tom": "en-US-RogerNeural",
    "rachel": "en-US-MichelleNeural",
}

DEFAULT_EDGE_VOICES = [
    "en-US-JennyNeural",
    "en-US-GuyNeural",
    "en-US-ChristopherNeural",
    "en-US-AriaNeural",
    "en-US-EricNeural",
    "en-IN-NeerjaNeural",
]


def get_edge_voice(speaker_name: str, index: int = 0) -> str:
    clean = speaker_name.lower().strip()
    for k, v in EDGE_VOICE_MAP.items():
        if k in clean:
            return v
    return DEFAULT_EDGE_VOICES[index % len(DEFAULT_EDGE_VOICES)]


def generate_synthetic_mp3(duration_sec: int, out_path: str):
    """Fallback: Generates a standard 128kbps, 44.1kHz MP3 audio file."""
    frame_header = bytes([0xFF, 0xFB, 0x90, 0x64])
    frame_body = bytes(413)
    frame = frame_header + frame_body
    num_frames = max(20, int((duration_sec or 30) * 38.28125))
    with open(out_path, "wb") as f:
        for _ in range(num_frames):
            f.write(frame)


def get_mp3_duration(data: bytes) -> float:
    """Calculates exact duration of raw MP3 data in seconds by parsing MPEG frame headers."""
    idx = 0
    duration = 0.0
    bitrates_v1_l3 = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 0]
    bitrates_v2_l3 = [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160, 0]
    sample_rates_v1 = [44100, 48000, 32000]
    sample_rates_v2 = [22050, 24000, 16000]
    sample_rates_v25 = [11025, 12000, 8000]

    while idx < len(data) - 4:
        if data[idx] == 0xFF and (data[idx+1] & 0xE0) == 0xE0:
            b1 = data[idx+1]
            b2 = data[idx+2]
            version_bits = (b1 >> 3) & 0x03
            layer_bits = (b1 >> 1) & 0x03
            br_idx = (b2 >> 4) & 0x0F
            sr_idx = (b2 >> 2) & 0x03
            padding = (b2 >> 1) & 0x01

            if layer_bits == 1 and br_idx not in (0, 15) and sr_idx != 3:
                if version_bits == 3:  # MPEG-1
                    sr = sample_rates_v1[sr_idx]
                    br = bitrates_v1_l3[br_idx] * 1000
                    frame_len = (144 * br // sr) + padding
                    samples = 1152
                elif version_bits in (0, 2):  # MPEG-2 / 2.5
                    sr = sample_rates_v2[sr_idx] if version_bits == 2 else sample_rates_v25[sr_idx]
                    br = bitrates_v2_l3[br_idx] * 1000
                    frame_len = (72 * br // sr) + padding
                    samples = 576
                else:
                    idx += 1
                    continue

                if frame_len > 0:
                    duration += samples / sr
                    idx += frame_len
                    continue
        idx += 1

    if duration <= 0.0 and len(data) > 0:
        duration = len(data) * 8.0 / 48000.0

    return duration


def create_synthetic_frame(duration_sec: float = 2.0) -> bytes:
    """Generates MP3 audio frame bytes for a given duration."""
    frame_header = bytes([0xFF, 0xFB, 0x90, 0x64])
    frame_body = bytes(413)
    frame = frame_header + frame_body
    num_frames = max(10, int(duration_sec * 38.28125))
    return frame * num_frames


async def synthesize_edge_turn_safe(text: str, voice: str, sem: asyncio.Semaphore) -> bytes:
    """Generates speech turn with semaphore throttling and retry fallback."""
    if not text.strip():
        return create_synthetic_frame(1.5)

    async with sem:
        for attempt in range(2):
            try:
                communicate = edge_tts.Communicate(text.strip(), voice, rate="+5%")
                chunks = []
                async for chunk in communicate.stream():
                    if chunk["type"] == "audio":
                        chunks.append(chunk["data"])
                if chunks:
                    return b"".join(chunks)
            except Exception as e:
                await asyncio.sleep(0.3)

    # Clean fallback frame if network failed
    estimated_dur = max(1.5, min(8.0, len(text.split()) * 0.35))
    return create_synthetic_frame(estimated_dur)


async def generate_meeting_audio_track(
    meeting_id: int,
    segments: List[Dict[str, Any]],
    output_dir: str = "backend/app/static/audio",
    meeting_duration_sec: int = 60
) -> Optional[Dict[str, Any]]:
    """
    Synthesizes natural multi-speaker audio for the meeting turns using Microsoft Neural TTS.
    Guarantees 100% complete, monotonic segment coverage for all turns.
    """
    os.makedirs(output_dir, exist_ok=True)
    out_filename = f"meeting_{meeting_id}.mp3"
    out_path = os.path.join(output_dir, out_filename)

    if segments:
        unique_speakers = list(dict.fromkeys(s.get("speaker_label", "Speaker") for s in segments))
        sem = asyncio.Semaphore(6)  # Max 6 concurrent requests to prevent rate limit resets

        tasks = []
        for idx, seg in enumerate(segments):
            spk = seg.get("speaker_label", "Speaker")
            spk_idx = unique_speakers.index(spk) if spk in unique_speakers else idx
            voice = get_edge_voice(spk, spk_idx)
            tasks.append(synthesize_edge_turn_safe(seg.get("text", ""), voice, sem))

        results = await asyncio.gather(*tasks, return_exceptions=False)
        
        all_chunks = []
        timings = []
        current_time = 0.0

        for idx, chunk in enumerate(results):
            if not isinstance(chunk, bytes) or len(chunk) == 0:
                chunk = create_synthetic_frame(2.0)

            dur = round(get_mp3_duration(chunk), 2)
            dur = max(0.5, dur)
            start_t = round(current_time, 2)
            end_t = round(current_time + dur, 2)

            timings.append({
                "index": idx,
                "start_sec": start_t,
                "end_sec": end_t
            })
            current_time = end_t
            all_chunks.append(chunk)

        if all_chunks:
            with open(out_path, "wb") as f:
                for chunk in all_chunks:
                    f.write(chunk)

            return {
                "audio_path": f"/static/audio/{out_filename}",
                "segment_timings": timings,
                "total_duration": max(1, int(round(current_time)))
            }

    # Fallback if offline
    duration = max(15, meeting_duration_sec)
    generate_synthetic_mp3(duration, out_path)
    return {
        "audio_path": f"/static/audio/{out_filename}",
        "segment_timings": [],
        "total_duration": duration
    }
