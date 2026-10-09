import os
import asyncio
import httpx
from dotenv import load_dotenv

load_dotenv()
load_dotenv(dotenv_path="../.env")
load_dotenv(dotenv_path="/Users/sonali/Desktop/Scaler_AI/.env")

async def test():
    key = os.getenv("OPENAI_API_KEY", "").strip()
    print("Key present:", bool(key), "Prefix:", key[:10] if key else "None")
    
    async with httpx.AsyncClient(timeout=15.0) as client:
        try:
            res = await client.post(
                "https://api.openai.com/v1/audio/speech",
                headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
                json={
                    "model": "tts-1",
                    "voice": "alloy",
                    "input": "Hello world from Fireflies clone",
                    "response_format": "mp3"
                }
            )
            print("Status code:", res.status_code)
            if res.status_code == 200:
                print("TTS Success! Received bytes:", len(res.content))
            else:
                print("Error body:", res.text)
        except Exception as e:
            print("Exception:", e)

if __name__ == "__main__":
    asyncio.run(test())
