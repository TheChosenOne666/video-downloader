import asyncio
import sys
sys.path.insert(0, 'D:\\AI-Generated-Files\\video-downloader\\backend')
from app.services.douyin_downloader import douyin_downloader

async def test():
    url = 'https://v.douyin.com/Os7ZX6oSpUE'
    print('Testing URL:', url)
    try:
        info = await douyin_downloader.get_video_info(url)
        print('[OK] Title:', info.title[:80] if info.title else 'None')
        print('[OK] Thumbnail:', 'Yes ->' + info.thumbnail[:60] if info.thumbnail else 'No')
        print('[OK] Uploader:', info.uploader if info.uploader else 'None')
        print('[OK] Duration:', info.duration, 's')
        print('[OK] Description:', info.description[:80] if info.description else 'None')
    except Exception as e:
        print('[ERROR]', str(e)[:300])
        import traceback
        traceback.print_exc()

asyncio.run(test())