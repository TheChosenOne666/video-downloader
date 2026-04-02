# SQLite 数据库集成文档

> 更新日期：2026-04-02

## 📋 概述

本次集成将 SQLite 轻量级数据库引入视频下载平台，用于持久化任务状态、用户数据和视频元数据缓存。

## 🗄️ 数据库设计

### 表结构

#### 1. download_tasks - 下载任务主表
```sql
- id: UUID, 主键
- status: 任务状态 (pending, downloading, completed, failed, cancelled)
- total_count: 总视频数
- completed_count: 已完成数
- failed_count: 失败数
- format_id: 画质选项
- audio_only: 是否仅下载音频
- with_subtitle: 是否带字幕
- created_at: 创建时间
- finished_at: 完成时间
- expires_at: 过期时间 (7天后)
- is_migrated: 是否从内存迁移
```

#### 2. download_items - 下载项明细表
```sql
- id: 自增主键
- task_id: 关联任务ID
- url: 视频URL
- title: 视频标题
- filename: 下载文件名
- status: 下载状态
- progress: 下载进度 (0-100)
- error: 错误信息
- speed: 下载速度
- eta: 预计剩余时间
```

#### 3. summarize_tasks - AI总结任务表
```sql
- id: UUID, 主键
- video_url: 视频URL
- platform: 平台
- status: 状态
- video_info: 视频信息 (JSON)
- subtitle: 字幕文本
- subtitle_entries: 字幕条目 (JSON)
- summary: AI摘要
- chapters: 章节信息 (JSON)
- mindmap: 思维导图 (JSON)
- created_at: 创建时间
- expires_at: 过期时间
```

#### 4. subtitle_tasks - 字幕生成任务表
```sql
- id: UUID, 主键
- video_url: 视频URL
- language: 语言
- subtitle_format: 字幕格式 (srt, vtt, ass)
- hardcode: 是否硬编码
- soft_subtitles: 是否软字幕
- status: 状态
- subtitle_text: 字幕文本
- subtitle_path: 字幕文件路径
- video_with_subtitles_path: 带字幕视频路径
- progress: 进度
```

#### 5. chat_messages - 聊天消息表
```sql
- id: 自增主键
- task_id: 关联总结任务ID
- role: 角色 (user, assistant)
- content: 消息内容
- context: 相关上下文
```

#### 6. video_cache - 视频元数据缓存表
```sql
- url: 视频URL (主键)
- platform: 平台
- title: 标题
- duration: 时长
- thumbnail: 缩略图
- uploader: 上传者
- view_count: 观看数
- description: 描述
- cached_formats: 可用画质 (JSON)
- last_accessed_at: 最后访问时间
- created_at: 缓存时间
- expires_at: 过期时间 (7天)
```

## ⚡ 架构设计

```
┌─────────────────────────────────────────────┐
│                  API Layer                   │
│  (download.py, summarize.py, subtitle.py)     │
└─────────────────┬───────────────────────────┘
                  │
┌─────────────────▼───────────────────────────┐
│            Repository Layer                 │
│  (task_repository.py, summarize_repository)  │
└─────────────────┬───────────────────────────┘
                  │
┌─────────────────▼───────────────────────────┐
│              SQLite Database                │
│         (data/video_downloader.db)           │
└─────────────────────────────────────────────┘
```

## 🔧 核心模块

### 1. 数据库连接 (connection.py)
- 异步 SQLite 连接管理 (aiosqlite)
- 数据库初始化
- 过期数据清理

### 2. 任务仓储 (task_repository.py)
- 创建/查询/删除下载任务
- 更新任务和下载项状态
- 内存 + 数据库双写

### 3. 视频缓存 (video_cache_repository.py)
- 视频元数据缓存
- 7天 TTL 自动过期
- LRU 访问更新

### 4. 总结任务 (summarize_repository.py)
- AI 总结任务持久化
- 聊天历史存储

## 📊 数据保留策略

| 数据类型 | 保留时间 | 说明 |
|----------|----------|------|
| 下载任务 | 7 天 | 服务重启不丢失 |
| AI 总结任务 | 7 天 | 包含字幕、摘要、思维导图 |
| 字幕生成任务 | 7 天 | 包含字幕文件和视频 |
| 视频缓存 | 7 天 | 元数据缓存避免重复解析 |

## 🔄 自动清理

服务启动时创建后台任务，每小时执行一次过期数据清理：

```python
async def _run_cleanup():
    while True:
        await asyncio.sleep(3600)  # 每小时
        cleanup_expired_data()
```

## 🎯 性能优化

### 1. 视频元数据缓存
- 相同 URL 避免重复调用 yt-dlp
- 自动更新 LRU 访问时间
- 7 天 TTL 控制缓存大小

### 2. 内存 + 数据库双写
- 内存缓存用于快速读取
- 数据库用于持久化和服务重启恢复
- 异步写入，不阻塞主流程

### 3. 索引优化
```sql
CREATE INDEX idx_download_tasks_status ON download_tasks(status);
CREATE INDEX idx_download_tasks_expires_at ON download_tasks(expires_at);
CREATE INDEX idx_download_items_task_id ON download_items(task_id);
CREATE INDEX idx_video_cache_accessed ON video_cache(last_accessed_at);
```

## 📝 前端过期提醒

在下载完成页面和进度页面添加过期提醒：

```tsx
<div className="glass-card p-4 mb-6 flex items-center gap-3" 
     style={{ backgroundColor: 'rgba(251, 191, 36, 0.1)' }}>
  <span className="text-2xl">⚠️</span>
  <div>
    <p className="text-sm font-medium">
      文件将在 <strong>7 天后过期删除</strong>，请及时下载到本地！
    </p>
    <p className="text-xs mt-1">
      数据保留策略：任务完成后仅保留 7 天，逾期自动清理
    </p>
  </div>
</div>
```

## 🚀 部署说明

### 1. 安装依赖
```bash
pip install aiosqlite
```

### 2. 数据库初始化
服务启动时自动初始化，无需手动操作。

### 3. 数据目录
```
backend/
└── data/
    └── video_downloader.db  # SQLite 数据库文件
```

### 4. 备份建议
```bash
# 定期备份数据库
cp data/video_downloader.db data/backup_$(date +%Y%m%d).db
```

## 🧪 测试

```bash
cd backend
python test_database.py
```

预期输出：
```
[TEST] SQLite Integration Test
----------------------------------------
[OK] Database initialized
[OK] Created task: test-task-001
[OK] Retrieved task: test-task-001, total_count: 2
[OK] Retrieved 2 items
[OK] Cached video metadata
[OK] Retrieved cached video: Test Video
[OK] Created summarize task: test-summary-001
[OK] Cleanup stats: {...}
[OK] Cleaned up test data
----------------------------------------
[PASS] All tests passed!
```

## 📝 更新日志

### v1.1.0 (2026-04-02)
- 🗄️ 新增 SQLite 数据库集成
- ✨ 数据持久化，服务重启不丢失
- ⚡ 视频元数据缓存，提高性能
- 🧹 7 天自动过期清理
- 📝 前端添加过期提醒
- 🔄 异步数据库操作，不影响性能
