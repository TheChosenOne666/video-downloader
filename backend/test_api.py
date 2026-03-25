import httpx
import json
import asyncio

async def test():
    url = "http://localhost:8080/api/info"
    data = {
        "urls": ["https://www.bilibili.com/video/BV1GJ411x7h7"]
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.post(url, json=data)
        print(json.dumps(response.json(), indent=2, ensure_ascii=False))

asyncio.run(test())
