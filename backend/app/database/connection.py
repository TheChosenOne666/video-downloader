"""Database connection and initialization module."""

import logging
import aiosqlite
from pathlib import Path
from typing import Optional

from app.core.config import settings

logger = logging.getLogger(__name__)

# Database file path
DB_PATH = Path(__file__).parent.parent.parent / "data" / "video_downloader.db"
DB_PATH.parent.mkdir(parents=True, exist_ok=True)


def get_db_path() -> Path:
    """Get the database file path."""
    return DB_PATH


async def get_connection() -> aiosqlite.Connection:
    """Get an async database connection with row factory."""
    conn = await aiosqlite.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = aiosqlite.Row
    return conn


async def close_connection(conn: aiosqlite.Connection) -> None:
    """Close a database connection."""
    if conn:
        await conn.close()


async def init_database() -> None:
    """Initialize the database with schema."""
    schema_path = Path(__file__).parent / "schema.sql"
    
    if not schema_path.exists():
        raise FileNotFoundError(f"Schema file not found: {schema_path}")
    
    # Read schema
    schema_sql = schema_path.read_text(encoding="utf-8")
    
    # Execute schema
    conn = await get_connection()
    try:
        await conn.executescript(schema_sql)
        await conn.commit()
        logger.info(f"Database initialized at: {DB_PATH}")
    finally:
        await close_connection(conn)


def get_database_size() -> int:
    """Get database file size in bytes."""
    if DB_PATH.exists():
        return DB_PATH.stat().st_size
    return 0


def cleanup_expired_data() -> dict:
    """Clean up expired tasks and cache entries (sync version).
    
    Note: This is a synchronous wrapper for use in non-async contexts.
    
    Returns:
        dict with counts of cleaned items
    """
    import sqlite3
    from datetime import datetime, timezone
    
    now = datetime.now(timezone.utc).isoformat()
    stats = {
        "download_tasks": 0,
        "summarize_tasks": 0,
        "subtitle_tasks": 0,
        "chat_messages": 0,
        "video_cache": 0,
    }
    
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    try:
        cursor = conn.cursor()
        
        # Clean expired download tasks
        cursor.execute(
            "DELETE FROM download_tasks WHERE expires_at < ?",
            (now,)
        )
        stats["download_tasks"] = cursor.rowcount
        
        # Clean expired summarize tasks
        cursor.execute(
            "DELETE FROM summarize_tasks WHERE expires_at < ?",
            (now,)
        )
        stats["summarize_tasks"] = cursor.rowcount
        
        # Clean expired subtitle tasks
        cursor.execute(
            "DELETE FROM subtitle_tasks WHERE expires_at < ?",
            (now,)
        )
        stats["subtitle_tasks"] = cursor.rowcount
        
        # Clean expired video cache
        cursor.execute(
            "DELETE FROM video_cache WHERE expires_at < ?",
            (now,)
        )
        stats["video_cache"] = cursor.rowcount
        
        conn.commit()
    finally:
        conn.close()
    
    if any(stats.values()):
        logger.info(f"Cleaned up expired data: {stats}")
    
    return stats
