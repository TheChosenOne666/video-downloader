# 视频下载器项目 - 技术设计文档

## 项目概述

**项目名称**：VideoGrab - 视频批量下载工具  
**技术栈**：Python/FastAPI + React/TypeScript + yt-dlp  
**仓库地址**：https://github.com/TheChosenOne666/video-downloader  
**最后更新**：2026-03-25

---

## 系统架构

```
┌─────────────────┐      ┌─────────────────┐
│   前端 (React)   │◄────►│  后端 (FastAPI) │
│   localhost:5174 │      │   localhost:8001 │
└─────────────────┘      └─────────────────┘
                              │
                    ┌─────────┴─────────┐
                    │                   │
            ┌───────▼──────┐   ┌───────▼──────┐
            │  yt-dlp 核心  │   │ 抖音专用解析器 │
            │  (通用下载)   │   │  (无水印获取) │
            └──────────────┘   └──────────────┘
```

---

## 目录结构

```
video-downloader/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   └── download.py          # API 路由（图片代理、下载端点）
│   │   ├── core/
│   │   │   └── config.py            # 配置管理
│   │   ├── models/
│   │   │   └── schemas.py           # 数据模型
│   │   ├── services/
│   │   │   ├── downloader.py        # yt-dlp 下载服务
│   │   │   ├── douyin_downloader.py # 抖音专用下载器 v10
│   │   │   └── task_manager.py      # 任务管理器
│   │   └── main.py                  # FastAPI 应用入口
│   ├── downloads/                   # 下载文件存储目录
│   ├── venv/                        # Python 虚拟环境
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/              # UI 组件
│   │   ├── context/
│   │   │   └── AppContext.tsx       # 全局状态管理（轮询逻辑）
│   │   ├── pages/                   # 页面组件
│   │   ├── services/
│   │   │   └── api.ts               # API 客户端
│   │   ├── types/                   # TypeScript 类型定义
│   │   └── main.tsx
│   ├── tailwind.config.js           # Tailwind 配置
│   └── package.json
└── README.md
```

---

## 核心功能模块

### 1. 抖音下载模块（douyin_downloader.py v10）

**原理**：
1. 从分享链接提取 video_id（302 重定向）
2. 优先调用官方 API，失败时从分享页面提取数据
3. 替换 `playwm` 为 `play` 获取无水印视频

**关键代码**：
```python
# 无水印 URL 转换
if "playwm" in play_url:
    play_url = play_url.replace("playwm", "play")
```

**支持的 URL 格式**：
- `https://v.douyin.com/xxx`
- `https://www.douyin.com/video/xxx`

**测试结果**：
- ✅ 下载成功：26MB 视频
- ✅ 无水印获取
- ✅ 进度追踪正常

---

### 2. B站下载模块（yt-dlp）

**挑战**：
- 视频音频分离（需要 ffmpeg 合并或单独下载）
- 图片防盗链（需要完整浏览器指纹）

**解决方案**：
```python
# 仅下载视频轨道（避免 ffmpeg 依赖）
opts["format"] = "bestvideo[ext=mp4]/bestvideo/"

# 图片代理 - B站完整浏览器指纹
headers = {
    "Referer": "https://www.bilibili.com/",
    "Origin": "https://www.bilibili.com",
    "Sec-Ch-Ua": '"Chromium";v="122"',
    "Sec-Fetch-Dest": "image",
    # ... 完整指纹
}
```

**测试结果**：
- ✅ 下载成功：53MB 视频
- ⚠️ 仅视频轨道（无音频）
- ✅ 图片代理正常（浏览器环境）

---

### 3. 图片代理模块

**端点**：`GET /api/proxy/image?url=<encoded_url>`

**支持的防盗链平台**：
- B站（hdslb.com）- 完整浏览器指纹
- 抖音（douyinpic.com）- 移动端 User-Agent
- 其他平台 - 自动 Referer

**缓存策略**：
```python
"Cache-Control": "public, max-age=86400",  # 24 小时
```

---

### 4. 任务管理模块

**任务状态流转**：
```
pending → downloading → completed
                    └→ failed
```

**API 端点**：
- `POST /api/download` - 创建下载任务
- `GET /api/status/{task_id}` - 查询任务状态
- `GET /api/download/{task_id}/{filename}` - 下载文件
- `DELETE /api/task/{task_id}` - 删除任务

---

### 5. 前端轮询模块

**实现方式**：500ms 轮询 + 自动完成检测

**关键代码**：
```typescript
// 启动轮询
const pollInterval = setInterval(async () => {
  const status = await getTaskStatus(response.taskId);
  
  // 更新进度
  setState(prev => ({
    ...prev,
    tasks: state.urls.map((url, i) => ({
      ...prev.tasks[i],
      progress: status.videos[i]?.progress || 0,
    })),
  }));
  
  // 检查完成
  if (status.status === 'completed') {
    clearInterval(pollInterval);
    // 跳转完成页面
  }
}, 500);
```

**注意事项**：
- 后端返回 `task_id`（snake_case），前端映射为 `taskId`（camelCase）
- 轮询最多 5 分钟（600 次）

---

## 已知问题与解决方案

### 问题 1：B站视频无音频

**原因**：B站视频音频分离，需要 ffmpeg 合并

**当前方案**：仅下载视频轨道（用户可选）

**后续优化**：
1. 安装 ffmpeg 支持合并
2. 前端添加格式选择器（视频/音频）
3. 后端提供两个下载选项

---

### 问题 2：前端进度不更新

**原因**：
1. `task_id` 字段映射错误（snake_case vs camelCase）
2. 轮询未正确启动

**解决方案**：
```typescript
// API 响应映射
return {
  taskId: data.task_id,  // snake_case → camelCase
  videos: data.videos || [],
};
```

---

### 问题 3：抖音下载进度报错

**原因**：`progress.update()` 参数类型错误

**解决方案**：
```python
# 错误
progress.update(pct)  # float

# 正确
progress.update({
    "status": "downloading",
    "downloaded_bytes": downloaded,
    "total_bytes": total_size,
})
```

---

## API 数据格式

### 下载请求
```json
{
  "urls": ["https://v.douyin.com/xxx"],
  "format": "best"
}
```

### 下载响应
```json
{
  "task_id": "uuid-xxx"
}
```

### 任务状态
```json
{
  "task_id": "uuid-xxx",
  "status": "completed",
  "total": 1,
  "completed": 1,
  "failed": 0,
  "items": [
    {
      "url": "https://v.douyin.com/xxx",
      "status": "completed",
      "title": "视频标题",
      "filename": "douyin_123.mp4",
      "progress": 100.0,
      "error": null
    }
  ]
}
```

---

## 配置文件

### 后端配置（backend/app/core/config.py）
```python
class Settings(BaseSettings):
    app_name: str = "Video Downloader API"
    app_version: str = "1.0.0"
    download_dir: Path = Path("downloads")
    max_concurrent_downloads: int = 3
    debug: bool = True
```

### 前端配置（frontend/tailwind.config.js）
```javascript
theme: {
  extend: {
    colors: {
      night: '#0a0a0f',
      gold: '#f59e0b',
      // ...
    }
  }
}
```

---

## 部署指南

### 后端启动
```bash
cd backend
.\venv\Scripts\activate  # Windows
uvicorn app.main:app --host 0.0.0.0 --port 8001
```

### 前端启动
```bash
cd frontend
npm install
npm run dev
```

### 生产部署
```bash
# 后端
gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker

# 前端
npm run build
# 使用 nginx 托管 dist/ 目录
```

---

## 后续扩展方向

### 1. 支持更多平台
- [ ] YouTube（已有 yt-dlp 支持）
- [ ] TikTok（国际版抖音）
- [ ] 快手
- [ ] 西瓜视频
- [ ] 微博视频

### 2. 功能增强
- [ ] ffmpeg 合并支持（B站完整视频）
- [ ] 批量下载队列管理
- [ ] 下载历史记录
- [ ] 文件去重
- [ ] 云存储上传

### 3. 性能优化
- [ ] WebSocket 实时推送（替代轮询）
- [ ] 断点续传
- [ ] 多线程下载加速
- [ ] CDN 加速

### 4. 用户体验
- [ ] 暗色主题
- [ ] 多语言支持
- [ ] 移动端适配
- [ ] 浏览器插件

---

## 关键技术点总结

### 1. 防盗链绕过
- **B站**：完整浏览器指纹（Referer + Sec-Ch-Ua + Origin）
- **抖音**：移动端 User-Agent + 特定 Referer

### 2. 视频音频分离处理
- **无需 ffmpeg**：仅下载单轨道（视频或音频）
- **需要 ffmpeg**：合并视频和音频轨道

### 3. 进度追踪
- **后端**：yt-dlp progress_hooks
- **前端**：500ms 轮询 + 状态检测

### 4. 异步任务管理
- **Python asyncio**：非阻塞下载
- **任务队列**：支持批量下载

---

## 常见问题 FAQ

**Q: B站视频为什么没有声音？**  
A: B站视频音频分离，当前方案仅下载视频轨道。可安装 ffmpeg 支持合并。

**Q: 抖音下载失败怎么办？**  
A: 抖音 URL 格式会变化，确保使用分享链接（v.douyin.com）而非网页链接。

**Q: 如何支持更多平台？**  
A: yt-dlp 已支持 1000+ 平台，大部分无需修改代码。特殊情况需自定义解析器。

**Q: 下载速度慢怎么办？**  
A: 检查网络连接，可尝试使用代理。后端支持并发下载（默认 3 个）。

---

## 参考资源

- [yt-dlp 官方文档](https://github.com/yt-dlp/yt-dlp)
- [FastAPI 官方文档](https://fastapi.tiangolo.com/)
- [React 官方文档](https://react.dev/)
- [Tailwind CSS 文档](https://tailwindcss.com/)

---

**文档版本**：v1.0  
**最后更新**：2026-03-25  
**维护者**：小楼的龙虾 🦞
