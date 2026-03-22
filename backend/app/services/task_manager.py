"""Task manager for handling download tasks."""

import asyncio
import logging
import uuid
from datetime import datetime
from typing import Optional

from app.models.schemas import (
    DownloadItemStatus,
    DownloadRequest,
    DownloadStatus,
    TaskStatusResponse,
)
from app.services.downloader import downloader

logger = logging.getLogger(__name__)


class DownloadTask:
    """Represents a download task."""
    
    def __init__(self, task_id: str, request: DownloadRequest) -> None:
        self.task_id = task_id
        self.request = request
        self.status = DownloadStatus.PENDING
        self.items: list[DownloadItemStatus] = [
            DownloadItemStatus(url=url) for url in request.urls
        ]
        self.created_at = datetime.now()
        self.finished_at: Optional[datetime] = None
        self._task: Optional[asyncio.Task] = None
    
    @property
    def completed(self) -> int:
        """Count completed downloads."""
        return sum(
            1 for item in self.items
            if item.status == DownloadStatus.COMPLETED
        )
    
    @property
    def failed(self) -> int:
        """Count failed downloads."""
        return sum(
            1 for item in self.items
            if item.status == DownloadStatus.FAILED
        )
    
    def update_item_status(self, index: int, status: DownloadItemStatus) -> None:
        """Update status of a specific item."""
        if 0 <= index < len(self.items):
            self.items[index] = status
    
    def to_response(self) -> TaskStatusResponse:
        """Convert to API response."""
        return TaskStatusResponse(
            task_id=self.task_id,
            status=self.status,
            total=len(self.items),
            completed=self.completed,
            failed=self.failed,
            items=self.items,
            created_at=self.created_at,
            finished_at=self.finished_at,
        )


class TaskManager:
    """Manager for download tasks."""
    
    def __init__(self) -> None:
        self._tasks: dict[str, DownloadTask] = {}
        self._lock = asyncio.Lock()
    
    async def create_task(self, request: DownloadRequest) -> str:
        """Create a new download task."""
        task_id = str(uuid.uuid4())
        task = DownloadTask(task_id, request)
        
        async with self._lock:
            self._tasks[task_id] = task
        
        # Start download in background
        task._task = asyncio.create_task(self._run_task(task))
        
        return task_id
    
    async def _run_task(self, task: DownloadTask) -> None:
        """Execute download task."""
        task.status = DownloadStatus.DOWNLOADING
        
        try:
            results = await downloader.download_batch(
                urls=task.request.urls,
                task_id=task.task_id,
                status_callback=lambda i, s: task.update_item_status(i, s),
                format_id=task.request.format_id,
                audio_only=task.request.audio_only,
            )
            
            # Update final statuses
            for i, status in enumerate(results):
                task.update_item_status(i, status)
            
            # Determine overall status
            if task.failed == len(task.items):
                task.status = DownloadStatus.FAILED
            elif task.completed == len(task.items):
                task.status = DownloadStatus.COMPLETED
            else:
                task.status = DownloadStatus.COMPLETED  # Partial success
            
        except Exception as e:
            logger.error(f"Task {task.task_id} failed: {e}")
            task.status = DownloadStatus.FAILED
        
        finally:
            task.finished_at = datetime.now()
    
    async def get_task(self, task_id: str) -> Optional[DownloadTask]:
        """Get task by ID."""
        async with self._lock:
            return self._tasks.get(task_id)
    
    async def cancel_task(self, task_id: str) -> bool:
        """Cancel a running task."""
        task = await self.get_task(task_id)
        if not task or not task._task:
            return False
        
        if task.status == DownloadStatus.DOWNLOADING:
            task._task.cancel()
            task.status = DownloadStatus.CANCELLED
            task.finished_at = datetime.now()
            return True
        
        return False
    
    async def cleanup_task(self, task_id: str) -> bool:
        """Clean up task and its files."""
        async with self._lock:
            task = self._tasks.get(task_id)
            if task:
                # Cancel if running
                if task._task and not task._task.done():
                    task._task.cancel()
                
                # Remove files
                downloader.cleanup_task_files(task_id)
                
                # Remove from memory
                del self._tasks[task_id]
                return True
        
        return False
    
    async def list_tasks(self) -> list[str]:
        """List all task IDs."""
        async with self._lock:
            return list(self._tasks.keys())


# Global task manager instance
task_manager = TaskManager()
