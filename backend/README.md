# Video Downloader Backend

基于 FastAPI + yt-dlp 的视频下载服务。

## 功能特性

- 批量视频下载
- 异步任务处理
- 进度实时追踪
- 支持获取视频信息（标题、时长、清晰度选项）
- 自动清理过期文件

## 项目结构

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI 应用入口
│   ├── api/
│   │   ├── __init__.py
│   │   └── download.py      # 下载相关 API 端点
│   ├── core/
│   │   ├── __init__.py
│   │   └── config.py        # 配置管理
│   ├── models/
│   │   ├── __init__.py
│   │   └── schemas.py       # Pydantic 数据模型
│   ├── services/
│   │   ├── __init__.py
│   │   ├── downloader.py    # yt-dlp 下载服务
│   │   └── task_manager.py  # 任务管理器
│   └── utils/
│       └── __init__.py
├── downloads/               # 下载文件存储目录
├── tests/                   # 测试目录
├── requirements.txt         # Python 依赖
└── README.md
```

## 快速开始

### 1. 创建虚拟环境

```bash
# Windows
python -m venv venv
.\venv\Scripts\activate

# Linux/macOS
python3 -m venv venv
source venv/bin/activate
```

### 2. 安装依赖

```bash
pip install -r requirements.txt
```

### 3. 启动服务

```bash
# 方式 1: 直接运行
python -m app.main

# 方式 2: 使用 uvicorn
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

服务启动后访问:
- API 文档: http://localhost:8000/docs
- API 文档 (ReDoc): http://localhost:8000/redoc

## API 接口

### 1. 获取视频信息

```http
POST /api/info
Content-Type: application/json

{
  "url": "https://www.youtube.com/watch?v=xxx"
}
```

响应示例:
```json
{
  "info": {
    "title": "Video Title",
    "duration": 360,
    "thumbnail": "https://...",
    "uploader": "Channel Name",
    "view_count": 10000,
    "description": "...",
    "formats": [
      {
        "format_id": "137",
        "ext": "mp4",
        "resolution": "1920x1080",
        "fps": 30,
        "vcodec": "avc1",
        "acodec": "none",
        "filesize": 50000000
      }
    ]
  }
}
```

### 2. 提交批量下载任务

```http
POST /api/download
Content-Type: application/json

{
  "urls": [
    "https://www.youtube.com/watch?v=xxx",
    "https://www.youtube.com/watch?v=yyy"
  ],
  "format_id": "best",
  "audio_only": false
}
```

响应示例:
```json
{
  "task_id": "550e8400-e29b-41d4-a716-446655440000",
  "message": "Download task created successfully"
}
```

### 3. 查询任务状态

```http
GET /api/status/{task_id}
```

响应示例:
```json
{
  "task_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "downloading",
  "total": 2,
  "completed": 0,
  "failed": 0,
  "items": [
    {
      "url": "https://...",
      "status": "downloading",
      "title": "Video Title",
      "filename": null,
      "progress": 45.5,
      "error": null,
      "speed": "2.5MB/s",
      "eta": "1m 30s"
    }
  ],
  "created_at": "2025-01-01T12:00:00",
  "finished_at": null
}
```

### 4. 下载文件

```http
GET /api/download/{task_id}/{filename}
```

返回文件流。

### 5. 删除任务

```http
DELETE /api/task/{task_id}
```

## 配置选项

可通过环境变量或 `.env` 文件配置:

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `DEBUG` | `false` | 调试模式 |
| `HOST` | `0.0.0.0` | 服务监听地址 |
| `PORT` | `8000` | 服务端口 |
| `DOWNLOAD_DIR` | `downloads` | 下载目录 |
| `MAX_CONCURRENT_DOWNLOADS` | `3` | 最大并发下载数 |
| `AUTO_CLEANUP` | `true` | 自动清理过期文件 |
| `CLEANUP_AFTER_HOURS` | `24` | 文件保留时间(小时) |

## 依赖说明

- **FastAPI**: 现代、快速的 Web 框架
- **yt-dlp**: 视频下载核心库 (YouTube-dl 的分支)
- **uvicorn**: ASGI 服务器
- **pydantic**: 数据验证

## 注意事项

1. 确保系统已安装 FFmpeg (用于音视频合并和格式转换)
2. 部分网站可能需要额外的 cookies 配置
3. 生产环境请配置适当的 CORS 策略
4. 建议配置日志收集和监控

## License

MIT
