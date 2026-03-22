import asyncio
import httpx
import re

async def test():
    video_id = '7618910892796742939'
    url = 'https://www.douyin.com/video/' + video_id
    headers = {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.47 NetType/WIFI Language/zh_CN',
        'Referer': 'https://www.douyin.com/',
    }
    
    async with httpx.AsyncClient(follow_redirects=True, timeout=30.0) as client:
        resp = await client.get(url, headers=headers)
        content = resp.text
        
        # 查找各种可能的数据
        patterns = [
            ('desc', r'"desc":\s*"([^"]+)"'),
            ('cover', r'"cover":\s*"([^"]+)"'),
            ('nickname', r'"nickname":\s*"([^"]+)"'),
            ('video_id', r'"video_id":\s*"([^"]+)"'),
        ]
        
        for name, pattern in patterns:
            match = re.search(pattern, content)
            if match:
                val = match.group(1)
                print(f'{name}: {val[:80]}...' if len(val) > 80 else f'{name}: {val}')

asyncio.run(test())