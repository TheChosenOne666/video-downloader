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
    
    @classmethod
    def from_dict(cls, data: dict) -> "VideoInfo":
        """Create VideoInfo from dict, handling float->int conversion."""
        return cls(
            title=data.get("title", "Unknown"),
            duration=int(data["duration"]) if data.get("duration") is not None else None,
            thumbnail=data.get("thumbnail"),
            uploader=data.get("uploader"),
            view_count=int(data["view_count"]) if data.get("view_count") is not None else None,
            description=data.get("description"),
        )


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


class SummarizeStatus(str, Enum):
    """AI summarization task status."""
    
    PENDING = "pending"
    EXTRACTING = "extracting"  # Extracting subtitle
    ANALYZING = "analyzing"    # AI analyzing
    COMPLETED = "completed"
    FAILED = "failed"


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
    with_subtitle: bool = Field(False, description="Whether to add AI-generated subtitles to the video")


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
    
    urls: list[str] = Field(..., min_length=1, description="List of video URLs")


class VideoInfoResponse(BaseModel):
    """Response with video information."""
    
    infos: list[VideoDetail] = Field(default_factory=list, description="List of video information")


class ErrorResponse(BaseModel):
    """Error response schema."""
    
    error: str = Field(..., description="Error message")
    detail: Optional[str] = Field(None, description="Detailed error information")


# ==================== AI Summarization Schemas ====================

class SummarizeRequest(BaseModel):
    """Request to create AI summarization task."""
    
    video_url: str = Field(..., description="Video URL to summarize")
    platform: str = Field("auto", description="Platform: bilibili, douyin, youtube, or auto-detect")


class SummarizeResponse(BaseModel):
    """Response for summarization task creation."""
    
    task_id: str = Field(..., description="Task ID for tracking")
    status: SummarizeStatus = Field(..., description="Task status")
    message: str = Field("Summarization task created")


class SubtitleEntry(BaseModel):
    """Single subtitle entry with timestamp."""
    
    start: str = Field(..., description="Start time (HH:MM:SS or MM:SS)")
    end: str = Field(..., description="End time")
    text: str = Field(..., description="Subtitle text")


class ChapterInfo(BaseModel):
    """Video chapter with timestamp."""
    
    time: str = Field(..., description="Chapter start time")
    title: str = Field(..., description="Chapter title")


class MindMapNode(BaseModel):
    """Mind map node structure."""
    
    name: str = Field(..., description="Node name")
    children: Optional[list["MindMapNode"]] = Field(None, description="Child nodes")


class MindMapData(BaseModel):
    """Complete mind map data."""
    
    title: str = Field(..., description="Mind map title")
    children: list[MindMapNode] = Field(default_factory=list, description="Root children")


class SummarizeResultResponse(BaseModel):
    """Response with full summarization results."""
    
    task_id: str = Field(..., description="Task ID")
    status: SummarizeStatus = Field(..., description="Task status")
    video_info: VideoInfo = Field(..., description="Video information")
    subtitle: str = Field("", description="Full subtitle text")
    subtitle_entries: list[SubtitleEntry] = Field(default_factory=list, description="Timed subtitle entries")
    summary: str = Field("", description="AI-generated summary (~200 words)")
    chapters: list[ChapterInfo] = Field(default_factory=list, description="Video chapters")
    mindmap: Optional[MindMapData] = Field(None, description="Mind map structure")
    created_at: datetime = Field(..., description="Task creation time")
    completed_at: Optional[datetime] = Field(None, description="Completion time")
    error: Optional[str] = Field(None, description="Error message if failed")


class ChatMessage(BaseModel):
    """Single chat message."""
    
    role: str = Field(..., description="Message role: user or assistant")
    content: str = Field(..., description="Message content")


class ChatRequest(BaseModel):
    """Request to ask question about video."""
    
    question: str = Field(..., description="User question")


class ChatResponse(BaseModel):
    """Response to video question."""
    
    answer: str = Field(..., description="AI answer")
    context: Optional[str] = Field(None, description="Relevant subtitle context")
    chat_history: list[ChatMessage] = Field(default_factory=list, description="Full chat history")


# ==================== Subtitle Generation Schemas ====================

class GenerateSubtitleRequest(BaseModel):
    """Request to generate subtitles for video without subtitles."""
    
    video_url: str = Field(..., description="Video URL to generate subtitles for")
    language: str = Field("zh", description="Language code (e.g., 'zh' for Chinese, 'en' for English)")
    subtitle_format: str = Field("srt", description="Output format: srt, vtt, or ass")
    hardcode: bool = Field(False, description="Whether to hardcode subtitles into video")
    soft_subtitles: bool = Field(False, description="Whether to add soft subtitles (for MP4)")


class GenerateSubtitleResponse(BaseModel):
    """Response for subtitle generation task."""
    
    task_id: str = Field(..., description="Task ID for tracking")
    status: str = Field(..., description="Task status")
    message: str = Field("Subtitle generation task created")


class SubtitleGenerationStatus(str, Enum):
    """Subtitle generation task status."""
    
    PENDING = "pending"
    DOWNLOADING = "downloading"  # Downloading video
    EXTRACTING_AUDIO = "extracting_audio"  # Extracting audio
    TRANSCRIBING = "transcribing"  # Running Whisper
    HARDCODING = "hardcoding"  # Hardcoding subtitles
    COMPLETED = "completed"
    FAILED = "failed"


class SubtitleGenerationResult(BaseModel):
    """Result of subtitle generation."""
    
    task_id: str = Field(..., description="Task ID")
    status: SubtitleGenerationStatus = Field(..., description="Task status")
    video_info: Optional[VideoInfo] = Field(None, description="Video information")
    subtitle_text: str = Field("", description="Generated subtitle text")
    subtitle_url: Optional[str] = Field(None, description="URL to download subtitle file")
    video_with_subtitles_url: Optional[str] = Field(None, description="URL to download video with hardcoded subtitles")
    progress: float = Field(0.0, ge=0, le=100, description="Progress percentage")
    created_at: datetime = Field(..., description="Task creation time")
    completed_at: Optional[datetime] = Field(None, description="Completion time")
    error: Optional[str] = Field(None, description="Error message if failed")
