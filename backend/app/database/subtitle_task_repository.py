"""Repository for subtitle generation task database operations (async version)."""

import json
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional

from app.database.connection import get_connection, close_connection
from app.models.schemas import SubtitleGenerationStatus

logger = logging.getLogger(__name__)

# Data retention: 7 days
RETENTION_DAYS = 7


class SubtitleTaskRepository:
    """Repository for subtitle generation task operations (async)."""
    
    async def create_task(
        self,
        task_id: str,
        video_url: str,
        language: str = "zh",
        subtitle_format: str = "srt",
        hardcode: bool = False,
        soft_subtitles: bool = False,
        is_migrated: bool = False
    ) -> dict:
        """Create a new subtitle generation task."""
        now = datetime.now(timezone.utc)
        expires_at = now + timedelta(days=RETENTION_DAYS)
        
        conn = await get_connection()
        try:
            cursor = await conn.cursor()
            await cursor.execute("""
                INSERT INTO subtitle_tasks 
                (id, video_url, language, subtitle_format, hardcode, soft_subtitles,
                 status, progress, created_at, expires_at, is_migrated)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                task_id,
                video_url,
                language,
                subtitle_format,
                int(hardcode),
                int(soft_subtitles),
                SubtitleGenerationStatus.PENDING.value,
                0.0,
                now.isoformat(),
                expires_at.isoformat(),
                int(is_migrated)
            ))
            await conn.commit()
        finally:
            await close_connection(conn)
        
        return {
            "task_id": task_id,
            "video_url": video_url,
            "language": language,
            "subtitle_format": subtitle_format,
            "is_migrated": is_migrated
        }
    
    async def get_task(self, task_id: str) -> Optional[dict]:
        """Get task by ID."""
        conn = await get_connection()
        try:
            cursor = await conn.cursor()
            await cursor.execute(
                "SELECT * FROM subtitle_tasks WHERE id = ?",
                (task_id,)
            )
            row = await cursor.fetchone()
            
            if not row:
                return None
            
            result = dict(row)
            # Parse JSON fields
            if result.get("video_info"):
                result["video_info"] = json.loads(result["video_info"])
            
            # Convert integers to booleans
            result["hardcode"] = bool(result["hardcode"])
            result["soft_subtitles"] = bool(result["soft_subtitles"])
            result["is_migrated"] = bool(result["is_migrated"])
            
            return result
        finally:
            await close_connection(conn)
    
    async def update_task(
        self,
        task_id: str,
        status: SubtitleGenerationStatus = None,
        video_info: dict = None,
        subtitle_text: str = None,
        subtitle_path: str = None,
        video_with_subtitles_path: str = None,
        progress: float = None,
        error: str = None,
        completed: bool = False
    ) -> None:
        """Update subtitle generation task."""
        updates = []
        params = []
        
        if status:
            updates.append("status = ?")
            params.append(status.value)
        
        if video_info is not None:
            updates.append("video_info = ?")
            params.append(json.dumps(video_info) if video_info else None)
        
        if subtitle_text is not None:
            updates.append("subtitle_text = ?")
            params.append(subtitle_text)
        
        if subtitle_path is not None:
            updates.append("subtitle_path = ?")
            params.append(subtitle_path)
        
        if video_with_subtitles_path is not None:
            updates.append("video_with_subtitles_path = ?")
            params.append(video_with_subtitles_path)
        
        if progress is not None:
            updates.append("progress = ?")
            params.append(progress)
        
        if error is not None:
            updates.append("error = ?")
            params.append(error)
        
        if completed:
            now = datetime.now(timezone.utc)
            updates.append("completed_at = ?")
            params.append(now.isoformat())
        
        if updates:
            params.append(task_id)
            conn = await get_connection()
            try:
                cursor = await conn.cursor()
                await cursor.execute(
                    f"UPDATE subtitle_tasks SET {', '.join(updates)} WHERE id = ?",
                    params
                )
                await conn.commit()
            finally:
                await close_connection(conn)
    
    async def delete_task(self, task_id: str) -> bool:
        """Delete a task."""
        conn = await get_connection()
        try:
            cursor = await conn.cursor()
            await cursor.execute("DELETE FROM subtitle_tasks WHERE id = ?", (task_id,))
            deleted = cursor.rowcount > 0
            await conn.commit()
            return deleted
        finally:
            await close_connection(conn)


# Global repository instance
subtitle_task_repository = SubtitleTaskRepository()
