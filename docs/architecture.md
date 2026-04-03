# 万能视频下载 - 技术架构文档

> 本文档沉淀 2026-04-03 期间完成的全部功能开发成果。

---

## 一、项目概述

**项目名称**：万能视频下载
**技术栈**：React 19 + TypeScript + Vite + Tailwind CSS 4（前端）/ FastAPI + SQLite + yt-dlp（后端）
**定位**：支持多平台视频解析、下载、AI 总结的 Web 应用

---

## 二、整体架构

```
前端 (http://localhost:5173)
├── React Router v6（路由管理）
├── Context API（全局状态）
│   └── AppContext（认证状态、下载任务状态）
├── Axios（HTTP 请求）
└── Tailwind CSS 4（样式，glassmorphism 设计语言）

后端 (http://localhost:8000)
├── FastAPI（API 框架）
├── SQLite（数据持久化）
├── yt-dlp（视频解析/下载）
├── faster-whisper（字幕转写）
└── bcrypt + secrets（认证）
```

---

## 三、数据库设计

### 3.1 ER 图

```
┌─────────────┐     ┌─────────────┐
│    users    │     │  sessions   │
├─────────────┤     ├─────────────┤
│ id          │────<│ token       │
│ username    │     │ user_id     │
│ email       │     │ expires_at  │
│ password_hash│    │ created_at  │
│ role        │     └─────────────┘
│ created_at  │
└─────────────┘
     │
     ├──────────┬──────────┬──────────┐
     ▼          ▼          ▼          ▼
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│download_ │ │video_    │ │summarize_│ │subtitle_ │
│tasks     │ │cache     │ │tasks    │ │tasks    │
└──────────┘ └──────────┘ └──────────┘ └──────────┘
```

### 3.2 表结构

#### users（用户表）
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER | 主键，自增 |
| username | VARCHAR(20) | 账号，3-20字符，唯一 |
| email | VARCHAR(100) | 邮箱，唯一 |
| password_hash | VARCHAR(128) | SHA256+盐值哈希 |
| role | VARCHAR(20) | `user` / `vip` / `admin`，默认 `user` |
| created_at | DATETIME | 创建时间，默认当前时间 |

#### sessions（会话表）
| 字段 | 类型 | 说明 |
|------|------|------|
| token | VARCHAR(96) | 主键，三 UUID 拼接（防猜测） |
| user_id | INTEGER | 外键 → users.id |
| expires_at | DATETIME | 过期时间（创建后+30天） |
| created_at | DATETIME | 创建时间 |

#### download_tasks（下载任务表）
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER | 主键 |
| user_id | INTEGER | 外键 → users.id（可为空） |
| url | TEXT | 视频 URL |
| platform | VARCHAR(50) | 平台名称 |
| title | VARCHAR(500) | 视频标题 |
| status | VARCHAR(20) | pending/processing/completed/failed |
| file_path | TEXT | 下载文件路径 |
| file_size | INTEGER | 文件大小（字节） |
| error_message | TEXT | 错误信息 |
| created_at | DATETIME | 创建时间 |
| updated_at | DATETIME | 更新时间 |

#### video_cache（视频缓存表）
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER | 主键 |
| url | TEXT | 视频 URL（唯一索引） |
| platform | VARCHAR(50) | 平台 |
| metadata | JSON | 视频元数据 |
| thumbnail | TEXT | 缩略图 URL |
| duration | INTEGER | 时长（秒） |
| created_at | DATETIME | 创建时间 |

#### summarize_tasks（AI 总结任务表）
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER | 主键 |
| user_id | INTEGER | 外键 → users.id |
| task_id | TEXT | 后台任务 ID |
| video_url | TEXT | 视频 URL |
| status | VARCHAR(20) | pending/processing/completed/failed |
| result | JSON | 总结结果 |
| created_at | DATETIME | 创建时间 |

#### subtitle_tasks（字幕任务表）
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER | 主键 |
| user_id | INTEGER | 外键 → users.id |
| video_url | TEXT | 视频 URL |
| status | VARCHAR(20) | pending/processing/completed/failed |
| subtitle_path | TEXT | 字幕文件路径 |
| language | VARCHAR(10) | 字幕语言 |
| created_at | DATETIME | 创建时间 |

---

## 四、后端认证系统

### 4.1 密码安全

- **哈希算法**：SHA256 + 随机盐值（`salt = secrets.token_hex(16)`）
- **Token 生成**：`secrets.token_hex(48)` → 三 UUID 拼接（96字符，防暴力猜测）
- **Token 有效期**：30天
- **防暴力**：同一 IP 登录失败5次后触发限流（滑动窗口，60秒内最多5次）

### 4.2 输入校验

| 字段 | 规则 |
|------|------|
| 账号 | 3-20字符，仅字母、数字、下划线 |
| 邮箱 | 标准邮箱正则 |
| 密码 | 6-128字符 |

### 4.3 API 端点

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| POST | `/api/auth/register` | 注册 | 无 |
| POST | `/api/auth/login` | 登录 | 无 |
| POST | `/api/auth/logout` | 登出 | Bearer Token |
| GET | `/api/auth/me` | 获取当前用户信息 | Bearer Token |
| GET | `/api/auth/check` | 检查认证状态 | Bearer Token |
| POST | `/api/auth/refresh` | 刷新 Token | Bearer Token |
| GET | `/api/auth/permissions` | 获取用户权限列表 | Bearer Token |

### 4.4 权限模型

| 角色 | 说明 |
|------|------|
| `user` | 普通用户，可下载、总结 |
| `vip` | VIP 用户（预留） |
| `admin` | 管理员，所有权限 |

---

## 五、前端模块

### 5.1 路由结构

```
/                   首页（URL 输入 + 任务管理）
/auth               登录/注册页
/forgot-password    忘记密码页
/tutorial           使用教程
/faq                常见问题
/profile            个人资料（需登录）
```

### 5.2 核心组件

| 组件 | 路径 | 说明 |
|------|------|------|
| `Header` | `components/Header.tsx` | 顶部导航，含用户菜单（下拉 Portal） |
| `URLInput` | `components/URLInput.tsx` | URL 输入框，含登录拦截（LoginGuard） |
| `LoginGuard` | `components/LoginGuard.tsx` | 全屏遮罩，未登录时拦截操作 |
| `AuthPage` | `pages/AuthPage.tsx` | 登录/注册表单，含粒子背景 |
| `ProfilePage` | `pages/ProfilePage.tsx` | 个人资料，含密码修改 |
| `ForgotPasswordPage` | `pages/ForgotPasswordPage.tsx` | 忘记密码页 |

### 5.3 全局状态（AppContext）

```typescript
interface AppState {
  isLoggedIn: boolean;
  userInfo: UserInfo | null;
}

interface UserInfo {
  username: string;  // 账号
  email: string;
  role: 'user' | 'vip' | 'admin';
}
```

### 5.4 API 服务层（api.ts）

```typescript
// 认证
register(username, email, password): Promise<AuthResponse>
login(username, password): Promise<AuthResponse>
logout(token): Promise<void>
getMe(token): Promise<UserInfo>
checkAuth(token): Promise<{ valid: boolean; userInfo?: UserInfo }>

// 下载
getDownloadTasks(token, page?, limit?): Promise<TaskListResponse>
getTaskStatus(taskId, token): Promise<TaskStatus>

// 总结
createSummarizeTask(videoUrl, token): Promise<TaskResponse>
getSummarizeResult(taskId, token): Promise<SummarizeResult>

// 缓存
searchCache(url, token): Promise<VideoMetadata | null>
clearCache(taskId, token): Promise<void>
```

---

## 六、数据流

### 6.1 登录流程

```
用户输入账号密码
  → POST /api/auth/login
  → 后端验证账号密码（bcrypt）
  → 生成三段式 UUID Token（30天有效期）
  → 写入 sessions 表
  → 返回 { token, username, email, role }
  → 前端存入 localStorage
  → AppContext.setUser() 更新全局状态
  → 页面刷新，Header 显示用户菜单
```

### 6.2 认证拦截流程

```
用户点击「添加链接」（未登录）
  → URLInput 调用 setShowLoginGuard(true)
  → LoginGuard 全屏遮罩弹出
  → 用户选择「立即登录」
  → 跳转 /auth 登录页
  → 登录成功后自动跳转回首页
```

---

## 七、下拉菜单实现（Portal 方案）

**问题**：Header 使用 `glass-card` 样式（含 `overflow: hidden`），导致下拉菜单被父元素裁剪。

**解决方案**：使用 React Portal 将下拉菜单渲染到 `document.body`，彻底脱离 Header 的布局约束。

```tsx
{showUserMenu && createPortal(
  <div id="user-dropdown" className="fixed ..." style={{ top: ..., right: ... }}>
    {/* 菜单内容 */}
  </div>,
  document.body
)}
```

---

## 八、数据保留策略

| 数据类型 | 保留期 |
|---------|--------|
| 内存任务（未登录） | 30分钟 |
| 数据库任务（已登录） | 7天 |
| Sessions | 30天 |
| 用户注册 | 永久 |

---

## 九、待完成功能

- [ ] 忘记密码功能（`/forgot-password` 页面 UI 已完成，API 需对接邮件服务）
- [ ] VIP 权限功能（角色已定义，界面入口待实现）
- [ ] 视频历史记录页面
- [ ] 导出功能（支持导出为 MP3/MP4）
- [ ] 多语言支持

---

## 十、开发规范

### Git Commit Message 格式
```
<type>: <subject>

feat:     新功能
fix:      Bug 修复
docs:     文档更新
style:    代码格式（不影响功能）
refactor: 重构
perf:     性能优化
chore:    构建/工具变更
```

### 启动命令
```bash
# 后端
cd backend
uvicorn app.main:app --reload --port 8000

# 前端
cd frontend
npm run dev

# 数据库（首次运行自动创建）
python backend/app/database/migrate_auth.py
```

### 环境变量
```bash
# backend/.env
DATABASE_URL=sqlite:///./data/video_downloader.db
SECRET_KEY=<your-secret-key>
FRONTEND_URL=http://localhost:5173
```
