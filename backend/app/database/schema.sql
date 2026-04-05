-- SQLite Database Schema for Video Downloader
-- Created: 2026-04-02

-- ============================================================
-- Download Tasks Table
-- ============================================================
CREATE TABLE IF NOT EXISTS download_tasks (
    id TEXT PRIMARY KEY,                    -- UUID task_id
    status TEXT NOT NULL DEFAULT 'pending', -- pending, downloading, completed, failed, cancelled
    total_count INTEGER NOT NULL DEFAULT 0,
    completed_count INTEGER NOT NULL DEFAULT 0,
    failed_count INTEGER NOT NULL DEFAULT 0,
    format_id TEXT,                          -- Preferred format ID
    audio_only INTEGER DEFAULT 0,            -- Boolean: 1 = audio only
    with_subtitle INTEGER DEFAULT 0,         -- Boolean: 1 = with subtitle
    created_at TEXT NOT NULL,               -- ISO timestamp
    finished_at TEXT,                        -- ISO timestamp
    expires_at TEXT NOT NULL,                -- Expiration timestamp (created_at + 7 days)
    is_migrated INTEGER DEFAULT 0            -- Boolean: 1 = migrated from memory
);

CREATE INDEX IF NOT EXISTS idx_download_tasks_status ON download_tasks(status);
CREATE INDEX IF NOT EXISTS idx_download_tasks_created_at ON download_tasks(created_at);
CREATE INDEX IF NOT EXISTS idx_download_tasks_expires_at ON download_tasks(expires_at);

-- ============================================================
-- Download Items Table
-- ============================================================
CREATE TABLE IF NOT EXISTS download_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id TEXT NOT NULL,
    url TEXT NOT NULL,
    title TEXT,
    filename TEXT,
    status TEXT NOT NULL DEFAULT 'pending',  -- pending, downloading, completed, failed
    progress REAL DEFAULT 0.0,              -- 0-100
    error TEXT,
    speed TEXT,
    eta TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (task_id) REFERENCES download_tasks(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_download_items_task_id ON download_items(task_id);
CREATE INDEX IF NOT EXISTS idx_download_items_url ON download_items(url);

-- ============================================================
-- Summarize Tasks Table (AI Video Summary)
-- ============================================================
CREATE TABLE IF NOT EXISTS summarize_tasks (
    id TEXT PRIMARY KEY,                    -- UUID task_id
    video_url TEXT NOT NULL,
    platform TEXT DEFAULT 'auto',
    status TEXT NOT NULL DEFAULT 'pending',  -- pending, extracting, analyzing, completed, failed
    video_info TEXT,                         -- JSON string
    subtitle TEXT,                           -- Full subtitle text
    subtitle_entries TEXT,                   -- JSON array
    summary TEXT,                           -- AI generated summary
    chapters TEXT,                          -- JSON array
    mindmap TEXT,                           -- JSON object
    error TEXT,
    created_at TEXT NOT NULL,
    completed_at TEXT,
    expires_at TEXT NOT NULL,
    is_migrated INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_summarize_tasks_status ON summarize_tasks(status);
CREATE INDEX IF NOT EXISTS idx_summarize_tasks_video_url ON summarize_tasks(video_url);
CREATE INDEX IF NOT EXISTS idx_summarize_tasks_expires_at ON summarize_tasks(expires_at);

-- ============================================================
-- Subtitle Generation Tasks Table
-- ============================================================
CREATE TABLE IF NOT EXISTS subtitle_tasks (
    id TEXT PRIMARY KEY,                    -- UUID task_id
    video_url TEXT NOT NULL,
    language TEXT DEFAULT 'zh',
    subtitle_format TEXT DEFAULT 'srt',
    hardcode INTEGER DEFAULT 0,
    soft_subtitles INTEGER DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending',  -- pending, downloading, extracting_audio, transcribing, hardcoding, completed, failed
    video_info TEXT,
    subtitle_text TEXT,
    subtitle_path TEXT,
    video_with_subtitles_path TEXT,
    progress REAL DEFAULT 0.0,
    error TEXT,
    created_at TEXT NOT NULL,
    completed_at TEXT,
    expires_at TEXT NOT NULL,
    is_migrated INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_subtitle_tasks_status ON subtitle_tasks(status);
CREATE INDEX IF NOT EXISTS idx_subtitle_tasks_video_url ON subtitle_tasks(video_url);
CREATE INDEX IF NOT EXISTS idx_subtitle_tasks_expires_at ON subtitle_tasks(expires_at);

-- ============================================================
-- Chat Messages Table
-- ============================================================
CREATE TABLE IF NOT EXISTS chat_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id TEXT NOT NULL,                 -- References summarize_tasks.id
    role TEXT NOT NULL,                    -- 'user' or 'assistant'
    content TEXT NOT NULL,
    context TEXT,                           -- Relevant subtitle context
    created_at TEXT NOT NULL,
    FOREIGN KEY (task_id) REFERENCES summarize_tasks(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_task_id ON chat_messages(task_id);

-- ============================================================
-- Video Cache Table (Metadata Cache)
-- ============================================================
CREATE TABLE IF NOT EXISTS video_cache (
    url TEXT PRIMARY KEY,                   -- Video URL (unique)
    platform TEXT,
    title TEXT,
    duration INTEGER,
    thumbnail TEXT,
    uploader TEXT,
    view_count INTEGER,
    description TEXT,
    cached_formats TEXT,                   -- JSON array of available formats
    last_accessed_at TEXT NOT NULL,         -- For LRU eviction
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL               -- Cache expiration (7 days)
);

CREATE INDEX IF NOT EXISTS idx_video_cache_accessed ON video_cache(last_accessed_at);
CREATE INDEX IF NOT EXISTS idx_video_cache_expires ON video_cache(expires_at);

-- ============================================================
-- Users Table
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,                    -- UUID user_id
    username TEXT UNIQUE NOT NULL,          -- Unique username
    email TEXT UNIQUE NOT NULL,            -- Unique email
    password_hash TEXT NOT NULL,            -- SHA256 hash with salt
    role TEXT NOT NULL DEFAULT 'user',      -- Permission role: user, vip, admin
    created_at TEXT NOT NULL,              -- ISO timestamp
    last_login TEXT                         -- Last login timestamp
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- ============================================================
-- Sessions Table
-- ============================================================
CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,                    -- UUID session_id
    user_id TEXT NOT NULL,                  -- Foreign key to users
    token TEXT UNIQUE NOT NULL,              -- Session token (UUID format)
    expires_at TEXT NOT NULL,               -- Expiration timestamp (30 days)
    created_at TEXT NOT NULL,              -- ISO timestamp
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

-- ============================================================
-- Membership Plans Table (VIP Packages)
-- ============================================================
CREATE TABLE IF NOT EXISTS membership_plans (
    id TEXT PRIMARY KEY,                    -- Plan ID: free/monthly/yearly/lifetime
    name TEXT NOT NULL,                     -- Display name
    description TEXT,                       -- Plan description
    price_cents INTEGER NOT NULL,           -- Price in cents (CNY)
    duration_days INTEGER,                  -- VIP duration in days (NULL for lifetime)
    daily_download_limit INTEGER DEFAULT 3, -- Daily download limit
    features TEXT NOT NULL,                 -- JSON array of features
    is_active INTEGER DEFAULT 1,            -- Boolean: is plan available
    sort_order INTEGER DEFAULT 0,           -- Display order
    created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_membership_plans_active ON membership_plans(is_active);

-- ============================================================
-- Orders Table (Payment Orders)
-- ============================================================
CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,                    -- Order ID (UUID)
    user_id TEXT NOT NULL,                  -- Foreign key to users
    plan_id TEXT NOT NULL,                  -- Foreign key to membership_plans
    amount_cents INTEGER NOT NULL,          -- Payment amount in cents
    status TEXT NOT NULL DEFAULT 'pending', -- pending/paid/failed/cancelled
    pay_method TEXT,                        -- Payment method (mock)
    idempotency_key TEXT UNIQUE,            -- Idempotency key for duplicate prevention
    paid_at TEXT,                           -- Payment completion time
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (plan_id) REFERENCES membership_plans(id)
);

CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_idempotency ON orders(idempotency_key);

-- ============================================================
-- User Subscriptions Table (Active VIP Status)
-- ============================================================
CREATE TABLE IF NOT EXISTS user_subscriptions (
    id TEXT PRIMARY KEY,                    -- Subscription ID
    user_id TEXT UNIQUE NOT NULL,           -- One active subscription per user
    order_id TEXT NOT NULL,                 -- Reference to order
    plan_id TEXT NOT NULL,                  -- Reference to plan
    expires_at TEXT,                        -- VIP expiration (NULL=lifetime)
    is_active INTEGER DEFAULT 1,            -- Boolean: is subscription active
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (plan_id) REFERENCES membership_plans(id)
);

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_expires ON user_subscriptions(expires_at);

-- ============================================================
-- User Daily Download Stats (For download limit tracking)
-- ============================================================
CREATE TABLE IF NOT EXISTS user_daily_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    date TEXT NOT NULL,                     -- Date in YYYY-MM-DD format
    download_count INTEGER DEFAULT 0,       -- Downloads today
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE(user_id, date),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_user_daily_stats_user_date ON user_daily_stats(user_id, date);

-- ============================================================
-- Cleanup Trigger (Auto-delete expired tasks)
-- ============================================================
