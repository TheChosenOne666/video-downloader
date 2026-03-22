"""Download API endpoints."""

import logging
from pathlib import Path

from fastapi import APIRouter, HTTPException, status
from fastapi.responses import FileResponse

from app.models.schemas import (
    DownloadRequest,
    DownloadResponse,
    DownloadStatus,
    ErrorResponse,
    TaskStatusResponse,
    VideoInfoRequest,
    VideoInfoResponse,
)
from app.services.downloader import downloader
from app.services.task_manager import task_manager

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["download"])


@router.post(
    "/info",
    response_model=VideoInfoResponse,
    responses={
        400: {"model": ErrorResponse},
        500: {"model": ErrorResponse},
    },
    summary="Get video information",
    description="Extract video information including available formats without downloading.",
)
async def get_video_info(request: VideoInfoRequest) -> VideoInfoResponse:
    """Get video information without downloading."""
    try:
        info = await downloader.get_video_info(request.url)
        return VideoInfoResponse(info=info)
    except Exception as e:
        logger.error(f"Failed to get video info: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to extract video info: {str(e)}",
        )


@router.post(
    "/download",
    response_model=DownloadResponse,
    status_code=status.HTTP_202_ACCEPTED,
    responses={
        400: {"model": ErrorResponse},
    },
    summary="Start batch download",
    description="Submit a batch download task. Returns task ID for tracking progress.",
)
async def start_download(request: DownloadRequest) -> DownloadResponse:
    """Start a batch download task."""
    try:
        task_id = await task_manager.create_task(request)
        return DownloadResponse(task_id=task_id)
    except Exception as e:
        logger.error(f"Failed to create download task: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create download task: {str(e)}",
        )


@router.get(
    "/status/{task_id}",
    response_model=TaskStatusResponse,
    responses={
        404: {"model": ErrorResponse},
    },
    summary="Get task status",
    description="Query the status of a download task.",
)
async def get_task_status(task_id: str) -> TaskStatusResponse:
    """Get download task status."""
    task = await task_manager.get_task(task_id)
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Task not found: {task_id}",
        )
    return task.to_response()


@router.get(
    "/download/{task_id}/{filename}",
    responses={
        404: {"model": ErrorResponse},
    },
    summary="Download file",
    description="Download a completed file by task ID and filename.",
)
async def download_file(task_id: str, filename: str) -> FileResponse:
    """Download a completed file."""
    # Verify task exists
    task = await task_manager.get_task(task_id)
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Task not found: {task_id}",
        )
    
    # Verify file exists and belongs to task
    file_path = Path("downloads") / task_id / filename
    if not file_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"File not found: {filename}",
        )
    
    # Verify file belongs to this task
    if task.status not in [DownloadStatus.COMPLETED, DownloadStatus.FAILED]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Task is not completed yet",
        )
    
    return FileResponse(
        path=file_path,
        filename=filename,
        media_type="application/octet-stream",
    )


@router.delete(
    "/task/{task_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    responses={
        404: {"model": ErrorResponse},
    },
    summary="Delete task",
    description="Cancel a running task and clean up its files.",
)
async def delete_task(task_id: str) -> None:
    """Cancel and clean up a task."""
    success = await task_manager.cleanup_task(task_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Task not found: {task_id}",
        )
