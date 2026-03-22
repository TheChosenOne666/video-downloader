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
        
        # 保存到文件
        with open('douyin_page.html', 'w', encoding='utf-8') as f:
            f.write(content)
        
        print(f'Saved {len(content)} chars to douyin_page.html')
        
        # 查找包含 aweme 的内容
        if 'aweme' in content.lower():
            print('Found aweme in page')
            
        # 查找包含 video 的内容
        if 'video' in content.lower():
            print('Found video in page')
            
        # 打印前 5000 字符
        print('--- First 5000 chars ---')
        print(content[:5000])

asyncio.run(test())