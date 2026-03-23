import asyncio
import httpx
import time

async def test_complete_flow():
    # 1. 提交下载任务
    async with httpx.AsyncClient(timeout=120.0) as client:
        r = await client.post(
            'http://localhost:8000/api/download',
            json={'urls': ['https://www.bilibili.com/video/BV1xx411c7mD']},
        )
        print('1. Submit task:', r.status_code)
        data = r.json()
        task_id = data['task_id']
        print('   Task ID:', task_id)
        
        # 2. 轮询状态直到完成
        max_checks = 60
        for i in range(max_checks):
            time.sleep(2)
            r = await client.get(f'http://localhost:8000/api/status/{task_id}')
            status_data = r.json()
            items = status_data.get('items', [])
            
            completed = sum(1 for item in items if item.get('status') == 'completed')
            failed = sum(1 for item in items if item.get('status') == 'failed')
            
            print(f'2. Check {i+1}: completed={completed}, failed={failed}')
            
            if failed > 0:
                print('   FAILED:', items)
                break
            
            if completed >= 1:
                print('   COMPLETED!')
                
                # 3. 下载第一个文件
                filename = items[0].get('filename')
                if filename:
                    r = await client.get(f'http://localhost:8000/api/download/{task_id}/{filename}')
                    cl = r.headers.get('content-length', 'unknown')
                    print(f'3. Download file: {r.status_code}, size: {cl}')
                break

asyncio.run(test_complete_flow())