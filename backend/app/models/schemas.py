"""Pydantic models for API request/response schemas."""

from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


class VideoInfo(BaseModel):
    """Video information schema."""
    
    title: str = Field(..., description="Video title")
    duration: Optional[int] = Field(None, description="Video duration in seconds")
    thumbnail: Optional[str] = Field(None, description="Thumbnail URL")
    uploader: Optional[str] = Field(None, description="Uploader name")
    view_count: Optional[int] = Field(None, description="View count")
    description: Optional[str] = Field(None, description="Video description")


class FormatInfo(BaseModel):
    """Video format information."""
    
    format_id: str = Field(..., description="Format ID")
    ext: str = Field(..., description="File extension")
    resolution: Optional[str] = Field(None, description="Video resolution")
    fps: Optional[int] = Field(None, description="Frames per second")
    vcodec: Optional[str] = Field(None, description="Video codec")
    acodec: Optional[str] = Field(None, description="Audio codec")
    filesize: Optional[int] = Field(None, description="File size in bytes")
    filesize_approx: Optional[int] = Field(None, description="Approximate file size")


class VideoDetail(VideoInfo):
    """Detailed video information with available formats."""
    
    formats: list[FormatInfo] = Field(default_factory=list, description="Available formats")


class DownloadStatus(str, Enum):
    """Download task status."""
    
    PENDING = "pending"
    DOWNLOADING = "downloading"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class DownloadItemStatus(BaseModel):
    """Status of a single download item."""
    
    url: str = Field(..., description="Video URL")
    status: DownloadStatus = Field(DownloadStatus.PENDING, description="Download status")
    title: Optional[str] = Field(None, description="Video title")
    filename: Optional[str] = Field(None, description="Downloaded filename")
    progress: float = Field(0.0, ge=0, le=100, description="Download progress percentage")
    error: Optional[str] = Field(None, description="Error message if failed")
    speed: Optional[str] = Field(None, description="Download speed")
    eta: Optional[str] = Field(None, description="Estimated time remaining")


class DownloadRequest(BaseModel):
    """Batch download request."""
    
    urls: list[str] = Field(..., min_length=1, description="List of video URLs to download")
    format_id: Optional[str] = Field(None, description="Preferred format ID (optional)")
    audio_only: bool = Field(False, description="Download audio only")


class DownloadResponse(BaseModel):
    """Response for download task creation."""
    
    task_id: str = Field(..., description="Task ID for tracking")
    message: str = Field("Download task created successfully")


class TaskStatusResponse(BaseModel):
    """Response for task status query."""
    
    task_id: str = Field(..., description="Task ID")
    status: DownloadStatus = Field(..., description="Overall task status")
    total: int = Field(..., description="Total number of videos")
    completed: int = Field(0, description="Number of completed downloads")
    failed: int = Field(0, description="Number of failed downloads")
    items: list[DownloadItemStatus] = Field(default_factory=list, description="Individual item status")
    created_at: datetime = Field(..., description="Task creation time")
    finished_at: Optional[datetime] = Field(None, description="Task completion time")


class VideoInfoRequest(BaseModel):
    """Request to get video information."""
    
    url: str = Field(..., description="Video URL")


class VideoInfoResponse(BaseModel):
    """Response with video information."""
    
    info: VideoDetail = Field(..., description="Video information")


class ErrorResponse(BaseModel):
    """Error response schema."""
    
    error: str = Field(..., description="Error message")
    detail: Optional[str] = Field(None, description="Detailed error information")
