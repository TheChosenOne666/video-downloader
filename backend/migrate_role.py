"""Database migration script v2 - add role column to users."""

import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent / "data" / "video_downloader.db"


def migrate():
    """Add role column to users table if not exists."""
    if not DB_PATH.exists():
        print("[SKIP] Database does not exist")
        return
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Check if role column exists
    cursor.execute("PRAGMA table_info(users);")
    columns = [col[1] for col in cursor.fetchall()]
    
    if "role" not in columns:
        cursor.execute("ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user';")
        print("[MIGRATED] Added 'role' column to users table")
    else:
        print("[OK] 'role' column already exists")
    
    conn.commit()
    conn.close()
    print("[DONE] Migration completed")


if __name__ == "__main__":
    migrate()
