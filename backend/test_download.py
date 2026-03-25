import httpx
import json
import asyncio

async def test():
    url = "http://localhost:8080/api/download"
    data = {
        "urls": ["https://www.bilibili.com/video/BV1GJ411x7h7"],
        "quality": "best",
        "format": "best"
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.post(url, json=data)
        result = response.json()
        print(json.dumps(result, indent=2, ensure_ascii=False))
        
        # Get task status
        if 'task_id' in result:
            task_id = result['task_id']
            print(f"\nTask ID: {task_id}")
            
            # Wait a bit for download to start
            await asyncio.sleep(3)
            
            # Check status
            status_url = f"http://localhost:8080/api/status/{task_id}"
            status_response = await client.get(status_url)
            status = status_response.json()
            print("\nTask Status:")
            print(json.dumps(status, indent=2, ensure_ascii=False))

asyncio.run(test())
