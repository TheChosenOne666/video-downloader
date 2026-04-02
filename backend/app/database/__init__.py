"""Database module for SQLite operations.

This module provides:
- Database connection management
- Task repositories (download, summarize, subtitle)
- Video metadata cache repository
- Automatic cleanup of expired data
"""

from app.database.connection import (
    init_database,
    get_connection,
    close_connection,
    cleanup_expired_data,
    get_database_size,
    get_db_path,
)
from app.database.task_repository import (
    TaskRepository,
    task_repository,
    DownloadTaskRecord,
    DownloadItemRecord,
)
from app.database.video_cache_repository import (
    VideoCacheRepository,
    video_cache_repository,
)
from app.database.summarize_repository import (
    SummarizeRepository,
    summarize_repository,
)
from app.database.subtitle_task_repository import (
    SubtitleTaskRepository,
    subtitle_task_repository,
)

__all__ = [
    # Connection
    "init_database",
    "get_connection",
    "close_connection",
    "cleanup_expired_data",
    "get_database_size",
    "get_db_path",
    # Task Repository
    "TaskRepository",
    "task_repository",
    "DownloadTaskRecord",
    "DownloadItemRecord",
    # Video Cache
    "VideoCacheRepository",
    "video_cache_repository",
    # Summarize
    "SummarizeRepository",
    "summarize_repository",
    # Subtitle Task
    "SubtitleTaskRepository",
    "subtitle_task_repository",
]
