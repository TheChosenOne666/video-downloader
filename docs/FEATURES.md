# VideoGrab 功能清单

**项目版本**: v2.3  
**最后更新**: 2026-04-05

---

## 核心功能

### 1. 多平台视频下载

支持 1000+ 平台的视频下载，核心平台：

| 平台 | URL 格式 | 特性 |
|------|---------|------|
| 抖音 | `v.douyin.com` | ✅ 无水印下载 |
| B站 | `bilibili.com` | ✅ 多画质选择 |
| YouTube | `youtube.com` | ✅ 4K/8K 支持 |
| TikTok | `tiktok.com` | ✅ 无水印下载 |
| 快手 | `kuaishou.com` | 基础支持 |
| 西瓜视频 | `ixigua.com` | 基础支持 |

**技术实现**:
- 通用平台：`yt-dlp` 库
- 抖音专用：`douyin_downloader.py`（绕过 cookies 限制，获取无水印视频）

---

### 2. 批量下载

- 支持多个视频同时下载
- 并发控制（默认 3 个并发）
- 实时进度追踪

---

### 3. 下载模式选择

用户可选择两种下载模式：

#### 原视频模式
- 直接下载原始视频文件
- 速度快，无额外处理

#### 带字幕模式
- 下载视频后自动调用 **Whisper AI** 生成字幕
- 使用 **FFmpeg** 将字幕硬编码到视频中
- 输出 `xxx_subtitled.mp4` 文件

**技术实现**:
- `whisper_subtitle_generator.py` - Faster-Whisper 语音识别
- `subtitle_hardcoder.py` - FFmpeg 字幕烧录
- 需要 FFmpeg 环境

---

## 会员系统功能

### 功能入口
首页导航栏 → 「会员」按钮 → PricingPage

### 会员套餐

| 套餐 | 价格 | 有效期 | 特权 |
|------|------|--------|------|
| 普通用户 | 免费 | 永久 | 基础下载功能 |
| 月度 VIP | ¥19.9/月 | 30 天 | 高清下载 + AI 总结 |
| 年度 VIP | ¥99.9/年 | 365 天 | 全部功能 + 优先支持 |
| 终身 VIP | ¥299 | 永久 | 全部功能 + 终身更新 |

### 支付流程

1. **选择套餐** - 在 PricingPage 选择会员套餐
2. **确认订单** - 跳转 PaymentPage 显示订单详情
3. **选择支付方式** - 微信支付 / 支付宝（模拟支付）
4. **完成支付** - 支付成功后自动激活会员
5. **个人中心** - 在 ProfilePage 查看会员状态

### 技术架构

```
前端
├── PricingPage.tsx      # 套餐展示页面
├── PaymentPage.tsx      # 支付确认页面
├── ProfilePage.tsx      # 个人中心（会员状态）
└── services/membership.ts  # 会员 API 封装

后端
├── api/membership.py       # 会员 API 路由
├── services/membership_service.py  # 会员服务
└── models/                 # 数据模型
    ├── membership_plan.py
    ├── user_subscription.py
    └── order.py

数据库
├── membership_plans      # 会员套餐表
├── user_subscriptions    # 用户订阅表
└── orders               # 订单表
```

### API 端点

```
GET  /api/membership/plans           # 获取所有套餐
GET  /api/membership/subscription    # 获取当前用户订阅
POST /api/membership/orders          # 创建订单
GET  /api/membership/orders          # 获取用户订单列表
GET  /api/membership/orders/{id}     # 获取订单详情
POST /api/membership/orders/{id}/mock-pay  # 模拟支付
```

### 支付图标

使用 `simple-icons` 库提供的官方品牌图标：
- 微信支付：绿色 #07C160，官方微信 logo
- 支付宝：蓝色 #1677FF，官方支付宝 logo

---

## 用户认证系统

### 功能

- 用户注册 / 登录
- Token 认证（Bearer Token）
- 角色权限控制（user / vip / admin）
- 个人信息管理

### 权限模型

| 角色 | 权限 |
|------|------|
| user | 基础功能 |
| vip | VIP 专属功能 |
| admin | 管理员权限 |

### 技术实现

- 密码加密：`passlib` + `bcrypt`
- Token 管理：`uuid` 生成，数据库存储
- 会话过期：30 天自动过期

---

## AI 视频总结功能

### 功能入口
首页 → 「AI 总结」按钮 → SummarizePage

### 四大功能 Tab

#### 1. 摘要总结
- AI 自动生成 200 字视频摘要
- **SSE 流式输出**，实时显示生成过程
- 支持复制内容

#### 2. 标题信息
- 显示视频基本信息：标题、上传者、时长、播放量、描述
- 无需 API 调用，页面加载即显示
- 支持复制标题

#### 3. 思维导图
- AI 生成 Markdown 格式的思维导图
- 使用 `markmap-lib` + `markmap-view` 渲染 **SVG 图形化**
- 支持全屏查看、PNG/SVG 导出

#### 4. AI 问答
- 基于视频内容的智能对话
- 多轮对话历史记录
- SSE 流式输出

### 技术架构

```
前端 SummarizePage.tsx
    │
    ├── POST /api/summarize/stream/summary (SSE)
    ├── POST /api/summarize/stream/mindmap (SSE)
    └── POST /api/summarize/stream/chat (SSE)
            │
            ▼
    后端 ai_summarizer.py
            │
            ▼
    火山引擎豆包大模型
    (doubao-seed-2-0-lite-260215)
```

### SSE 数据格式

```
data: {"type": "summary", "data": "文本块"}\n\n
data: {"type": "error", "data": "错误描述"}\n\n
data: [DONE]\n\n
```

---

## AI 字幕生成功能

### 功能入口
首页 → 「AI 字幕生成」按钮 → SubtitleGenerationPage

### 工作流程

1. **下载视频** - 从 URL 下载视频文件
2. **提取音频** - 使用 FFmpeg 提取音频轨道
3. **语音识别** - Whisper AI 生成字幕（SRT/VTT/ASS 格式）
4. **硬编码字幕**（可选）- 将字幕烧录到视频中

### 技术实现

- **Whisper 模型**: `Faster-Whisper` base 模型（约 140MB）
- **支持语言**: 中文、英语、日语、韩语等
- **输出格式**: SRT、WebVTT、JSON

### API 端点

```
POST /api/subtitle/generate
Response: { "task_id": "xxx", "status": "pending" }

GET /api/subtitle/status/{task_id}
Response: { 
  "status": "transcribing", 
  "progress": 45.0,
  "subtitle_url": "/api/subtitle/download/xxx.srt"
}
```

---

## 实时进度追踪

### WebSocket 支持

后端实现 `ConnectionManager` 管理 WebSocket 连接：

```python
@app.websocket("/ws/{task_id}")
async def websocket_progress(websocket: WebSocket, task_id: str):
    await ws_manager.connect(websocket, task_id)
    # 实时推送下载进度
```

### 前端订阅

```typescript
// api.ts
export function subscribeToProgress(taskId: string, listener: ProgressListener) {
  const ws = new WebSocket(`ws://localhost:8000/ws/${taskId}`);
  ws.onmessage = (event) => listener(JSON.parse(event.data));
}
```

### HTTP 轮询备选

当 WebSocket 不可用时，前端使用 500ms HTTP 轮询：

```typescript
const pollInterval = setInterval(async () => {
  const status = await getTaskStatus(taskId);
  // 更新 UI
}, 500);
```

---

## 图片防盗链处理

### 问题
B站、抖音等平台的图片有防盗链保护，直接请求返回 403。

### 解决方案

后端提供图片代理端点：

```
GET /api/proxy/image?url=<encoded_url>
```

### 实现

```python
# 完整浏览器指纹
headers = {
    "Referer": "https://www.bilibili.com/",
    "Origin": "https://www.bilibili.com",
    "Sec-Ch-Ua": '"Chromium";v="122"',
    "Sec-Fetch-Dest": "image",
    "User-Agent": "Mozilla/5.0 ...",
}
```

---

## 文件结构

### 后端新增文件

| 文件 | 功能 | 行数 |
|------|------|------|
| `backend/app/api/summarize.py` | AI 总结 API 路由 | ~534 |
| `backend/app/api/subtitle.py` | 字幕生成 API 路由 | ~325 |
| `backend/app/services/ai_summarizer.py` | AI 总结服务 | ~390 |
| `backend/app/services/subtitle_extractor.py` | 字幕提取服务 | ~469 |
| `backend/app/services/whisper_subtitle_generator.py` | Whisper 语音识别 | ~290 |
| `backend/app/services/subtitle_hardcoder.py` | FFmpeg 字幕烧录 | ~187 |
| `backend/app/services/douyin_downloader.py` | 抖音专用下载器 | ~430 |

### 前端新增文件

| 文件 | 功能 | 行数 |
|------|------|------|
| `frontend/src/pages/SummarizePage.tsx` | AI 总结页面 | ~701 |
| `frontend/src/pages/SubtitleGenerationPage.tsx` | 字幕生成页面 | ~354 |
| `frontend/src/components/MindmapGraph.tsx` | 思维导图组件 | ~92 |
| `frontend/src/components/DownloadModeSelector.tsx` | 下载模式选择器 | ~68 |

---

## 依赖环境

### 后端 Python 依赖

```txt
fastapi
uvicorn
yt-dlp
httpx
volcenginesdkarkruntime  # 火山引擎 SDK
faster-whisper           # Whisper 语音识别
pysrt                    # SRT 字幕处理
webvtt-py                # WebVTT 字幕处理
imageio-ffmpeg           # FFmpeg 二进制
```

### 前端依赖

```json
{
  "react": "^18.x",
  "react-markdown": "^9.x",
  "remark-gfm": "^4.x",
  "markmap-lib": "^0.18.x",
  "markmap-view": "^0.18.x",
  "html2canvas": "^1.x"
}
```

### 系统依赖

- **FFmpeg**: 字幕烧录、音频提取
- **Python 3.9+**
- **Node.js 18+**

---

## 配置项

### 后端环境变量

```env
# 下载目录
DOWNLOAD_DIR=./downloads

# 并发数
MAX_CONCURRENT_DOWNLOADS=3

# 火山引擎 API
VOLCENGINE_API_KEY=your-api-key
VOLCENGINE_MODEL=doubao-seed-2-0-lite-260215
VOLCENGINE_BASE_URL=https://ark.cn-beijing.volces.com/api/v3

# Whisper 模型
WHISPER_MODEL=base
WHISPER_DEVICE=cpu
```

---

## 已知限制

1. **B站视频音频分离**: 当前仅下载视频轨道，需要 FFmpeg 合并
2. **抖音 cookies**: yt-dlp 需要登录 cookies，已用专用下载器绕过
3. **Whisper 首次运行**: 需要下载模型（约 140MB）
4. **思维导图复杂度**: AI 生成质量依赖视频字幕内容

---

## 后续规划

### v2.4 计划
- [ ] 真实支付接入（微信/支付宝）
- [ ] 会员权益细化
- [ ] 下载历史记录

### v3.0 计划
- [ ] 云存储上传
- [ ] 浏览器插件版本
- [ ] 移动端 App

---

**文档维护**: 小楼的龙虾 🦞
