"""Repository for video metadata cache operations (async version)."""

import json
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional

from app.database.connection import get_connection, close_connection

logger = logging.getLogger(__name__)

# Cache TTL: 7 days
CACHE_TTL_DAYS = 7


class VideoCacheRepository:
    """Repository for video metadata cache operations (async)."""
    
    async def get(self, url: str) -> Optional[dict]:
        """Get cached video metadata by URL.
        
        Returns:
            dict with video metadata or None if not found/expired
        """
        now = datetime.now(timezone.utc).isoformat()
        
        conn = await get_connection()
        try:
            cursor = await conn.cursor()
            
            # Get cache entry if not expired
            await cursor.execute("""
                SELECT * FROM video_cache 
                WHERE url = ? AND expires_at > ?
            """, (url, now))
            
            row = await cursor.fetchone()
            
            if not row:
                return None
            
            # Update last accessed time
            await cursor.execute("""
                UPDATE video_cache SET last_accessed_at = ? WHERE url = ?
            """, (now, url))
            await conn.commit()
            
            # Parse JSON fields
            result = dict(row)
            if result.get("cached_formats"):
                result["cached_formats"] = json.loads(result["cached_formats"])
            
            return result
        finally:
            await close_connection(conn)
    
    async def set(
        self,
        url: str,
        platform: str,
        title: str,
        duration: int = None,
        thumbnail: str = None,
        uploader: str = None,
        view_count: int = None,
        description: str = None,
        formats: list = None
    ) -> None:
        """Cache video metadata."""
        now = datetime.now(timezone.utc)
        expires_at = now + timedelta(days=CACHE_TTL_DAYS)
        
        conn = await get_connection()
        try:
            cursor = await conn.cursor()
            
            # Use INSERT OR REPLACE to update if exists
            await cursor.execute("""
                INSERT OR REPLACE INTO video_cache 
                (url, platform, title, duration, thumbnail, uploader, view_count, 
                 description, cached_formats, last_accessed_at, created_at, expires_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                url,
                platform,
                title,
                duration,
                thumbnail,
                uploader,
                view_count,
                description,
                json.dumps(formats) if formats else None,
                now.isoformat(),
                now.isoformat(),
                expires_at.isoformat()
            ))
            await conn.commit()
        finally:
            await close_connection(conn)
    
    async def exists(self, url: str) -> bool:
        """Check if URL is cached and not expired."""
        now = datetime.now(timezone.utc).isoformat()
        
        conn = await get_connection()
        try:
            cursor = await conn.cursor()
            await cursor.execute("""
                SELECT 1 FROM video_cache 
                WHERE url = ? AND expires_at > ?
            """, (url, now))
            
            row = await cursor.fetchone()
            return row is not None
        finally:
            await close_connection(conn)
    
    async def delete(self, url: str) -> bool:
        """Delete a cache entry."""
        conn = await get_connection()
        try:
            cursor = await conn.cursor()
            await cursor.execute("DELETE FROM video_cache WHERE url = ?", (url,))
            deleted = cursor.rowcount > 0
            await conn.commit()
            return deleted
        finally:
            await close_connection(conn)
    
    async def cleanup_expired(self) -> int:
        """Clean up expired cache entries.
        
        Returns:
            Number of deleted entries
        """
        now = datetime.now(timezone.utc).isoformat()
        
        conn = await get_connection()
        try:
            cursor = await conn.cursor()
            await cursor.execute(
                "DELETE FROM video_cache WHERE expires_at < ?",
                (now,)
            )
            deleted = cursor.rowcount
            await conn.commit()
            
            if deleted > 0:
                logger.info(f"Cleaned up {deleted} expired video cache entries")
            
            return deleted
        finally:
            await close_connection(conn)
    
    async def get_stats(self) -> dict:
        """Get cache statistics."""
        now = datetime.now(timezone.utc).isoformat()
        
        conn = await get_connection()
        try:
            cursor = await conn.cursor()
            
            # Total entries
            await cursor.execute("SELECT COUNT(*) as count FROM video_cache")
            total = (await cursor.fetchone())["count"]
            
            # Expired entries
            await cursor.execute(
                "SELECT COUNT(*) as count FROM video_cache WHERE expires_at < ?",
                (now,)
            )
            expired = (await cursor.fetchone())["count"]
            
            # Active entries
            await cursor.execute(
                "SELECT COUNT(*) as count FROM video_cache WHERE expires_at > ?",
                (now,)
            )
            active = (await cursor.fetchone())["count"]
            
            return {
                "total": total,
                "active": active,
                "expired": expired
            }
        finally:
            await close_connection(conn)


# Global repository instance
video_cache_repository = VideoCacheRepository()
