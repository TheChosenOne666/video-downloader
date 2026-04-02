"""Database migration script for adding new tables."""

import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent / "data" / "video_downloader.db"


def migrate():
    """Add new tables if they don't exist."""
    if not DB_PATH.exists():
        print("[SKIP] Database does not exist yet, will be created on startup")
        return
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Check existing tables
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    existing_tables = [row[0] for row in cursor.fetchall()]
    print(f"Existing tables: {existing_tables}")
    
    # Migration: Add users table
    if "users" not in existing_tables:
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                username TEXT UNIQUE NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                created_at TEXT NOT NULL,
                last_login TEXT
            )
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);")
        print("[MIGRATED] Created users table")
    else:
        print("[OK] users table already exists")
    
    # Migration: Add sessions table
    if "sessions" not in existing_tables:
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS sessions (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                token TEXT UNIQUE NOT NULL,
                expires_at TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);")
        print("[MIGRATED] Created sessions table")
    else:
        print("[OK] sessions table already exists")
    
    conn.commit()
    conn.close()
    
    print("[DONE] Migration completed")


if __name__ == "__main__":
    migrate()
