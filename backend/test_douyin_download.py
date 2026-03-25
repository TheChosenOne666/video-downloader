import httpx
import asyncio

async def test():
    async with httpx.AsyncClient(timeout=60.0) as client:
        # 提交下载任务
        resp = await client.post(
            'http://localhost:8001/api/download',
            json={'urls': ['https://v.douyin.com/Os7ZX6oSpUE']},
        )
        task_id = resp.json().get('task_id')
        print('Task ID:', task_id)
        
        # 轮询状态
        for i in range(30):
            await asyncio.sleep(2)
            status_resp = await client.get(f'http://localhost:8001/api/tasks/{task_id}')
            if status_resp.status_code == 200:
                status_data = status_resp.json()
                st = status_data.get('status') or 'unknown'
                comp = status_data.get('completed', 0)
                tot = status_data.get('total', 0)
                print(f'[{i}] Status: {st} | {comp}/{tot}')
                
                items = status_data.get('items', [])
                for item in items:
                    fn = item.get('filename')
                    err = item.get('error')
                    if fn:
                        print(f'  SUCCESS: {fn}')
                        return
                    if err:
                        print(f'  Error: {err[:100]}')
                        return
            else:
                print(f'[{i}] Status code: {status_resp.status_code}')

if __name__ == '__main__':
    asyncio.run(test())