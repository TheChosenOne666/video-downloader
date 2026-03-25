import httpx
import json
import asyncio

async def test():
    base = "http://localhost:8080"
    
    # 1. Test B站 download
    print("=== Testing Bilibili download ===")
    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(f"{base}/api/download", json={
            "urls": ["https://www.bilibili.com/video/BV1GJ411x7h7"]
        })
        result = resp.json()
        task_id = result.get("task_id")
        print(f"Task created: {task_id}")
        
        # Poll status
        for i in range(12):
            await asyncio.sleep(5)
            resp = await client.get(f"{base}/api/status/{task_id}")
            status = resp.json()
            print(f"  [{i+1}] status={status['status']}, progress={status['items'][0].get('progress', 0):.1f}%")
            if status['status'] in ('completed', 'failed'):
                print(json.dumps(status, indent=2, ensure_ascii=False))
                break

    # 2. Test 抖音 download
    print("\n=== Testing Douyin download ===")
    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(f"{base}/api/download", json={
            "urls": ["https://v.douyin.com/Os7ZX6oSpUE"]
        })
        result = resp.json()
        task_id = result.get("task_id")
        print(f"Task created: {task_id}")
        
        for i in range(12):
            await asyncio.sleep(5)
            resp = await client.get(f"{base}/api/status/{task_id}")
            status = resp.json()
            print(f"  [{i+1}] status={status['status']}, progress={status['items'][0].get('progress', 0):.1f}%")
            if status['status'] in ('completed', 'failed'):
                print(json.dumps(status, indent=2, ensure_ascii=False))
                break

asyncio.run(test())
