# VideoGrab v2.2 更新日志

**发布日期**: 2026-03-31  
**开发者**: 小楼的龙虾 🦞

---

## 🐛 Bug 修复

### 1. 下载功能黑屏问题 ✅

**现象**: 点击下载后显示进度条，然后黑屏，控制台一直轮询但无响应。

**根因**: 
- 前端 `AppContext.tsx` 轮询逻辑存在闭包问题
- `state.urls` 在 `setInterval` 回调中是旧值
- 导致 `tasks` 状态更新错误，页面无法正确渲染

**修复**:
```typescript
// ❌ 错误：闭包捕获旧值
tasks: state.urls.map((url, i) => {
  const video = status.videos[i];
  // ...
})

// ✅ 正确：使用 prev 获取最新状态
tasks: prev.tasks.map((task, i) => {
  const video = status.videos[i];
  // ...
})
```

**修改文件**: `frontend/src/context/AppContext.tsx`

---

### 2. 思维导图只显示一个点 ✅

**现象**: 思维导图页面只显示一个中心节点，没有展开的分支结构。

**根因**:
- 后端 `ai_summarizer.py` 的 `stream_mindmap` 方法返回 **JSON 格式**
- 前端 `MindmapGraph.tsx` 使用 `markmap-lib` 解析 **Markdown 格式**
- 格式不匹配导致解析失败，只显示根节点

**修复**:
修改后端 prompt，让 AI 直接输出 Markdown 格式：
```python
system_prompt = """你是思维导图生成助手。直接输出 Markdown 格式的思维导图，不要输出其他任何内容。

格式要求：
# 中心主题
## 一级分支1
- 要点1
- 要点2
## 一级分支2
- 要点1

直接开始输出，不要有任何开场白或解释。"""
```

**修改文件**: `backend/app/services/ai_summarizer.py`

---

### 3. 字幕提取返回标题而非字幕 ✅

**现象**: 点击"提取字幕"后返回的是视频标题/描述，而非真正的字幕内容。

**根因**:
- B站弹幕（danmaku）被误识别为字幕类型
- `subtitle_extractor.py` 没有过滤掉弹幕
- 无字幕视频 fallback 逻辑过于激进

**修复**:
1. 过滤掉 `danmaku` 类型的"字幕"
2. 抖音视频使用专用下载器获取信息
3. 明确区分"有字幕"和"无字幕"状态

```python
# 过滤弹幕
NON_SUBTITLE_TYPES = {"danmaku", "comments", "bullet_comments"}
all_sub_langs = [lang for lang in all_sub_langs if lang.lower() not in NON_SUBTITLE_TYPES]

# 抖音视频专用处理
if douyin_downloader.is_douyin_url(url):
    douyin_info = await douyin_downloader.get_video_info(url)
    # 使用描述作为 fallback
```

**修改文件**: `backend/app/services/subtitle_extractor.py`

---

## ✨ 功能优化

### 1. "字幕文本"改为"标题信息" ✅

**原因**: 
- 大部分视频没有字幕（只有弹幕）
- 用户需要快速查看视频基本信息

**变更**:
- Tab 名称：`字幕文本` → `标题信息`
- 内容：显示视频标题、上传者、时长、播放量、描述
- 无需 API 调用，页面加载即显示
- 添加"复制标题"按钮

**修改文件**: `frontend/src/pages/SummarizePage.tsx`

---

### 2. 抖音视频支持优化 ✅

**变更**:
- 字幕提取使用 `douyin_downloader` 获取视频信息
- 避免 yt-dlp 需要 cookies 的问题
- 使用视频描述作为内容来源

**修改文件**: `backend/app/services/subtitle_extractor.py`

---

## 🏗️ 架构改进

### 前端状态管理优化

**问题**: AppContext 中状态更新逻辑分散，闭包问题频发。

**改进**:
- 统一使用 `prev` 参数获取最新状态
- 轮询逻辑集中在 `startDownloading` 中
- 清晰的状态流转：`idle` → `loading` → `done`/`error`

---

## 📊 测试结果

| 功能 | 测试视频 | 结果 |
|------|---------|------|
| 视频下载 | B站 BV1GJ411x7h7 | ✅ 成功，15.3MB |
| 思维导图 | B站 BV1GJ411x7h7 | ✅ Markdown 格式正确 |
| 标题信息 | 抖音视频 | ✅ 显示标题、描述 |
| 抖音字幕提取 | 抖音视频 | ✅ 返回描述内容 |

---

## 📁 修改文件清单

### 后端
| 文件 | 变更 |
|------|------|
| `backend/app/services/ai_summarizer.py` | 思维导图 prompt 改为 Markdown 格式 |
| `backend/app/services/subtitle_extractor.py` | 过滤弹幕，抖音专用处理 |

### 前端
| 文件 | 变更 |
|------|------|
| `frontend/src/context/AppContext.tsx` | 修复轮询闭包问题 |
| `frontend/src/pages/SummarizePage.tsx` | 字幕 Tab 改为标题信息 Tab |

---

## 🚀 后续规划

### 短期（1-2周）
- [ ] 接入 Whisper AI 自动生成字幕（针对无字幕视频）
- [ ] 优化下载速度，支持多线程下载

### 中期（1-2月）
- [ ] 支持更多平台（快手、小红书等）
- [ ] 用户收藏功能

### 长期（3-6月）
- [ ] 移动端适配
- [ ] 浏览器插件版本

---

## 🔧 开发环境

- **Python**: 3.11 (venv)
- **Node.js**: 22.x
- **AI 模型**: 火山引擎豆包 `doubao-seed-2-0-lite-260215`
- **前端框架**: React 18 + TypeScript + Tailwind CSS
- **后端框架**: FastAPI

---

**开发者**: 小楼的龙虾 🦞  
**完成时间**: 2026-03-31 17:00 GMT+8
