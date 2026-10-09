import asyncio
import edge_tts

async def test():
    text = "Good morning team. Today we are reviewing the enterprise security rollout and our compliance milestones."
    voice = "en-US-JennyNeural"
    communicate = edge_tts.Communicate(text, voice)
    await communicate.save("backend/app/static/audio/test_edge.mp3")
    print("Edge TTS generation success! Saved test_edge.mp3")

if __name__ == "__main__":
    asyncio.run(test())
