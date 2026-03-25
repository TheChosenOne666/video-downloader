# API 接口文档

## 基础信息

**Base URL**: `http://localhost:8001`  
**API 前缀**: `/api`  
**文档地址**: `http://localhost:8001/docs` (Swagger UI)

---

## 接口列表

### 1. 健康检查

**GET** `/health`

**响应**:
```json
{
  "status": "healthy"
}
```

---

### 2. 获取视频信息

**POST** `/api/info`

**请求体**:
```json
{
  "urls": ["https://v.douyin.com/xxx"]
}
```

**响应**:
```json
{
  "infos": [
    {
      "title": "视频标题",
      "duration": 30,
      "thumbnail": "https://...",
      "uploader": "UP主",
      "view_count": 10000,
      "description": "描述",
      "formats": [
        {
          "format_id": "best",
          "ext": "mp4",
          "resolution": "1080p"
        }
      ]
    }
  ]
}
```

**错误响应**:
```json
{
  "detail": "错误信息"
}
```

---

### 3. 创建下载任务

**POST** `/api/download`

**请求体**:
```json
{
  "urls": ["https://v.douyin.com/xxx"],
  "format": "best"  // 可选
}
```

**响应**:
```json
{
  "task_id": "uuid-xxx"
}
```

**状态码**:
- `202` - 任务已创建
- `400` - 请求参数错误
- `500` - 服务器错误

---

### 4. 查询任务状态

**GET** `/api/status/{task_id}`

**响应**:
```json
{
  "task_id": "uuid-xxx",
  "status": "downloading",  // pending | downloading | completed | failed
  "total": 1,
  "completed": 0,
  "failed": 0,
  "items": [
    {
      "url": "https://v.douyin.com/xxx",
      "status": "downloading",
      "title": "视频标题",
      "filename": null,
      "progress": 45.5,
      "speed": "2.5MB/s",
      "eta": "10s",
      "error": null
    }
  ],
  "created_at": "2026-03-25T12:00:00",
  "finished_at": null
}
```

**状态码**:
- `200` - 成功
- `404` - 任务不存在

---

### 5. 下载文件

**GET** `/api/download/{task_id}/{filename}`

**响应**: 文件流（二进制）

**状态码**:
- `200` - 成功
- `404` - 文件或任务不存在
- `400` - 任务未完成

---

### 6. 删除任务

**DELETE** `/api/task/{task_id}`

**响应**: 无内容

**状态码**:
- `204` - 删除成功
- `404` - 任务不存在

---

### 7. 图片代理

**GET** `/api/proxy/image?url={encoded_url}`

**用途**: 绕过图片防盗链

**支持的防盗链平台**:
- B站（hdslb.com）
- 抖音（douyinpic.com）
- 其他平台

**响应**: 图片流

**缓存**: 24 小时

**状态码**:
- `200` - 成功
- `400` - URL 无效或请求失败

---

## WebSocket 端点

**WS** `/ws/{task_id}`

**用途**: 实时进度推送（已实现但前端未使用）

**消息格式**:
```json
{
  "type": "progress",
  "index": 0,
  "status": {
    "progress": 50.5,
    "speed": "2.5MB/s"
  }
}
```

---

## 错误处理

### 错误响应格式
```json
{
  "detail": "错误描述"
}
```

### 常见错误码

| 状态码 | 说明 |
|--------|------|
| 400 | 请求参数错误 |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |

---

## 平台特定说明

### 抖音
- **URL 格式**: `https://v.douyin.com/xxx` 或 `https://www.douyin.com/video/xxx`
- **特点**: 自动获取无水印视频
- **限制**: 部分视频需要登录

### B站
- **URL 格式**: `https://www.bilibili.com/video/BVxxx`
- **特点**: 视频音频分离
- **限制**: 当前仅下载视频轨道（无音频）

### YouTube
- **URL 格式**: `https://www.youtube.com/watch?v=xxx`
- **特点**: 支持多种画质
- **限制**: 部分视频有地区限制

---

## 前端集成示例

### TypeScript 类型定义
```typescript
interface VideoInfo {
  title: string;
  duration?: number;
  thumbnail?: string;
  uploader?: string;
  view_count?: number;
  description?: string;
  formats?: FormatInfo[];
}

interface DownloadResponse {
  taskId: string;
  videos: VideoInfo[];
  message: string;
}

interface StatusResponse {
  taskId: string;
  status: 'pending' | 'downloading' | 'completed' | 'failed';
  progress: number;
  total: number;
  completed: number;
  failed: number;
  videos: VideoStatus[];
  error?: string;
}
```

### API 客户端
```typescript
// 获取视频信息
const infos = await getVideoInfo(["https://v.douyin.com/xxx"]);

// 创建下载任务
const { taskId } = await startDownload(["https://v.douyin.com/xxx"]);

// 轮询进度
const status = await getTaskStatus(taskId);

// 下载文件
const url = getDownloadUrl(taskId, filename);
```

---

**文档版本**: v1.0  
**最后更新**: 2026-03-25
