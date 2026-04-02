"""Repository for summarize task database operations (async version)."""

import json
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional

from app.database.connection import get_connection, close_connection
from app.models.schemas import SummarizeStatus

logger = logging.getLogger(__name__)

# Data retention: 7 days
RETENTION_DAYS = 7


class SummarizeRepository:
    """Repository for summarize task operations (async)."""
    
    async def create_task(
        self,
        task_id: str,
        video_url: str,
        platform: str = "auto",
        is_migrated: bool = False
    ) -> dict:
        """Create a new summarize task."""
        now = datetime.now(timezone.utc)
        expires_at = now + timedelta(days=RETENTION_DAYS)
        
        conn = await get_connection()
        try:
            cursor = await conn.cursor()
            await cursor.execute("""
                INSERT INTO summarize_tasks 
                (id, video_url, platform, status, created_at, expires_at, is_migrated)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                task_id,
                video_url,
                platform,
                SummarizeStatus.PENDING.value,
                now.isoformat(),
                expires_at.isoformat(),
                int(is_migrated)
            ))
            await conn.commit()
        finally:
            await close_connection(conn)
        
        return {
            "task_id": task_id,
            "status": SummarizeStatus.PENDING.value,
            "video_url": video_url,
            "platform": platform,
            "is_migrated": is_migrated
        }
    
    async def get_task(self, task_id: str) -> Optional[dict]:
        """Get task by ID."""
        conn = await get_connection()
        try:
            cursor = await conn.cursor()
            await cursor.execute(
                "SELECT * FROM summarize_tasks WHERE id = ?",
                (task_id,)
            )
            row = await cursor.fetchone()
            
            if not row:
                return None
            
            result = dict(row)
            # Parse JSON fields
            if result.get("video_info"):
                result["video_info"] = json.loads(result["video_info"])
            if result.get("subtitle_entries"):
                result["subtitle_entries"] = json.loads(result["subtitle_entries"])
            if result.get("chapters"):
                result["chapters"] = json.loads(result["chapters"])
            if result.get("mindmap"):
                result["mindmap"] = json.loads(result["mindmap"])
            
            return result
        finally:
            await close_connection(conn)
    
    async def update_task(
        self,
        task_id: str,
        status: SummarizeStatus = None,
        video_info: dict = None,
        subtitle: str = None,
        subtitle_entries: list = None,
        summary: str = None,
        chapters: list = None,
        mindmap: dict = None,
        error: str = None,
        completed: bool = False
    ) -> None:
        """Update summarize task."""
        updates = []
        params = []
        
        if status:
            updates.append("status = ?")
            params.append(status.value)
        
        if video_info:
            updates.append("video_info = ?")
            params.append(json.dumps(video_info))
        
        if subtitle is not None:
            updates.append("subtitle = ?")
            params.append(subtitle)
        
        if subtitle_entries is not None:
            updates.append("subtitle_entries = ?")
            params.append(json.dumps(subtitle_entries))
        
        if summary is not None:
            updates.append("summary = ?")
            params.append(summary)
        
        if chapters is not None:
            updates.append("chapters = ?")
            params.append(json.dumps(chapters))
        
        if mindmap is not None:
            updates.append("mindmap = ?")
            params.append(json.dumps(mindmap))
        
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
                    f"UPDATE summarize_tasks SET {', '.join(updates)} WHERE id = ?",
                    params
                )
                await conn.commit()
            finally:
                await close_connection(conn)
    
    async def delete_task(self, task_id: str) -> bool:
        """Delete a task and its chat messages."""
        conn = await get_connection()
        try:
            cursor = await conn.cursor()
            await cursor.execute("DELETE FROM summarize_tasks WHERE id = ?", (task_id,))
            deleted = cursor.rowcount > 0
            await conn.commit()
            return deleted
        finally:
            await close_connection(conn)
    
    async def add_chat_message(
        self,
        task_id: str,
        role: str,
        content: str,
        context: str = None
    ) -> None:
        """Add a chat message to task history."""
        now = datetime.now(timezone.utc).isoformat()
        
        conn = await get_connection()
        try:
            cursor = await conn.cursor()
            await cursor.execute("""
                INSERT INTO chat_messages (task_id, role, content, context, created_at)
                VALUES (?, ?, ?, ?, ?)
            """, (task_id, role, content, context, now))
            await conn.commit()
        finally:
            await close_connection(conn)
    
    async def get_chat_history(self, task_id: str) -> list[dict]:
        """Get chat history for a task."""
        conn = await get_connection()
        try:
            cursor = await conn.cursor()
            await cursor.execute(
                "SELECT * FROM chat_messages WHERE task_id = ? ORDER BY id",
                (task_id,)
            )
            rows = await cursor.fetchall()
            return [dict(row) for row in rows]
        finally:
            await close_connection(conn)


# Global repository instance
summarize_repository = SummarizeRepository()
