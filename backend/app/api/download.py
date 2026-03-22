"""Download API endpoints."""

import logging
from pathlib import Path
from urllib.parse import urlparse

import httpx
from fastapi import APIRouter, HTTPException, status
from fastapi.responses import FileResponse, StreamingResponse

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
    infos = []
    errors = []
    
    for url in request.urls:
        try:
            info = await downloader.get_video_info(url)
            infos.append(info)
        except Exception as e:
            error_msg = str(e)
            logger.error(f"Failed to get video info for {url}: {e}")
            
            # Provide user-friendly error messages
            if "cookies" in error_msg.lower() or "login" in error_msg.lower():
                errors.append(f"该视频平台需要登录才能访问，请尝试其他平台（如 YouTube、B站）")
            elif "unavailable" in error_msg.lower() or "not found" in error_msg.lower():
                errors.append(f"视频不存在或已被删除")
            elif "unsupported" in error_msg.lower():
                errors.append(f"暂不支持该视频平台")
            else:
                errors.append(f"无法解析视频链接，请检查链接是否正确")
    
    if not infos:
        error_detail = errors[0] if errors else "无法解析视频链接"
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_detail,
        )
    
    return VideoInfoResponse(infos=infos)


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


@router.get(
    "/proxy/image",
    summary="Proxy (图片代理)",
    description="Proxy image requests to bypass referer restrictions (防盗链绕过).",
)
async def proxy_image(url: str):
    """Proxy image requests to bypass referer restrictions."""
    try:
        # Determine appropriate referer based on URL
        parsed_url = urlparse(url)
        domain = parsed_url.netloc.lower()
        
        # Platform-specific referer headers
        referer_map = {
            "bilibili.com": "https://www.bilibili.com/",
            "youtube.com": "https://www.youtube.com/",
            "youtu.be": "https://www.youtube.com/",
            "douyin.com": "https://www.douyin.com/",
            "tiktok.com": "https://www.tiktok.com/",
            "ixigua.com": "https://www.ixigua.com/",
            "kuaishou.com": "https://www.kuaishou.com/",
        }
        
        # Find matching referer
        referer = "https://www.google.com/"  # Default fallback
        for platform, platform_referer in referer_map.items():
            if platform in domain:
                referer = platform_referer
                break
        
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Referer": referer,
            "Accept": "image/webp,image/apng,image/*,*/*;q=0.8",
            "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
        }
        
        async with httpx.AsyncClient(follow_redirects=True, timeout=30.0) as client:
            response = await client.get(url, headers=headers)
            response.raise_for_status()
            
            # Determine content type
            content_type = response.headers.get("content-type", "image/jpeg")
            
            return StreamingResponse(
                content=response.aiter_bytes(),
                media_type=content_type,
                headers={
                    "Cache-Control": "public, max-age=3600",
                    "Access-Control-Allow-Origin": "*",
                },
            )
    except Exception as e:
        logger.error(f"Failed to proxy image {url}: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to load image: {str(e)}",
        )
