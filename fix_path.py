import os
import re

file_path = 'D:/AI-Generated-Files/video-downloader/backend/app/services/downloader.py'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Add os import if not exists
if 'import os' not in content:
    content = content.replace('import logging\n', 'import logging\nimport os\n')

# Replace: str(output_path / "%(id)s.%(ext)s")
content = content.replace('str(output_path / "%(id)s.%(ext)s")', 'os.path.join(str(output_path), "%(id)s.%(ext)s")')

# Replace: task_dir / filename
content = content.replace('task_dir / filename', 'os.path.join(str(task_dir), filename)')

# Replace: task_dir / f"{video_path.stem}_whisper.srt"
# First get the stem
content = content.replace(
    'task_dir / f"{video_path.stem}_whisper.srt"',
    'os.path.join(str(task_dir), f"{os.path.splitext(os.path.basename(video_path))[0]}_whisper.srt")'
)

# Replace: task_dir / f"{video_path.stem}_subtitled.mp4"
content = content.replace(
    'task_dir / f"{video_path.stem}_subtitled.mp4"',
    'os.path.join(str(task_dir), f"{os.path.splitext(os.path.basename(video_path))[0]}_subtitled.mp4")'
)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print('Done')