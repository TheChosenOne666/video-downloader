# VideoGrab 开发日志

## 2026-04-01 - v2.3 界面重构与流程优化

### 修复的问题

#### 1. 点击"开始下载"需要点两次才跳转
**根因**: `AppContext` 中 `startDownloading` 和 `checkUrls` 使用闭包里的 `state.urls`，但 React state 异步更新导致闭包过期。用户第一次点击时 `urls` 为空，操作失败但无提示。

**修复**:
- 引入 `useRef` 保存最新 state，所有异步操作从 `stateRef.current` 读取
- `startDownloading` 立即设置 `page: 'progress'` 跳转，不等待 API 返回
- `checkUrls` 从 `stateRef.current.urls` 读取，而非闭包 `state.urls`

#### 2. 下载失败报错 "Requested format is not available"
**根因**: 前端传 `format_id: 'best'`，后端直接传给 yt-dlp，但 yt-dlp 不认 `'best'` 作为 format_id。

**修复**:
- 前端：`'best'` 时传 `null`，让后端走默认逻辑
- 后端：`format_id in ('best', '')` 时走默认分支
- 新增 `audio_only` 参数支持

#### 3. 解析流程不清晰
**修复**:
- 「添加链接」按钮改为蓝色 `btn-primary`
- 「解析视频」按钮 disabled 条件改为 `urls.length === 0`
- 用户必须先点「添加链接」才能点「解析视频」

### 界面改动

#### 蓝白色系配色
- 主色: `#3b82f6` (蓝色)
- 背景: `#ffffff` (白色)
- 卡片: 浅灰玻璃效果
- 去除黑色 AI 风格

#### 按钮逻辑重构
- 解析前: 只显示「解析视频」
- 解析后: 只显示「开始下载」
- 预览视频按钮隐藏

#### 进度页面
- 实时轮询显示下载进度
- 每个文件独立显示状态和进度条
- 完成后显示「下载到本地」按钮
- 支持批量下载全部文件

### 代码改动

**前端**:
- `src/context/AppContext.tsx` - 引入 `useRef` 解决闭包问题，新增 `inputValue` 状态
- `src/pages/ProgressPage.tsx` - 自己管理轮询逻辑，显示下载按钮
- `src/pages/HomePage.tsx` - 按钮互斥逻辑，disabled 条件修正
- `src/components/URLInput.tsx` - 「添加链接」按钮改为蓝色
- `src/services/api.ts` - `startDownload` 新增 `audioOnly` 参数

**后端**:
- `backend/app/services/downloader.py` - `format_id='best'` 时走默认分支

### 技术要点

#### React 闭包陷阱
```tsx
// ❌ 错误：闭包里的 state 可能过期
const startDownloading = useCallback(async () => {
  const urls = state.urls; // 可能是旧值
}, [state.urls]);

// ✅ 正确：从 ref 读取最新值
const stateRef = useRef(state);
stateRef.current = state;

const startDownloading = useCallback(async () => {
  const urls = stateRef.current.urls; // 始终最新
}, []); // 无依赖
```

#### yt-dlp format 选择器
- `best` 是前端概念，不是 yt-dlp 的 format_id
- 后端默认逻辑: `bestvideo[ext=mp4]/bestvideo/bestaudio/best`
- 传 `null` 让后端自动选择最佳格式

### 测试验证

- ✅ 后端 API: `/api/download` → `/api/status/{taskId}` → `/api/download/{taskId}/{filename}`
- ✅ 前端流程: 添加链接 → 解析 → 开始下载 → 进度页面 → 下载到本地
- ✅ 构建无错误

---

## 2026-03-26 - v2.1 AI 字幕生成

### 新增功能
- Faster-Whisper AI 字幕生成
- 字幕硬编码（FFmpeg）
- Markdown 摘要渲染
- 思维导图全屏 + 导出
- UI Tab 页签重构

---

## 2026-03-25 - v2.0 AI 视频总结

### 核心功能
- 视频总结摘要 (200字)
- 字幕/转录文本提取
- 思维导图生成
- AI 问答功能

### 技术选型
- AI 模型: 火山引擎 Kimi K2
- 字幕方案: yt-dlp 提取平台自带字幕
- 总结风格: 简洁版 (200字)