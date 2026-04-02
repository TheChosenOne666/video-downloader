"""Repository for download task database operations (async version)."""

import logging
from datetime import datetime, timedelta, timezone
from typing import Optional

from app.database.connection import get_connection, close_connection
from app.models.schemas import DownloadItemStatus, DownloadStatus

logger = logging.getLogger(__name__)

# Data retention: 7 days
RETENTION_DAYS = 7


class DownloadTaskRecord:
    """Download task record from database."""
    def __init__(
        self,
        id: str,
        status: str,
        total_count: int,
        completed_count: int,
        failed_count: int,
        format_id: Optional[str],
        audio_only: bool,
        with_subtitle: bool,
        created_at: str,
        finished_at: Optional[str],
        expires_at: str,
        is_migrated: bool = False
    ):
        self.id = id
        self.status = status
        self.total_count = total_count
        self.completed_count = completed_count
        self.failed_count = failed_count
        self.format_id = format_id
        self.audio_only = audio_only
        self.with_subtitle = with_subtitle
        self.created_at = created_at
        self.finished_at = finished_at
        self.expires_at = expires_at
        self.is_migrated = is_migrated


class DownloadItemRecord:
    """Download item record from database."""
    def __init__(
        self,
        id: int,
        task_id: str,
        url: str,
        title: Optional[str],
        filename: Optional[str],
        status: str,
        progress: float,
        error: Optional[str],
        speed: Optional[str],
        eta: Optional[str],
        created_at: str,
        updated_at: str
    ):
        self.id = id
        self.task_id = task_id
        self.url = url
        self.title = title
        self.filename = filename
        self.status = status
        self.progress = progress
        self.error = error
        self.speed = speed
        self.eta = eta
        self.created_at = created_at
        self.updated_at = updated_at


class TaskRepository:
    """Repository for download task operations (async)."""
    
    # ========== Task Operations ==========
    
    async def create_task(
        self,
        task_id: str,
        urls: list[str],
        format_id: Optional[str] = None,
        audio_only: bool = False,
        with_subtitle: bool = False,
        is_migrated: bool = False
    ) -> DownloadTaskRecord:
        """Create a new download task."""
        now = datetime.now(timezone.utc)
        expires_at = now + timedelta(days=RETENTION_DAYS)
        
        conn = await get_connection()
        try:
            cursor = await conn.cursor()
            await cursor.execute("""
                INSERT INTO download_tasks 
                (id, status, total_count, completed_count, failed_count, format_id, 
                 audio_only, with_subtitle, created_at, expires_at, is_migrated)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                task_id,
                DownloadStatus.PENDING.value,
                len(urls),
                0,
                0,
                format_id,
                int(audio_only),
                int(with_subtitle),
                now.isoformat(),
                expires_at.isoformat(),
                int(is_migrated)
            ))
            
            # Create item records
            for url in urls:
                await cursor.execute("""
                    INSERT INTO download_items 
                    (task_id, url, status, progress, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?)
                """, (task_id, url, DownloadStatus.PENDING.value, 0.0, now.isoformat(), now.isoformat()))
            
            await conn.commit()
        finally:
            await close_connection(conn)
        
        return DownloadTaskRecord(
            id=task_id,
            status=DownloadStatus.PENDING.value,
            total_count=len(urls),
            completed_count=0,
            failed_count=0,
            format_id=format_id,
            audio_only=audio_only,
            with_subtitle=with_subtitle,
            created_at=now.isoformat(),
            finished_at=None,
            expires_at=expires_at.isoformat(),
            is_migrated=is_migrated
        )
    
    async def get_task(self, task_id: str) -> Optional[DownloadTaskRecord]:
        """Get task by ID."""
        conn = await get_connection()
        try:
            cursor = await conn.cursor()
            await cursor.execute(
                "SELECT * FROM download_tasks WHERE id = ?",
                (task_id,)
            )
            row = await cursor.fetchone()
            
            if not row:
                return None
            
            return DownloadTaskRecord(
                id=row["id"],
                status=row["status"],
                total_count=row["total_count"],
                completed_count=row["completed_count"],
                failed_count=row["failed_count"],
                format_id=row["format_id"],
                audio_only=bool(row["audio_only"]),
                with_subtitle=bool(row["with_subtitle"]),
                created_at=row["created_at"],
                finished_at=row["finished_at"],
                expires_at=row["expires_at"],
                is_migrated=bool(row["is_migrated"])
            )
        finally:
            await close_connection(conn)
    
    async def update_task_status(
        self,
        task_id: str,
        status: DownloadStatus,
        completed_count: int = None,
        failed_count: int = None,
        finished: bool = False
    ) -> None:
        """Update task status."""
        finished_at = datetime.now(timezone.utc).isoformat() if finished else None
        
        conn = await get_connection()
        try:
            cursor = await conn.cursor()
            
            if finished:
                await cursor.execute("""
                    UPDATE download_tasks 
                    SET status = ?, completed_count = ?, failed_count = ?, finished_at = ?
                    WHERE id = ?
                """, (status.value, completed_count or 0, failed_count or 0, finished_at, task_id))
            else:
                await cursor.execute("""
                    UPDATE download_tasks 
                    SET status = ?, completed_count = ?, failed_count = ?
                    WHERE id = ?
                """, (status.value, completed_count or 0, failed_count or 0, task_id))
            
            await conn.commit()
        finally:
            await close_connection(conn)
    
    async def delete_task(self, task_id: str) -> bool:
        """Delete a task and its items."""
        conn = await get_connection()
        try:
            cursor = await conn.cursor()
            await cursor.execute("DELETE FROM download_tasks WHERE id = ?", (task_id,))
            deleted = cursor.rowcount > 0
            await conn.commit()
            return deleted
        finally:
            await close_connection(conn)
    
    async def list_tasks(self, limit: int = 100) -> list[DownloadTaskRecord]:
        """List recent tasks."""
        conn = await get_connection()
        try:
            cursor = await conn.cursor()
            await cursor.execute("""
                SELECT * FROM download_tasks 
                ORDER BY created_at DESC 
                LIMIT ?
            """, (limit,))
            
            rows = await cursor.fetchall()
            return [
                DownloadTaskRecord(
                    id=row["id"],
                    status=row["status"],
                    total_count=row["total_count"],
                    completed_count=row["completed_count"],
                    failed_count=row["failed_count"],
                    format_id=row["format_id"],
                    audio_only=bool(row["audio_only"]),
                    with_subtitle=bool(row["with_subtitle"]),
                    created_at=row["created_at"],
                    finished_at=row["finished_at"],
                    expires_at=row["expires_at"],
                    is_migrated=bool(row["is_migrated"])
                )
                for row in rows
            ]
        finally:
            await close_connection(conn)
    
    # ========== Item Operations ==========
    
    async def get_items(self, task_id: str) -> list[DownloadItemRecord]:
        """Get all items for a task."""
        conn = await get_connection()
        try:
            cursor = await conn.cursor()
            await cursor.execute(
                "SELECT * FROM download_items WHERE task_id = ? ORDER BY id",
                (task_id,)
            )
            
            rows = await cursor.fetchall()
            return [
                DownloadItemRecord(
                    id=row["id"],
                    task_id=row["task_id"],
                    url=row["url"],
                    title=row["title"],
                    filename=row["filename"],
                    status=row["status"],
                    progress=row["progress"],
                    error=row["error"],
                    speed=row["speed"],
                    eta=row["eta"],
                    created_at=row["created_at"],
                    updated_at=row["updated_at"]
                )
                for row in rows
            ]
        finally:
            await close_connection(conn)
    
    async def update_item(
        self,
        task_id: str,
        url: str,
        status: DownloadStatus,
        progress: float = None,
        title: str = None,
        filename: str = None,
        error: str = None,
        speed: str = None,
        eta: str = None
    ) -> None:
        """Update download item status."""
        now = datetime.now(timezone.utc).isoformat()
        
        conn = await get_connection()
        try:
            cursor = await conn.cursor()
            await cursor.execute("""
                UPDATE download_items 
                SET status = ?, progress = ?, title = ?, filename = ?, 
                    error = ?, speed = ?, eta = ?, updated_at = ?
                WHERE task_id = ? AND url = ?
            """, (
                status.value,
                progress or 0.0,
                title,
                filename,
                error,
                speed,
                eta,
                now,
                task_id,
                url
            ))
            await conn.commit()
        finally:
            await close_connection(conn)
    
    async def get_task_item_by_url(self, task_id: str, url: str) -> Optional[DownloadItemRecord]:
        """Get a specific item by task_id and url."""
        conn = await get_connection()
        try:
            cursor = await conn.cursor()
            await cursor.execute(
                "SELECT * FROM download_items WHERE task_id = ? AND url = ?",
                (task_id, url)
            )
            row = await cursor.fetchone()
            
            if not row:
                return None
            
            return DownloadItemRecord(
                id=row["id"],
                task_id=row["task_id"],
                url=row["url"],
                title=row["title"],
                filename=row["filename"],
                status=row["status"],
                progress=row["progress"],
                error=row["error"],
                speed=row["speed"],
                eta=row["eta"],
                created_at=row["created_at"],
                updated_at=row["updated_at"]
            )
        finally:
            await close_connection(conn)


# Global repository instance
task_repository = TaskRepository()
