import asyncio
import httpx
import json
import re

async def test():
    video_id = '7618910892796742939'
    share_url = f'https://www.iesdouyin.com/share/video/{video_id}/'
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
    }
    
    async with httpx.AsyncClient() as client:
        resp = await client.get(share_url, headers=headers, timeout=30.0)
        html = resp.text
        
        # 用正则提取 play_addr 相关
        play_pattern = r'"play_addr"\s*:\s*\{[^}]+\}'
        play_matches = re.findall(play_pattern, html)
        print('Play addr matches:', len(play_matches))
        for m in play_matches[:3]:
            print('Match:', m[:100])
        
        # 提取 url_list
        url_list_pattern = r'"url_list"\s*:\s*\[(.*?)\]'
        url_matches = re.findall(url_list_pattern, html, re.DOTALL)
        print('\nURL list matches:', len(url_matches))
        for m in url_matches[:3]:
            print('URL list:', m[:200])

if __name__ == '__main__':
    asyncio.run(test())