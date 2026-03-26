# AI 视频总结功能 - 开发文档

## 功能概述

基于火山引擎豆包大模型的视频内容总结工具，支持视频摘要、字幕提取、思维导图生成和 AI 智能问答。

## 技术架构

```
┌─────────────┐     SSE      ┌──────────────────┐     SDK      ┌─────────────┐
│   前端 React │ ──────────→ │  FastAPI 后端     │ ──────────→ │  豆包大模型   │
│  SummarizePage│ ←────────── │  summarize.py     │ ←────────── │  Doubao API  │
└─────────────┘    流式JSON   └──────────────────┘    流式响应   └─────────────┘
                                   │
                                   ▼
                          ┌──────────────────┐
                          │  字幕提取服务     │
                          │  subtitle_       │
                          │  extractor.py    │
                          └──────────────────┘
```

## API 端点

### 字幕提取（同步 JSON）

```
POST /api/summarize/stream/subtitle
Body: { "video_url": "https://..." }
Response: { "status": "success", "video_info": {...}, "subtitle": "...", "subtitle_entries": [...] }
```

### 视频摘要（SSE 流式）

```
POST /api/summarize/stream/summary
Body: { "video_url": "https://..." }
Content-Type: text/event-stream
```

### 思维导图（SSE 流式）

```
POST /api/summarize/stream/mindmap
Body: { "video_url": "https://..." }
Content-Type: text/event-stream
```

### AI 问答（SSE 流式）

```
POST /api/summarize/stream/chat
Body: { "question": "这个视频讲了什么？" }
Content-Type: text/event-stream
```

## SSE 数据格式

**正常数据：**
```
data: {"type": "summary", "data": "文本块"}\n\n
data: {"type": "summary", "data": "更多文本"}\n\n
```

**错误数据：**
```
data: {"type": "error", "data": "错误描述"}\n\n
```

**流结束：**
```
data: [DONE]\n\n
```

## 关键技术决策

### 1. SSE 流式输出 vs 轮询
- **选择**：SSE（Server-Sent Events）
- **原因**：实时性好，用户体验佳
- **实现**：后端 `StreamingResponse` + 前端 `fetch` + `ReadableStream`
- **注意**：不能用 `EventSource`（只支持 GET），必须用 `fetch` 发 POST 请求

### 2. 字幕提取方案
- **选择**：yt-dlp 提取平台自带字幕
- **回退**：无字幕时使用视频标题+描述作为上下文
- **局限**：B站视频普遍只有弹幕无字幕，内容有限

### 3. AI 模型
- **模型**：`doubao-seed-2-0-lite-260215`（火山引擎）
- **SDK**：`volcenginesdkarkruntime`（官方 Python SDK）
- **调用方式**：`client.responses.create(stream=True)`
- **事件解析**：文本在事件的 `delta` 属性中（`ResponseReasoningSummaryTextDeltaEvent`）

### 4. 无字幕视频处理
- 字幕长度 < 10 字符时，自动回退到标题+描述
- AI 会根据有限信息尽力生成内容
- 后续可接入 Whisper 语音识别提升效果

## 前端实现要点

### SSE 解析逻辑
```typescript
const reader = response.body?.getReader();
const decoder = new TextDecoder();
let buffer = '';

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  buffer += decoder.decode(value, { stream: true });
  const lines = buffer.split('\n');
  buffer = lines.pop() || '';

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('data: ')) continue;
    const data = trimmed.slice(6);
    if (data === '[DONE]') break;

    const json = JSON.parse(data);
    if (json.type === 'error') {
      // 显示错误，停止处理
      return;
    }
    fullContent += json.data || '';
  }
}
```

### 卡片状态管理
```typescript
interface CardState {
  status: 'idle' | 'loading' | 'done' | 'error';
  content: string;
  error?: string;
}
```
- 4 个独立卡片：摘要、字幕、思维导图、问答
- 各自维护独立状态，互不影响
- 内容缓存在 `useState` 中，切换不丢失

## 后端实现要点

### async/sync 兼容性
- `_call_doubao_stream` 是**同步生成器**（火山引擎 SDK 的流式响应是同步迭代器）
- `stream_summary` 等方法也是**同步生成器**
- SSE 端点 `_stream_summary_generator` 是 `async` 函数，内部用 `for`（非 `async for`）迭代

```python
# ❌ 错误：async for 调用同步生成器，不会产出任何数据
async for chunk in ai_summarizer.stream_summary(...):
    yield chunk

# ✅ 正确：同步 for 迭代
for chunk in ai_summarizer.stream_summary(...):
    yield chunk
```

### 火山引擎 SDK 事件结构
```
ResponseCreatedEvent        → 初始事件，无内容
ResponseInProgressEvent     → 处理中，无内容
ResponseOutputItemAddedEvent → 输出项添加
ResponseReasoningSummaryTextDeltaEvent → 文本增量，内容在 .delta 属性
```

```python
# ❌ 错误：检查 event.output
if hasattr(event, 'output') and event.output:
    for item in event.output:
        if hasattr(item, 'content') and item.content:
            ...

# ✅ 正确：直接检查 delta 属性
if hasattr(event, 'delta') and event.delta:
    yield event.delta
```

## 文件清单

### 新增文件
| 文件 | 说明 | 行数 |
|------|------|------|
| `backend/app/api/summarize.py` | SSE 端点路由 | ~200 |
| `backend/app/services/ai_summarizer.py` | AI 总结服务 | ~400 |
| `backend/app/services/subtitle_extractor.py` | 字幕提取服务 | ~200 |
| `frontend/src/pages/SummarizePage.tsx` | 前端页面 | ~450 |

### 修改文件
| 文件 | 变更 |
|------|------|
| `backend/app/main.py` | 注册 summarize router |
| `backend/app/core/config.py` | 添加 volcengine API 配置 |
| `backend/app/models/schemas.py` | 添加 SummarizeRequest 等 schema |
| `backend/requirements.txt` | 添加 volcenginesdkarkruntime |
| `frontend/src/App.tsx` | 添加 summarize 路由 |
| `frontend/src/components/Header.tsx` | 添加导航入口 |
| `frontend/src/context/AppContext.tsx` | 添加 videoUrl 状态 |
| `frontend/src/pages/HomePage.tsx` | 添加 AI 总结入口按钮 |

## 环境配置

### 后端 .env
```env
VOLCENGINE_API_KEY=your-api-key
VOLCENGINE_MODEL=doubao-seed-2-0-lite-260215
VOLCENGINE_BASE_URL=https://ark.cn-beijing.volces.com/api/v3
```

### 依赖安装
```bash
pip install volcenginesdkarkruntime
```

## 已知局限

1. **B站视频字幕**：大多数B站视频只有弹幕无字幕，AI 生成内容有限
2. **编码问题**：视频标题/描述在控制台中显示乱码（GBK 编码），前端显示正常
3. **长视频**：字幕过长的视频可能超出 API 限制，需要分段处理

## 后续优化方向

- [ ] 接入 Whisper 语音识别处理无字幕视频
- [ ] 支持多语言字幕提取
- [ ] 长视频自动分段处理
- [ ] PDF 导出功能
- [ ] 用户账户系统
