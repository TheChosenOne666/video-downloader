# VideoGrab 开发日志

## 2026-04-01 - v2.5 GEO 生成式引擎优化

### 新增功能

#### FAQ 常见问题页面
- 路径 `/faq`
- 14 个常见问题，8 个分类
- FAQPage Schema 结构化数据
- GEO 友好的问答格式

#### 使用教程页面
- 路径 `/tutorial`
- 快速入门（3步）
- 5 个详细教程（抖音、B站、YouTube、批量、AI功能）
- HowTo Schema 结构化数据

#### 增强 Schema.org 结构化数据
- WebApplication 添加 aggregateRating、usageInfo、supportedPlatform
- 新增 FAQPage Schema（14个问答）
- 新增 HowTo Schema（使用教程）
- 更完整的组织信息和功能列表

#### 导航优化
- Header 添加教程入口
- Header 添加帮助入口

### GEO 优化价值

| Schema 类型 | 价值 |
|-------------|------|
| WebApplication | AI 可准确理解产品类型、功能、价格 |
| FAQPage | AI 可直接引用问答内容 |
| HowTo | AI 可引用教程步骤 |

### 新增文件

```
frontend/src/pages/
├── FAQPage.tsx       # 常见问题页面
└── TutorialPage.tsx  # 使用教程页面
docs/
└── GEO_OPTIMIZATION.md  # GEO 优化实施报告
```

### 修改文件

| 文件 | 改动说明 |
|------|----------|
| `SEO.tsx` | 增强结构化数据 |
| `App.tsx` | 添加 FAQ 和 Tutorial 路由 |
| `Header.tsx` | 添加教程和帮助入口 |
| `seo.ts` | 添加新页面 SEO 配置 |
| `sitemap.xml` | 添加新页面 |

---

## 2026-04-01 - v2.4 SEO 搜索引擎优化

### 新增功能

#### URL 路由
- 使用 `react-router-dom` 实现真实 URL 路由
- 每个页面可独立访问，支持浏览器前进/后退
- 路由结构：`/`、`/progress`、`/complete`、`/summarize`、`/subtitle`

#### SEO 优化
- 每个页面独立的 TDK（Title/Description/Keywords）
- Open Graph 标签支持社交分享预览
- Schema.org WebApplication 结构化数据
- robots.txt 搜索引擎爬虫规则
- sitemap.xml 网站地图
- 语义化 HTML（正确的 H1 标签使用）

#### 品牌更新
- 品牌名从 "VideoGrab" 更新为 "万能视频下载"
- 面向国内用户的中文品牌定位

### Bug 修复

#### 点击"开始下载"需要两次才跳转
**根因**: ProgressPage 的 useEffect 在 `taskId` 为空时立即跳回首页，导致第一次点击后立即被重定向。

**修复**: 改为检查 `taskId` 和 `urls.length` 同时为空才跳转首页。

```tsx
// 修复前
useEffect(() => {
  if (!taskId) setPage('home');
}, [taskId, setPage]);

// 修复后
useEffect(() => {
  if (!taskId && urls.length === 0) {
    reset();
  }
}, [taskId, urls.length, reset]);
```

### 新增文件

```
frontend/
├── public/
│   ├── robots.txt          # 搜索引擎爬虫规则
│   └── sitemap.xml         # 网站地图
└── src/
    ├── config/
    │   └── seo.ts          # SEO 配置文件
    └── components/
        └── SEO.tsx         # SEO 组件
docs/
└── SEO_OPTIMIZATION.md     # SEO 优化实施报告
```

### 修改文件

| 文件 | 改动说明 |
|------|----------|
| `main.tsx` | 添加 BrowserRouter + HelmetProvider |
| `App.tsx` | 使用 Routes 替代状态切换 |
| `AppContext.tsx` | 使用 useNavigate 实现路由跳转 |
| `index.html` | 完善 SEO 标签 |
| `Header.tsx` | 品牌名更新，移除 h1 |
| `HomePage.tsx` | 添加 SEO 组件，h2→h1 |
| `ProgressPage.tsx` | 添加 SEO 组件，修复导航 bug |
| `CompletePage.tsx` | 添加 SEO 组件 |
| `SummarizePage.tsx` | 添加 SEO 组件 |
| `SubtitleGenerationPage.tsx` | 添加 SEO 组件 |

### 技术要点

#### react-helmet-async 动态 SEO
```tsx
<Helmet>
  <title>{fullTitle}</title>
  <meta name="description" content={config.description} />
  <meta name="keywords" content={config.keywords} />
  <meta property="og:title" content={fullTitle} />
  <!-- ... -->
</Helmet>
```

#### Schema.org 结构化数据
```json
{
  "@context": "https://schema.org",
  "@type": "WebApplication",
  "name": "万能视频下载",
  "url": "https://xiaolou.video",
  "offers": { "price": "0", "priceCurrency": "CNY" }
}
```

### 部署注意事项

- [ ] 配置 DNS 解析 `xiaolou.video`
- [ ] 创建 OG 分享图 `/public/og-cover.png`（1200×630px）
- [ ] 百度站长平台提交 sitemap
- [ ] Google Search Console 提交 sitemap

---

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
