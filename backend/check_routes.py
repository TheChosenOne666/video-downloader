import sys
sys.path.insert(0, 'D:/AI-Generated-Files/video-downloader/backend')
from app.main import app

print("All routes:")
for route in app.routes:
    path = getattr(route, 'path', '')
    methods = getattr(route, 'methods', 'WS')
    if 'auth' in path:
        print(f"  {path} -> {methods}")
