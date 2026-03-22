# VideoGrab - 万能视频下载器

一个支持多平台的视频下载工具，基于 yt-dlp 构建，支持 YouTube、Bilibili、抖音、快手等 1000+ 网站。

## 项目结构

```
video-downloader/
├── backend/          # FastAPI 后端
│   ├── app/          # 应用代码
│   ├── tests/        # 单元测试
│   └── requirements.txt
├── frontend/         # React 前端
│   ├── src/          # 源代码
│   └── package.json
└── docs/             # 文档
    ├── requirements.md    # 需求分析
    └── architecture.md    # 架构设计
```

## 快速开始

### 后端启动

```bash
cd backend
python -m venv venv
.\venv\Scripts\pip install -r requirements.txt
.\venv\Scripts\uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### 前端启动

```bash
cd frontend
npm install
npm run dev
```

访问 http://localhost:5173

## 功能特性

- ✅ 支持 1000+ 视频平台
- ✅ 批量下载
- ✅ 格式/清晰度选择
- ✅ 实时进度显示
- ✅ 响应式设计（手机/PC）

## 技术栈

**后端：**
- FastAPI
- yt-dlp
- Python 3.11+

**前端：**
- React 18
- TypeScript
- Vite
- Tailwind CSS

## 部署

- 前端：Vercel
- 后端：VPS/云服务器
- 域名：video.downloader.xiaolouv

## 开发文档

- [需求分析](docs/requirements.md)
- [架构设计](docs/architecture.md)

## License

MIT
