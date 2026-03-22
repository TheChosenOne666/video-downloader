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
        print('Status:', resp.status_code)
        
        content = resp.text
        print('Content length:', len(content))
        
        # 查找 __INITIAL_STATE__
        match = re.search(r'window\._INITIAL_STATE__\s*=\s*(\{[^;]+\});', content)
        if match:
            data_str = match.group(1)
            print('Found INITIAL_STATE, length:', len(data_str))
            print('First 500 chars:', data_str[:500])
        else:
            print('No INITIAL_STATE found')
            
        # 查找 desc
        match = re.search(r'\"desc\":\s*\"([^\"]+)\"', content)
        if match:
            print('Title:', match.group(1))
            
        # 查找 cover
        match = re.search(r'\"cover\":\s*\"([^\"]+)\"', content)
        if match:
            print('Cover:', match.group(1)[:100])

asyncio.run(test())