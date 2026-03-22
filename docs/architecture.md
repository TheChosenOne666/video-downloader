# Video Downloader - 方案设计文档

## 1. 整体架构

```
┌─────────────────────────────────────────────────────────────────┐
│                         用户层                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   PC 浏览器   │  │  手机浏览器   │  │   微信/H5    │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
└─────────┼─────────────────┼─────────────────┼──────────────────┘
          │                 │                 │
          └─────────────────┼─────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                      前端层 (Vercel)                             │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              React 18 + TypeScript + Vite               │   │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐        │   │
│  │  │  首页输入   │  │  进度页面   │  │  下载管理   │        │   │
│  │  └────────────┘  └────────────┘  └────────────┘        │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                      后端层 (服务器)                              │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                   FastAPI (Python)                      │   │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐        │   │
│  │  │  API 路由   │  │  任务管理   │  │  文件服务   │        │   │
│  │  └────────────┘  └────────────┘  └────────────┘        │   │
│  └─────────────────────────────────────────────────────────┘   │
│                            │                                    │
│                            ▼                                    │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              yt-dlp (视频下载核心)                       │   │
│  │         支持 1000+ 视频平台                              │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## 2. 技术选型

### 前端
| 技术 | 版本 | 用途 |
|------|------|------|
| React | 18.x | UI 框架 |
| TypeScript | 5.x | 类型安全 |
| Vite | 6.x | 构建工具 |
| Tailwind CSS | 4.x | 样式 |
| Axios | 1.x | HTTP 请求 |

### 后端
| 技术 | 版本 | 用途 |
|------|------|------|
| FastAPI | 0.115.x | Web 框架 |
| yt-dlp | 2025.3.x | 视频下载 |
| Uvicorn | 0.34.x | ASGI 服务器 |
| Pydantic | 2.10.x | 数据验证 |

### 部署
| 组件 | 平台 | 说明 |
|------|------|------|
| 前端 | Vercel | 自动部署、CDN 加速 |
| 后端 | VPS/云服务器 | 需要持续运行 |
| 域名 | 待配置 | video.downloader.xiaolouv |

## 3. API 设计

### 3.1 获取视频信息
```
POST /api/info
Content-Type: application/json

Request:
{
  "url": "https://www.youtube.com/watch?v=xxx"
}

Response:
{
  "title": "视频标题",
  "duration": 360,
  "thumbnail": "https://...",
  "uploader": "UP主",
  "formats": [
    {
      "format_id": "137",
      "resolution": "1920x1080",
      "ext": "mp4"
    }
  ]
}
```

### 3.2 提交批量下载
```
POST /api/download
Content-Type: application/json

Request:
{
  "urls": [
    "https://www.youtube.com/watch?v=xxx",
    "https://www.bilibili.com/video/xxx"
  ],
  "format_id": "best",
  "audio_only": false
}

Response:
{
  "task_id": "uuid",
  "status": "pending",
  "total": 2
}
```

### 3.3 查询任务进度
```
GET /api/status/{task_id}

Response:
{
  "task_id": "uuid",
  "status": "downloading",
  "progress": 45.5,
  "items": [
    {
      "url": "...",
      "title": "...",
      "status": "completed",
      "progress": 100,
      "filename": "xxx.mp4"
    }
  ]
}
```

### 3.4 下载文件
```
GET /api/download/{task_id}/{filename}

Response: 文件流 (application/octet-stream)
```

## 4. 数据库设计

**无数据库设计** - 采用轻量级方案：

- 任务状态：内存存储（Python dict）+ 可选 Redis
- 文件存储：本地文件系统（downloads/ 目录）
- 配置：环境变量 + .env 文件

任务状态结构：
```python
{
  "task_id": "uuid",
  "status": "pending|downloading|completed|failed",
  "created_at": "2026-03-22T15:00:00",
  "items": [
    {
      "url": "...",
      "title": "...",
      "status": "...",
      "progress": 0-100,
      "filename": "...",
      "error": "..."
    }
  ]
}
```

## 5. 安全设计

1. **URL 校验**：只允许常见视频平台域名
2. **文件清理**：任务完成后自动清理（可配置保留时间）
3. **CORS 限制**：生产环境配置特定域名
4. **并发限制**：默认最多 3 个同时下载
5. **文件类型限制**：只允许视频/音频文件

## 6. 核心技术突破

### 6.1 全平台视频无缝解析
**实现原理：**
- 基于 yt-dlp 强大的底层能力（支持 1847+ 视频网站提取器）
- 无需用户登录，直接通过公开 API 解析
- 支持平台：YouTube、Bilibili、抖音、快手、Twitter、Instagram、TikTok 等

**技术细节：**
```python
# yt-dlp 配置
opts = {
    "quiet": True,
    "no_warnings": True,
    "extract_flat": False,
    "nocheckcertificate": True,  # 绕过 SSL 限制
    "cookiefile": None,  # 显式禁用 cookies
}
```

### 6.2 攻克"防盗链"机制（403/503 错误）
**问题背景：**
- B站等平台有 Referer 防盗链限制
- 直接访问视频资源返回 403/503 错误
- 封面图无法正常显示

**解决方案：**

#### 后端图片代理 API
```
GET /api/proxy/image?url={original_url}
```

**实现细节：**
1. 自动识别平台并匹配对应的 Referer
2. 添加完整的浏览器请求头
3. 返回图片流，绕过前端跨域限制

```python
# 平台特定的 Referer 映射
referer_map = {
    "bilibili.com": "https://www.bilibili.com/",
    "youtube.com": "https://www.youtube.com/",
    "douyin.com": "https://www.douyin.com/",
    # ...
}

headers = {
    "User-Agent": "Mozilla/5.0 ...",
    "Referer": referer,
    "Accept": "image/webp,image/apng,image/*,*/*;q=0.8",
}
```

#### 视频下载防盗链绕过
在 yt-dlp 配置中添加相同的请求头策略：
```python
opts = {
    "http_headers": {
        "User-Agent": "Mozilla/5.0 ...",
        "Accept": "*/*",
        "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
    },
}
```

### 6.3 突破免 Cookie 下载壁垒
**问题背景：**
- 抖音等平台必须要求用户登录态才能下载
- 传统的扫码获取 Cookie 方案存在安全风险
- 用户操作复杂，体验差

**解决方案：**

#### 技术绕过策略
1. **显式禁用 Cookies** - 避免触发登录检测
2. **跳过 SSL 证书验证** - 绕过某些平台的证书限制
3. **伪装浏览器请求** - 使用完整的 User-Agent 和请求头
4. **利用 yt-dlp 内置绕过机制** - yt-dlp 已实现多平台免登录方案

```python
opts = {
    "nocheckcertificate": True,  # 跳过 SSL 验证
    "cookiefile": None,  # 显式禁用 cookies
    "user_agent": "Mozilla/5.0 ...",  # 伪装浏览器
}
```

**安全性说明：**
- 不涉及用户敏感信息（无需 Cookie）
- 不存储用户凭证
- 纯技术绕过，无安全风险

## 7. 扩展规划

### V2 功能
- [ ] 用户系统（JWT 认证）
- [ ] 下载历史记录（SQLite）
- [ ] 音频提取功能
- [ ] 字幕下载

### V3 功能
- [ ] AI 视频总结（Whisper + LLM）
- [ ] 字幕翻译
- [ ] 视频转码

### V4 功能
- [ ] 付费系统（Stripe/支付宝）
- [ ] 会员等级
- [ ] 下载配额管理

---

*文档版本：v1.0*  
*创建时间：2026-03-22*  
*更新记录：初始版本*
