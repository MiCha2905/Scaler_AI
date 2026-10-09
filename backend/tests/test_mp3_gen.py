import os

def test_mp3():
    frame_header = bytes([0xFF, 0xFB, 0x90, 0x64])
    frame_body = bytes(413)
    frame = frame_header + frame_body
    num_frames = int(30 * 38.28125) # 30 seconds
    
    out_path = "backend/app/static/audio/test_demo.mp3"
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, "wb") as f:
        for _ in range(num_frames):
            f.write(frame)
            
    print("Created test MP3, size:", os.path.getsize(out_path))

if __name__ == "__main__":
    test_mp3()
