# VideoGrab - 万能视频下载器

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Python](https://img.shields.io/badge/Python-3.9+-green.svg)](https://www.python.org/)
[![React](https://img.shields.io/badge/React-18+-blue.svg)](https://react.dev/)

一键解析全网视频，支持抖音、B站、YouTube 等平台，高清无水印下载。

## ✨ 特性

- 🎬 **多平台支持** - 抖音、B站、YouTube、TikTok 等 1000+ 平台
- 🚀 **批量下载** - 支持多个视频同时下载
- 💎 **无水印** - 抖音视频自动获取无水印版本
- 📊 **实时进度** - 可视化下载进度追踪
- 🎨 **现代 UI** - React + Tailwind CSS 蓝白色高级界面
- 🔒 **防盗链绕过** - 智能处理各平台图片防盗链
- 🤖 **AI 视频总结** - 智能生成摘要、提取字幕、思维导图、AI 问答

## 🚀 快速开始

### 环境要求

- Python 3.9+
- Node.js 18+
- ffmpeg（可选，用于 B站视频音频合并）

### 安装运行

**后端**:
```bash
cd backend
python -m venv venv
.\venv\Scripts\activate  # Windows
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

**前端**:
```bash
cd frontend
npm install
npm run dev
```

**访问**: http://localhost:5174

## 📖 使用指南

### 基本下载流程

1. **粘贴链接** - 在输入框粘贴视频链接（支持批量，每行一个）
2. **添加链接** - 点击蓝色「添加链接」按钮
3. **解析视频** - 点击「解析视频」获取视频信息
4. **选择格式** - 选择画质和下载模式（原视频/带字幕）
5. **开始下载** - 点击「开始下载」，自动跳转到进度页面
6. **下载到本地** - 下载完成后点击「下载到本地」按钮

### 支持的平台

| 平台 | URL 格式 | 特性 |
|------|---------|------|
| 抖音 | `v.douyin.com` | 无水印下载 ✅ |
| B站 | `bilibili.com` | 多画质选择 |
| YouTube | `youtube.com` | 4K/8K 支持 |
| TikTok | `tiktok.com` | 无水印下载 |
| 快手 | `kuaishou.com` | 基础支持 |

## 🛠️ 技术栈

**后端**: Python 3.11 + FastAPI + yt-dlp + httpx

**前端**: React 18 + TypeScript + Tailwind CSS + Vite

## 📚 文档

- [功能清单](docs/FEATURES.md)
- [技术设计文档](docs/TECHNICAL_DESIGN.md)
- [API 接口文档](docs/API.md)
- [开发指南](docs/DEVELOPMENT.md)
- [AI 视频总结功能](docs/AI_SUMMARIZE_FEATURE.md)

## 🔧 配置

创建 `.env` 文件:

```env
DOWNLOAD_DIR=./downloads
MAX_CONCURRENT_DOWNLOADS=3
DEBUG=true
VOLCENGINE_API_KEY=your-volcengine-api-key
VOLCENGINE_MODEL=doubao-seed-2-0-lite-260215
VOLCENGINE_BASE_URL=https://ark.cn-beijing.volces.com/api/v3
```

## 📄 License

[MIT License](LICENSE)

---

**Star ⭐ 本项目支持开发！**