import re

with open('D:/AI-Generated-Files/video-downloader/backend/app/services/douyin_downloader.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Add logging after file_path is created
old = '''logger.info(f"开始下载: {play_url[:60]}...")

            filename = f"douyin_{video_id}.mp4"
            file_path = os.path.join(str(output_path), filename)'''

new = '''logger.info(f"开始下载: {play_url[:60]}...")
            logger.info(f"output_path: {output_path}, type: {type(output_path)}")

            filename = f"douyin_{video_id}.mp4"
            file_path = os.path.join(str(output_path), filename)
            logger.info(f"file_path: {file_path}")'''

content = content.replace(old, new)

with open('D:/AI-Generated-Files/video-downloader/backend/app/services/douyin_downloader.py', 'w', encoding='utf-8') as f:
    f.write(content)

print('Added debug logging')