# VideoGrab - 视频批量下载工具

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Python](https://img.shields.io/badge/Python-3.9+-green.svg)](https://www.python.org/)
[![React](https://img.shields.io/badge/React-18+-blue.svg)](https://react.dev/)

一键解析全网视频，支持抖音、B站、YouTube 等平台，高清无水印下载。

## ✨ 特性

- 🎬 **多平台支持** - 抖音、B站、YouTube、TikTok 等 1000+ 平台
- 🚀 **批量下载** - 支持多个视频同时下载
- 💎 **无水印** - 抖音视频自动获取无水印版本
- 📊 **实时进度** - 可视化下载进度追踪
- 🎨 **现代 UI** - React + Tailwind CSS 精美界面
- 🔒 **防盗链绕过** - 智能处理各平台图片防盗链
- 🤖 **AI 视频总结** - 智能生成摘要、提取字幕、思维导图、AI 问答（SSE 流式输出）

## 📸 截图

<!-- 添加截图 -->

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
uvicorn app.main:app --host 0.0.0.0 --port 8001
```

**前端**:
```bash
cd frontend
npm install
npm run dev
```

**访问**: http://localhost:5174

## 📖 使用指南

### 抖音下载

1. 复制抖音分享链接（如 `https://v.douyin.com/xxx`）
2. 粘贴到输入框
3. 点击"检查视频"获取信息
4. 点击"开始下载"

**特点**: 自动获取无水印视频

### B站下载

1. 复制 B站视频链接（如 `https://www.bilibili.com/video/BVxxx`）
2. 粘贴到输入框
3. 点击"检查视频"
4. 选择格式后下载

**注意**: 当前仅下载视频轨道（无音频），可安装 ffmpeg 支持合并

### YouTube 下载

1. 复制 YouTube 链接
2. 粘贴到输入框
3. 选择画质后下载

## 🛠️ 技术栈

**后端**:
- Python 3.11
- FastAPI
- yt-dlp
- httpx

**前端**:
- React 18
- TypeScript
- Tailwind CSS
- Vite

## 📚 文档

- [技术设计文档](docs/TECHNICAL_DESIGN.md)
- [API 接口文档](docs/API.md)
- [开发指南](docs/DEVELOPMENT.md)
- [AI 视频总结功能](docs/AI_SUMMARIZE_FEATURE.md)

## 🔧 配置

### 后端配置

编辑 `backend/app/core/config.py`:

```python
class Settings(BaseSettings):
    download_dir: Path = Path("downloads")  # 下载目录
    max_concurrent_downloads: int = 3       # 最大并发数
    debug: bool = True                      # 调试模式
```

### 环境变量

创建 `.env` 文件:

```env
DOWNLOAD_DIR=./downloads
MAX_CONCURRENT_DOWNLOADS=3
DEBUG=true
VOLCENGINE_API_KEY=your-volcengine-api-key
VOLCENGINE_MODEL=doubao-seed-2-0-lite-260215
VOLCENGINE_BASE_URL=https://ark.cn-beijing.volces.com/api/v3
```

## 🌐 支持的平台

| 平台 | URL 格式 | 特性 |
|------|---------|------|
| 抖音 | `v.douyin.com` | 无水印下载 ✅ |
| B站 | `bilibili.com` | 多画质选择 |
| YouTube | `youtube.com` | 4K/8K 支持 |
| TikTok | `tiktok.com` | 无水印下载 |
| 快手 | `kuaishou.com` | 基础支持 |
| 西瓜视频 | `ixigua.com` | 基础支持 |
| 微博 | `weibo.com` | 基础支持 |

*完整列表见 [yt-dlp 支持平台](https://github.com/yt-dlp/yt-dlp/blob/master/supportedsites.md)*

## 🐛 已知问题

### B站视频无音频

**原因**: B站视频音频分离，需要 ffmpeg 合并

**解决方案**:
1. 安装 ffmpeg
2. 或使用仅视频轨道下载

### 抖音部分视频无法下载

**原因**: 需要登录或视频已删除

**解决方案**: 尝试其他公开视频

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

### 开发流程

1. Fork 本仓库
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'feat: add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

### 代码规范

- Python: PEP 8
- TypeScript: ESLint + Prettier
- 提交信息: Conventional Commits

## 📄 License

[MIT License](LICENSE)

## 🙏 致谢

- [yt-dlp](https://github.com/yt-dlp/yt-dlp) - 强大的视频下载工具
- [FastAPI](https://fastapi.tiangolo.com/) - 现代高性能 Web 框架
- [React](https://react.dev/) - 用户界面库

## 📮 联系方式

- Issue: [GitHub Issues](https://github.com/TheChosenOne666/video-downloader/issues)
- Email: your-email@example.com

---

**Star ⭐ 本项目支持开发！**
