# VideoGrab - 视频下载器前端

一个现代化的视频批量下载工具界面，支持多平台视频解析与下载。

![Theme Preview](https://img.shields.io/badge/Theme-Dark%20%2B%20Gold-gold?style=for-the-badge)
![React](https://img.shields.io/badge/React-18-blue?style=for-the-badge)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge)
![Vite](https://img.shields.io/badge/Vite-5-purple?style=for-the-badge)

## ✨ 特性

- 🎨 **独特设计风格** - 深色主题 + 金色强调色，专业工具感
- 📦 **批量下载** - 支持一次添加多个视频链接
- 📊 **实时进度** - 显示下载速度、进度百分比、预计剩余时间
- 🎉 **炫酷动画** - 成功下载动画反馈
- 📱 **响应式设计** - 完美适配桌面和移动设备
- 🔒 **本地处理** - 数据不上传服务器，保护隐私

## 🚀 快速开始

### 前置要求

- Node.js 18+ 
- 后端服务运行在 `http://localhost:8000`

### 安装依赖

```bash
npm install
```

### 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:5173 即可使用。

### 构建生产版本

```bash
npm run build
```

## 📁 项目结构

```
frontend/
├── src/
│   ├── components/       # UI 组件
│   │   ├── Header.tsx           # 页头导航
│   │   ├── URLInput.tsx         # 批量 URL 输入框
│   │   ├── FormatSelector.tsx   # 格式选择器
│   │   ├── FeatureCard.tsx      # 功能特性卡片
│   │   ├── ProgressCard.tsx    # 下载进度卡片
│   │   └── SuccessAnimation.tsx # 成功动画
│   ├── pages/            # 页面组件
│   │   ├── HomePage.tsx        # 首页
│   │   ├── ProgressPage.tsx    # 下载进度页
│   │   └── CompletePage.tsx    # 完成页
│   ├── context/           # React Context
│   │   └── AppContext.tsx      # 全局状态管理
│   ├── services/          # API 服务
│   │   └── api.ts               # 后端 API 调用
│   ├── types/             # TypeScript 类型定义
│   │   └── index.ts             # 类型声明
│   ├── App.tsx            # 根组件
│   ├── main.tsx           # 入口文件
│   └── index.css          # 全局样式
├── public/               # 静态资源
├── index.html            # HTML 入口
├── postcss.config.js     # PostCSS 配置 (Tailwind v4)
└── vite.config.ts        # Vite 配置
```

## 🎨 设计规范

### 配色方案

| 名称 | 色值 | 用途 |
|------|------|------|
| Night | `#0a0a0f` | 主背景色 |
| Surface | `#12121a` | 卡片背景 |
| Surface Light | `#1a1a25` | 悬停状态 |
| Gold | `#f59e0b` | 主强调色 |
| Gold Light | `#fbbf24` | 渐变高亮 |

### 组件样式

- **按钮** - 使用 `.btn-primary` 和 `.btn-secondary` 类
- **输入框** - 使用 `.input-glow` 类获得发光效果
- **卡片** - 使用 `.glass-card` 类获得毛玻璃效果
- **进度条** - 使用 `.progress-bar` 和 `.progress-fill` 类

## 🔌 API 接口

### 获取视频信息

```
POST /api/info
Body: { "urls": ["url1", "url2"] }
Response: VideoInfo[]
```

### 开始下载

```
POST /api/download
Body: { "urls": ["url1"], "format": "best" }
Response: { "taskId": "xxx", "videos": [...] }
```

### 查询进度

```
GET /api/status/{task_id}
Response: { "taskId": "xxx", "status": "processing", "progress": 50, "videos": [...] }
```

### 下载文件

```
GET /api/download/{task_id}/{filename}
```

## 🛠️ 技术栈

- **React 18** - UI 框架
- **TypeScript** - 类型安全
- **Vite** - 构建工具
- **Tailwind CSS** - 样式框架
- **Context API** - 状态管理

## 📝 许可证

MIT License
