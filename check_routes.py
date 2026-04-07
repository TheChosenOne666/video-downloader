import re
with open('D:/AI-Generated-Files/video-downloader/backend/app/api/download.py', 'r', encoding='utf-8') as f:
    content = f.read()
    
# Find all @router lines
matches = re.findall(r'@router\.(get|post|put|delete)\("([^"]+)"', content)
for m in matches:
    print(f'{m[0].upper()} {m[1]}')