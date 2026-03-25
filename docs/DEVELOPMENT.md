# 开发指南

## 快速开始

### 1. 环境要求

**后端**:
- Python 3.9+
- pip
- venv

**前端**:
- Node.js 18+
- npm

**可选**:
- ffmpeg（B站视频音频合并）

---

### 2. 后端启动

```bash
# 进入后端目录
cd backend

# 创建虚拟环境
python -m venv venv

# 激活虚拟环境
# Windows:
.\venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# 安装依赖
pip install -r requirements.txt

# 启动开发服务器
uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
```

**访问地址**:
- API: http://localhost:8001
- 文档: http://localhost:8001/docs
- 健康检查: http://localhost:8001/health

---

### 3. 前端启动

```bash
# 进入前端目录
cd frontend

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

**访问地址**: http://localhost:5174

---

## 开发流程

### 添加新平台支持

**步骤 1**: 检查 yt-dlp 是否已支持

```bash
yt-dlp --list-extractors | grep platform_name
```

**步骤 2**: 如需自定义解析器

创建文件: `backend/app/services/{platform}_downloader.py`

```python
class PlatformDownloader:
    async def get_video_info(self, url: str) -> VideoDetail:
        # 解析视频信息
        pass
    
    async def download_video(
        self, 
        url: str, 
        output_path: Path,
        progress: DownloadProgress
    ) -> DownloadItemStatus:
        # 下载视频
        pass
```

**步骤 3**: 在 `downloader.py` 中集成

```python
if platform_downloader.is_platform_url(url):
    return await platform_downloader.get_video_info(url)
```

---

### 添加新 API 端点

**步骤 1**: 定义数据模型（`models/schemas.py`）

```python
class NewRequest(BaseModel):
    param1: str
    param2: int

class NewResponse(BaseModel):
    result: str
```

**步骤 2**: 添加路由（`api/download.py`）

```python
@router.post("/new-endpoint", response_model=NewResponse)
async def new_endpoint(request: NewRequest) -> NewResponse:
    # 业务逻辑
    return NewResponse(result="success")
```

**步骤 3**: 前端集成（`services/api.ts`）

```typescript
export async function newEndpoint(param1: string, param2: number) {
  const response = await fetch(`${API_BASE}/new-endpoint`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ param1, param2 }),
  });
  return handleResponse<NewResponse>(response);
}
```

---

### 调试技巧

**后端调试**:
```python
import logging
logger = logging.getLogger(__name__)
logger.debug(f"Debug info: {data}")
```

**前端调试**:
```typescript
console.log('Debug info:', data);
// 或使用 React DevTools
```

**网络请求调试**:
- Chrome DevTools → Network 标签
- 查看 Headers、Payload、Response

---

## 代码规范

### Python 代码规范

```python
# 使用类型注解
def download_video(url: str, task_id: str) -> DownloadItemStatus:
    pass

# 使用 docstring
"""
下载视频
    
Args:
    url: 视频链接
    task_id: 任务 ID
    
Returns:
    DownloadItemStatus: 下载状态
"""

# 使用 logging 而非 print
logger.info(f"Downloading: {url}")
logger.error(f"Failed: {error}")
```

### TypeScript 代码规范

```typescript
// 使用接口定义类型
interface VideoInfo {
  title: string;
  duration?: number;  // 可选属性
}

// 使用 async/await
async function fetchInfo(): Promise<VideoInfo> {
  const response = await fetch(url);
  return response.json();
}

// 使用可选链和空值合并
const title = video?.title ?? 'Unknown';
```

---

## 测试

### 后端测试

```bash
# 运行所有测试
pytest

# 运行特定测试
pytest tests/test_downloader.py

# 查看覆盖率
pytest --cov=app tests/
```

### 前端测试

```bash
# 运行测试
npm test

# 查看覆盖率
npm test -- --coverage
```

### API 测试

```bash
# 健康检查
curl http://localhost:8001/health

# 获取视频信息
curl -X POST http://localhost:8001/api/info \
  -H "Content-Type: application/json" \
  -d '{"urls":["https://v.douyin.com/xxx"]}'

# 创建下载任务
curl -X POST http://localhost:8001/api/download \
  -H "Content-Type: application/json" \
  -d '{"urls":["https://v.douyin.com/xxx"]}'
```

---

## 部署

### Docker 部署

```dockerfile
# 后端 Dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001"]
```

```dockerfile
# 前端 Dockerfile
FROM node:18-alpine as build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
```

### docker-compose.yml

```yaml
version: '3.8'

services:
  backend:
    build: ./backend
    ports:
      - "8001:8001"
    volumes:
      - ./downloads:/app/downloads
  
  frontend:
    build: ./frontend
    ports:
      - "80:80"
    depends_on:
      - backend
```

---

## 常见问题

### Q: 如何安装 ffmpeg？

**Windows**:
```bash
winget install ffmpeg
# 或下载: https://www.gyan.dev/ffmpeg/builds/
```

**Mac**:
```bash
brew install ffmpeg
```

**Linux**:
```bash
sudo apt install ffmpeg
```

### Q: 如何处理 CORS 错误？

后端已配置 CORS，允许所有来源：
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### Q: 如何添加代理支持？

```python
# yt-dlp 配置
opts = {
    "proxy": "http://127.0.0.1:7890",
    # ...
}
```

### Q: 如何修改下载目录？

```python
# backend/app/core/config.py
class Settings(BaseSettings):
    download_dir: Path = Path("your/custom/path")
```

---

## Git 工作流

### 提交规范

```bash
feat: 新功能
fix: 修复 bug
docs: 文档更新
style: 代码格式调整
refactor: 重构
test: 测试相关
chore: 构建/工具相关
```

### 分支管理

```
main        # 主分支，稳定版本
develop     # 开发分支
feature/xxx # 功能分支
hotfix/xxx  # 紧急修复分支
```

---

**文档版本**: v1.0  
**最后更新**: 2026-03-25
