# AI 视频总结功能 - 开发文档

## 功能概述

AI 视频总结功能是一个基于大语言模型的视频内容分析系统，支持：
- 视频摘要生成（200字以内）
- 字幕提取与展示
- 思维导图生成
- AI 智能问答

## 技术架构

### 后端
- **FastAPI** - Web 框架
- **火山引擎 豆包** - AI 模型 (doubao-seed-2-0-lite-260215)
- **yt-dlp** - 视频信息提取
- **SSE** - Server-Sent Events 流式输出

### 前端
- **React + TypeScript**
- **Tailwind CSS** - 样式
- **Fetch API + ReadableStream** - 流式接收

## 核心文件

### 后端
```
backend/
├── app/api/summarize.py          # SSE API 端点
├── app/services/ai_summarizer.py  # AI 服务
├── app/services/subtitle_extractor.py  # 字幕提取
├── app/core/config.py            # 配置
├── app/models/schemas.py         # 数据模型
└── .env.example                  # 环境变量示例
```

### 前端
```
frontend/src/
├── pages/SummarizePage.tsx       # 总结页面
├── context/AppContext.tsx        # 状态管理
├── components/Header.tsx         # 导航更新
├── services/api.ts               # API 服务
└── types/index.ts                # 类型定义
```

## API 端点

| 端点 | 方法 | 描述 |
|------|------|------|
| `/api/info` | POST | 获取视频信息 |
| `/api/summarize/stream/summary` | POST | 流式生成摘要 |
| `/api/summarize/stream/subtitle` | POST | 提取字幕 |
| `/api/summarize/stream/mindmap` | POST | 流式生成思维导图 |
| `/api/summarize/stream/chat` | POST | 流式问答 |

## 环境配置

```bash
# backend/.env
VOLCENGINE_API_KEY=your-api-key-here
VOLCENGINE_MODEL=doubao-seed-2-0-lite-260215
VOLCENGINE_BASE_URL=https://ark.cn-beijing.volces.com/api/v3
```

## 运行方式

```bash
# 后端
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload

# 前端
cd frontend
npm install
npm run dev
```

## 开发要点

### 1. SSE 流式输出
- 后端使用 `StreamingResponse` + `AsyncGenerator`
- 前端使用 `fetch` + `ReadableStream`（EventSource 只支持 GET）
- 数据格式：`data: {"type": "summary", "data": "文本"}\n\n`
- 结束标记：`data: [DONE]\n\n`

### 2. 字幕提取策略
1. 优先提取平台自带字幕（SRT/VTT/ASS）
2. 无字幕时回退到视频描述
3. 内容过短时仍尝试生成（基于标题+描述）

### 3. AI 模型集成
- 使用火山引擎官方 SDK (`volcenginesdkarkruntime`)
- 流式事件处理：`ResponseReasoningSummaryTextDeltaEvent.delta`
- 支持思考过程流式输出

## 注意事项

1. **B站视频** - 大部分无字幕，只有弹幕
2. **YouTube** - 通常有自动字幕，但可能连接超时
3. **长视频** - 字幕过长可能超出模型上下文限制

## 后续优化

- [ ] 接入 Whisper 语音识别
- [ ] 支持多语言翻译
- [ ] PDF 导出功能
- [ ] 批量处理任务

---

开发时间：2026-03-26
开发者：小楼的龙虾 🦞
