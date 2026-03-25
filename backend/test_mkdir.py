from pathlib import Path

d = Path("D:\\AI-Generated-Files\\video-downloader\\backend\\downloads")
print(f"Exists: {d.exists()}")
print(f"Is dir: {d.is_dir()}")

sub = d / "test456"
print(f"Creating: {sub}")
try:
    sub.mkdir(parents=True, exist_ok=True)
    print(f"Success: {sub.exists()}")
except Exception as e:
    print(f"Error: {e}")
