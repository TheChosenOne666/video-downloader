"""Subtitle generation API endpoints."""

import logging
import uuid
from datetime import datetime
from typing import Dict, Optional
import asyncio
from pathlib import Path

from fastapi import APIRouter, HTTPException, status
from fastapi.responses import FileResponse

from app.models.schemas import (
    GenerateSubtitleRequest,
    GenerateSubtitleResponse,
    SubtitleGenerationResult,
    SubtitleGenerationStatus,
    VideoInfo,
    ErrorResponse,
)
from app.services.downloader import downloader
from app.services.whisper_subtitle_generator import get_whisper_generator
from app.services.subtitle_hardcoder import subtitle_hardcoder
from app.core.config import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/subtitle", tags=["subtitle"])

# In-memory storage for subtitle generation tasks
subtitle_tasks: Dict[str, dict] = {}


@router.post(
    "/generate",
    response_model=GenerateSubtitleResponse,
    status_code=status.HTTP_202_ACCEPTED,
    responses={
        400: {"model": ErrorResponse},
        500: {"model": ErrorResponse},
    },
    summary="Generate subtitles for video",
    description="Submit a video URL to generate subtitles using Whisper. Returns task ID for tracking.",
)
async def create_subtitle_generation_task(request: GenerateSubtitleRequest) -> GenerateSubtitleResponse:
    """Create a new subtitle generation task."""
    try:
        task_id = str(uuid.uuid4())
        
        # Initialize task
        subtitle_tasks[task_id] = {
            "task_id": task_id,
            "status": SubtitleGenerationStatus.PENDING,
            "video_url": request.video_url,
            "language": request.language,
            "subtitle_format": request.subtitle_format,
            "hardcode": request.hardcode,
            "soft_subtitles": request.soft_subtitles,
            "video_info": None,
            "subtitle_text": "",
            "subtitle_path": None,
            "video_with_subtitles_path": None,
            "progress": 0.0,
            "created_at": datetime.now(),
            "completed_at": None,
            "error": None,
        }
        
        # Start async processing
        asyncio.create_task(_process_subtitle_generation(task_id, request))
        
        logger.info(f"Created subtitle generation task: {task_id}")
        return GenerateSubtitleResponse(
            task_id=task_id,
            status=SubtitleGenerationStatus.PENDING,
            message="Subtitle generation task created, processing...",
        )
        
    except Exception as e:
        logger.error(f"Failed to create subtitle generation task: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create task: {str(e)}",
        )


@router.get(
    "/{task_id}",
    response_model=SubtitleGenerationResult,
    responses={
        404: {"model": ErrorResponse},
    },
    summary="Get subtitle generation task status",
    description="Get the status and results of a subtitle generation task.",
)
async def get_subtitle_task_status(task_id: str) -> SubtitleGenerationResult:
    """Get subtitle generation task status."""
    task = subtitle_tasks.get(task_id)
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Task not found: {task_id}",
        )
    
    return SubtitleGenerationResult(
        task_id=task_id,
        status=task["status"],
        video_info=task["video_info"],
        subtitle_text=task["subtitle_text"],
        subtitle_url=f"/api/subtitle/{task_id}/download/subtitle" if task["subtitle_path"] else None,
        video_with_subtitles_url=f"/api/subtitle/{task_id}/download/video" if task["video_with_subtitles_path"] else None,
        progress=task["progress"],
        created_at=task["created_at"],
        completed_at=task["completed_at"],
        error=task["error"],
    )


@router.get(
    "/{task_id}/download/subtitle",
    summary="Download generated subtitle file",
    description="Download the generated subtitle file.",
)
async def download_subtitle_file(task_id: str):
    """Download generated subtitle file."""
    task = subtitle_tasks.get(task_id)
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Task not found: {task_id}",
        )
    
    if not task["subtitle_path"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Subtitle file not available",
        )
    
    subtitle_path = Path(task["subtitle_path"])
    if not subtitle_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subtitle file not found",
        )
    
    return FileResponse(
        path=subtitle_path,
        filename=f"subtitle.{task['subtitle_format']}",
        media_type="text/plain",
    )


@router.get(
    "/{task_id}/download/video",
    summary="Download video with hardcoded subtitles",
    description="Download the video with hardcoded subtitles.",
)
async def download_video_with_subtitles(task_id: str):
    """Download video with hardcoded subtitles."""
    task = subtitle_tasks.get(task_id)
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Task not found: {task_id}",
        )
    
    if not task["video_with_subtitles_path"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Video with subtitles not available",
        )
    
    video_path = Path(task["video_with_subtitles_path"])
    if not video_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Video file not found",
        )
    
    return FileResponse(
        path=video_path,
        filename=f"video_with_subtitles.mp4",
        media_type="video/mp4",
    )


async def _process_subtitle_generation(task_id: str, request: GenerateSubtitleRequest):
    """Background task to process subtitle generation."""
    task = subtitle_tasks.get(task_id)
    if not task:
        return
    
    try:
        # Step 1: Download video
        task["status"] = SubtitleGenerationStatus.DOWNLOADING
        task["progress"] = 10.0
        logger.info(f"[{task_id}] Downloading video...")
        
        try:
            # Download video using existing downloader
            # 使用 bestaudio 格式确保有音频流（B站等平台音视频分离）
            dl_status = await downloader.download_video(
                url=request.video_url,
                task_id=task_id,
                format_id="bestaudio/best",  # 优先下载带音频的格式
            )
            
            if dl_status.status.value != "completed" or not dl_status.filename:
                raise RuntimeError(dl_status.error or "Download failed with no error message")
            
            # Build full path to downloaded file
            video_path = str(settings.download_dir / task_id / dl_status.filename)
            
            # Get video info for display
            try:
                from app.models.schemas import VideoInfo
                info = await downloader.get_video_info(request.video_url)
                task["video_info"] = VideoInfo(
                    title=info.title,
                    duration=info.duration,
                    thumbnail=info.thumbnail,
                    uploader=info.uploader,
                    view_count=info.view_count,
                )
            except Exception as e:
                logger.warning(f"[{task_id}] Could not get video info: {e}")
            
            task["progress"] = 30.0
            
        except Exception as e:
            logger.error(f"[{task_id}] Failed to download video: {e}")
            task["status"] = SubtitleGenerationStatus.FAILED
            task["error"] = f"Failed to download video: {str(e)}"
            task["completed_at"] = datetime.now()
            return
        
        # Step 2: Generate subtitles using Faster-Whisper
        task["status"] = SubtitleGenerationStatus.TRANSCRIBING
        task["progress"] = 40.0
        logger.info(f"[{task_id}] Generating subtitles with Faster-Whisper...")
        
        try:
            whisper_gen = get_whisper_generator(model_size="base")
            segments = await whisper_gen.generate_subtitles(
                video_path,
                language=request.language
            )
            
            # Convert to requested format
            if request.subtitle_format == "vtt":
                subtitle_text = whisper_gen.segments_to_vtt(segments)
                subtitle_ext = "vtt"
            elif request.subtitle_format == "json":
                subtitle_text = whisper_gen.segments_to_json(segments)
                subtitle_ext = "json"
            else:  # Default to SRT
                subtitle_text = whisper_gen.segments_to_srt(segments)
                subtitle_ext = "srt"
            
            task["subtitle_text"] = subtitle_text
            task["progress"] = 60.0
            
            # Save subtitle file
            subtitle_path = Path(settings.download_dir) / task_id / f"subtitle.{subtitle_ext}"
            subtitle_path.parent.mkdir(parents=True, exist_ok=True)
            subtitle_path.write_text(subtitle_text, encoding="utf-8")
            task["subtitle_path"] = str(subtitle_path)
            
            logger.info(f"[{task_id}] Subtitles generated and saved")
            
        except Exception as e:
            logger.error(f"[{task_id}] Failed to generate subtitles: {e}")
            task["status"] = SubtitleGenerationStatus.FAILED
            task["error"] = f"Failed to generate subtitles: {str(e)}"
            task["completed_at"] = datetime.now()
            return
        
        # Step 3: Hardcode subtitles if requested
        if request.hardcode or request.soft_subtitles:
            task["status"] = SubtitleGenerationStatus.HARDCODING
            task["progress"] = 70.0
            logger.info(f"[{task_id}] Hardcoding subtitles into video...")
            
            try:
                output_video_path = Path(settings.download_dir) / task_id / "video_with_subtitles.mp4"
                
                if request.hardcode:
                    # Hardcode subtitles (re-encode video)
                    await subtitle_hardcoder.hardcode_subtitles(
                        video_path=video_path,
                        subtitle_path=str(subtitle_path),
                        output_path=str(output_video_path),
                        subtitle_format=subtitle_ext,
                    )
                else:
                    # Add soft subtitles (no re-encoding)
                    await subtitle_hardcoder.add_soft_subtitles(
                        video_path=video_path,
                        subtitle_path=str(subtitle_path),
                        output_path=str(output_video_path),
                        subtitle_format=subtitle_ext,
                    )
                
                task["video_with_subtitles_path"] = str(output_video_path)
                task["progress"] = 90.0
                logger.info(f"[{task_id}] Video with subtitles created")
                
            except Exception as e:
                logger.error(f"[{task_id}] Failed to hardcode subtitles: {e}")
                task["status"] = SubtitleGenerationStatus.FAILED
                task["error"] = f"Failed to hardcode subtitles: {str(e)}"
                task["completed_at"] = datetime.now()
                return
        
        # Completed
        task["status"] = SubtitleGenerationStatus.COMPLETED
        task["progress"] = 100.0
        task["completed_at"] = datetime.now()
        logger.info(f"[{task_id}] Subtitle generation completed successfully")
        
    except Exception as e:
        logger.error(f"[{task_id}] Unexpected error: {e}")
        task["status"] = SubtitleGenerationStatus.FAILED
        task["error"] = f"Unexpected error: {str(e)}"
        task["completed_at"] = datetime.now()
