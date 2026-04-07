"""Download API endpoints."""

import logging
from pathlib import Path
from typing import Optional
from urllib.parse import urlparse

import httpx
from fastapi import APIRouter, HTTPException, status, Header, Depends
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
from app.services.membership_service import membership_service
from app.services.auth_service import auth_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["download"])


async def get_current_user_optional(authorization: Optional[str] = Header(None)) -> Optional[dict]:
    """Get current user from authorization header (optional)."""
    if not authorization:
        return None
    
    if authorization.startswith("Bearer "):
        token = authorization[7:]
    else:
        token = authorization
    
    return auth_service.get_user_by_token(token)


async def check_download_permission(user: Optional[dict] = None) -> None:
    """Check if user can download, raise HTTPException if not."""
    if user:
        can_download, message = await membership_service.can_user_download(user.id)
    else:
        # Anonymous user - treat as free user with 0 downloads used
        can_download = True
        message = "游客模式，每日限3次下载"
    
    if not can_download:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "message": message,
                "code": "DOWNLOAD_LIMIT_EXCEEDED",
                "upgrade_url": "/pricing"
            }
        )


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
            logger.info(f"Successfully parsed: {url} -> {info.title}")
        except Exception as e:
            error_msg = str(e)
            logger.error(f"Failed to get video info for {url}: {e}", exc_info=True)
            
            # Provide user-friendly error messages
            if "cookies" in error_msg.lower() or "login" in error_msg.lower():
                errors.append(f"该视频平台需要登录才能访问，请尝试其他平台（如 YouTube、B站）")
            elif "unavailable" in error_msg.lower() or "not found" in error_msg.lower():
                errors.append(f"视频不存在或已被删除")
            elif "unsupported" in error_msg.lower():
                errors.append(f"暂不支持该视频平台")
            else:
                errors.append(f"无法解析视频链接: {error_msg[:100]}")
    
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
        403: {"model": ErrorResponse},
    },
    summary="Start batch download",
    description="Submit a batch download task. Returns task ID for tracking progress.",
)
async def start_download(
    request: DownloadRequest,
    authorization: Optional[str] = Header(None)
) -> DownloadResponse:
    """Start a batch download task."""
    # Get user (optional - allows anonymous downloads)
    user = await get_current_user_optional(authorization)
    
    # Check download permission
    await check_download_permission(user)
    
    try:
        task_id = await task_manager.create_task(request)
        
        # Increment download count for logged-in users
        if user:
            await membership_service.increment_download_count(user.id)
        
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
        if not url:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Missing 'url' parameter",
            )
        
        # Determine appropriate referer based on URL
        parsed_url = urlparse(url)
        domain = parsed_url.netloc.lower()
        
        # Platform-specific headers for bypassing hotlink protection
        if "hdslb.com" in domain or "bilibili.com" in domain or "bfs" in domain:
            # B站防盗链 - 需要完整浏览器指纹
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
                "Referer": "https://www.bilibili.com/",
                "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
                "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
                "Accept-Encoding": "gzip, deflate, br",
                "Origin": "https://www.bilibili.com",
                "Sec-Ch-Ua": '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
                "Sec-Ch-Ua-Mobile": "?0",
                "Sec-Ch-Ua-Platform": '"Windows"',
                "Sec-Fetch-Dest": "image",
                "Sec-Fetch-Mode": "no-cors",
                "Sec-Fetch-Site": "same-site",
                "Cache-Control": "no-cache",
                "Pragma": "no-cache",
            }
        elif "douyin.com" in domain or "douyinpic.com" in domain:
            # 抖音防盗链
            headers = {
                "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1",
                "Referer": "https://www.douyin.com/",
                "Accept": "image/webp,image/apng,image/*,*/*;q=0.8",
            }
        else:
            # Default headers for other platforms
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
                "Referer": f"{parsed_url.scheme}://{domain}/",
                "Accept": "image/webp,image/apng,image/*,*/*;q=0.8",
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
                    "Cache-Control": "public, max-age=86400",  # 缓存 24 小时
                    "Access-Control-Allow-Origin": "*",
                    "X-Proxy-Cache": "HIT",
                },
            )
    except httpx.HTTPStatusError as e:
        logger.error(f"HTTP error proxying image {url}: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to load image (HTTP {e.response.status_code})",
        )
    except Exception as e:
        logger.error(f"Failed to proxy image {url}: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to load image: {str(e)}",
        )
