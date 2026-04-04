"""Video download service using yt-dlp.

支持「下载带字幕」选项：
  - with_subtitle=True 时，下载完成后自动使用 Whisper 生成字幕
  - 通过 FFmpeg 将字幕烧录（硬编码）到视频中
  - 替换原文件，文件名后追加 "_subtitled"
"""

import asyncio
import logging
import re
from pathlib import Path
from typing import Callable, Optional
from urllib.parse import urlparse

import yt_dlp

from app.core.config import settings
from app.models.schemas import (
    DownloadItemStatus,
    DownloadStatus,
    FormatInfo,
    VideoDetail,
    VideoInfo,
)
from app.services.douyin_downloader import douyin_downloader
from app.services.whisper_subtitle_generator import whisper_generator
from app.services.subtitle_hardcoder import subtitle_hardcoder

logger = logging.getLogger(__name__)


class DownloadProgress:
    """Track download progress."""
    
    def __init__(self) -> None:
        self.progress: float = 0.0
        self.speed: Optional[str] = None
        self.eta: Optional[str] = None
    
    def update(self, d: dict) -> None:
        """Update progress from yt-dlp hook."""
        if d.get("status") == "downloading":
            total = d.get("total_bytes") or d.get("total_bytes_estimate", 0)
            downloaded = d.get("downloaded_bytes", 0)
            if total > 0:
                self.progress = (downloaded / total) * 100
            
            if d.get("speed"):
                speed_bytes = d["speed"]
                self.speed = self._format_size(speed_bytes) + "/s"
            
            if d.get("eta"):
                self.eta = self._format_time(d["eta"])
    
    @staticmethod
    def _format_size(size: float) -> str:
        """Format file size."""
        for unit in ["B", "KB", "MB", "GB"]:
            if size < 1024:
                return f"{size:.1f}{unit}"
            size /= 1024
        return f"{size:.1f}TB"
    
    @staticmethod
    def _format_time(seconds: int) -> str:
        """Format time duration."""
        if seconds < 60:
            return f"{seconds}s"
        elif seconds < 3600:
            return f"{seconds // 60}m {seconds % 60}s"
        else:
            return f"{seconds // 3600}h {(seconds % 3600) // 60}m"


class VideoDownloader:
    """Service for downloading videos using yt-dlp."""
    
    def __init__(self) -> None:
        self.download_dir: Path = settings.download_dir.resolve()
        self._active_downloads: dict[str, asyncio.Task] = {}
    
    def _sanitize_filename(self, filename: str) -> str:
        """Sanitize filename for safe file system usage."""
        # Remove invalid characters
        sanitized = re.sub(r'[<>:"/\\|?*]', "", filename)
        # Replace multiple spaces with single space
        sanitized = re.sub(r"\s+", " ", sanitized)
        # Truncate if too long
        max_length = 200
        if len(sanitized) > max_length:
            sanitized = sanitized[:max_length]
        return sanitized.strip()
    
    def _get_ydl_opts(
        self,
        output_path: Path,
        progress: DownloadProgress,
        format_id: Optional[str] = None,
        audio_only: bool = False,
    ) -> dict:
        """Get yt-dlp options with anti-hotlinking and anti-cookie headers."""
        import imageio_ffmpeg
        ffmpeg_path = imageio_ffmpeg.get_ffmpeg_exe()
        
        opts = {
            "outtmpl": str(output_path / "%(id)s.%(ext)s"),  # 使用视频 ID 作为文件名，避免非法字符
            "quiet": True,
            "no_warnings": True,
            "progress_hooks": [progress.update],
            "noplaylist": True,  # Download only single video
            # 指定 FFmpeg 路径（用于合并视频+音频）
            "ffmpeg_location": ffmpeg_path,
            # Anti-hotlinking headers (防盗链绕过)
            "http_headers": {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept": "*/*",
                "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
            },
            # Anti-cookie bypass (免登录绕过)
            "nocheckcertificate": True,  # Skip SSL certificate verification
            "cookiefile": None,  # Explicitly disable cookies
        }
        
        if audio_only:
            opts["format"] = "bestaudio/best"
        elif format_id and format_id not in ('best', ''):
            # 只有明确的 format_id 才直接传给 yt-dlp
            # 'best' 是前端的选择器概念，不是 yt-dlp 的 format
            opts["format"] = format_id
        else:
            # 使用 bestvideo+bestaudio 格式，确保视频和音频合并
            # merge_output_format 确保输出为 mkv 格式（支持大多数视频+音频组合）
            opts["format"] = "bestvideo+bestaudio/best"
            opts["merge_output_format"] = "mkv"
        
        return opts
    
    async def get_video_info(self, url: str) -> VideoDetail:
        """Extract video information without downloading."""
        
        # 抖音使用专用解析器
        if douyin_downloader.is_douyin_url(url):
            logger.info(f"使用抖音专用解析器: {url}")
            return await douyin_downloader.get_video_info(url)
        
        # 其他平台使用 yt-dlp
        def _extract() -> dict:
            # Anti-cookie-bypass options for platforms like Douyin
            opts = {
                "quiet": True,
                "no_warnings": True,
                "extract_flat": False,
                # Anti-cookie bypass strategies
                "nocheckcertificate": True,  # Skip SSL certificate verification for some platforms
                "cookiefile": None,  # Explicitly disable cookies
                "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            }
            
            with yt_dlp.YoutubeDL(opts) as ydl:
                return ydl.extract_info(url, download=False)
        
        loop = asyncio.get_event_loop()
        info = await loop.run_in_executor(None, _extract)
        
        # Parse basic info
        video_info = VideoInfo(
            title=info.get("title", "Unknown"),
            duration=int(info.get("duration") or 0),  # Convert float to int
            thumbnail=info.get("thumbnail"),
            uploader=info.get("uploader"),
            view_count=info.get("view_count"),
            description=info.get("description"),
        )
        
        # Parse formats
        formats = []
        seen_resolutions = set()
        
        for fmt in info.get("formats", []):
            # Skip formats without both video and audio unless audio-only
            if not fmt.get("vcodec") and not fmt.get("acodec"):
                continue
            
            # Skip duplicate resolutions
            resolution = fmt.get("resolution") or fmt.get("format_note", "")
            if resolution in seen_resolutions:
                continue
            seen_resolutions.add(resolution)
            
            format_info = FormatInfo(
                format_id=str(fmt.get("format_id", "")),
                ext=fmt.get("ext", ""),
                resolution=resolution,
                fps=int(fmt.get("fps") or 0),  # Convert float to int
                vcodec=fmt.get("vcodec"),
                acodec=fmt.get("acodec"),
                filesize=fmt.get("filesize"),
                filesize_approx=fmt.get("filesize_approx"),
            )
            formats.append(format_info)
        
        # Sort formats by resolution (highest first)
        formats.sort(
            key=lambda f: int(f.resolution.split("x")[1] if f.resolution and "x" in f.resolution else 0),
            reverse=True,
        )
        
        return VideoDetail(
            title=video_info.title,
            duration=video_info.duration,
            thumbnail=video_info.thumbnail,
            uploader=video_info.uploader,
            view_count=video_info.view_count,
            description=video_info.description,
            formats=formats[:20],  # Limit to 20 formats
        )
    
    async def download_video(
        self,
        url: str,
        task_id: str,
        status_callback: Optional[Callable[[DownloadItemStatus], None]] = None,
        format_id: Optional[str] = None,
        audio_only: bool = False,
        with_subtitle: bool = False,
    ) -> DownloadItemStatus:
        """Download a single video, optionally with subtitles hardcoded."""
        
        status = DownloadItemStatus(url=url)
        progress = DownloadProgress()
        
        try:
            # Get video info first
            info = await self.get_video_info(url)
            status.title = info.title
            
            # Create task-specific download directory
            task_dir = self.download_dir / task_id
            task_dir.mkdir(parents=True, exist_ok=True)
            
            # Update status
            status.status = DownloadStatus.DOWNLOADING
            if status_callback:
                status_callback(status)
            
            # 抖音使用专用下载器（不支持字幕）
            if douyin_downloader.is_douyin_url(url):
                logger.info(f"使用抖音专用下载器: {url}")
                result = await douyin_downloader.download_video(
                    url=url,
                    output_path=task_dir,
                    progress=progress,
                    status_callback=status_callback,
                )
                if with_subtitle:
                    logger.warning("抖音视频暂不支持自动字幕，将在后续版本支持")
                return result
            
            # 其他平台使用 yt-dlp
            def _download() -> str:
                opts = self._get_ydl_opts(task_dir, progress, format_id, audio_only)
                with yt_dlp.YoutubeDL(opts) as ydl:
                    ydl.download([url])
                # Find the downloaded file
                files = list(task_dir.glob(f"*{urlparse(url).netloc.split('.')[0]}*"))
                if not files:
                    files = list(task_dir.iterdir())
                return files[0].name if files else ""
            
            loop = asyncio.get_event_loop()
            filename = await loop.run_in_executor(None, _download)
            
            # Fix filename - handle .part files and other incomplete downloads
            if filename.endswith('.part') or not filename:
                logger.warning(f"Invalid filename detected: {filename}, searching for actual file")
                # Find actual video files in the directory
                video_files = [
                    f.name for f in task_dir.iterdir() 
                    if f.suffix in ['.mp4', '.mkv', '.webm', '.flv'] and not f.name.endswith('.part')
                ]
                if video_files:
                    filename = video_files[0]
                    logger.info(f"Found actual file: {filename}")
                else:
                    logger.error(f"No valid video file found in {task_dir}")
            
            # Update progress to 100% after download completes
            status.progress = progress.progress if progress.progress > 0 else 100.0
            
            # === With subtitle: generate and hardcode ===
            if with_subtitle and not audio_only:
                logger.info(f"Generating subtitles for: {filename}")
                try:
                    video_path = task_dir / filename
                    if video_path.exists():
                        # Generate subtitle using Whisper
                        srt_path = task_dir / f"{video_path.stem}_whisper.srt"
                        sub_ok = await whisper_generator.generate_subtitle(
                            video_path=str(video_path),
                            output_srt=str(srt_path),
                        )
                        
                        if sub_ok and srt_path.exists():
                            # Hardcode subtitles into video
                            output_path = task_dir / f"{video_path.stem}_subtitled.mp4"
                            await subtitle_hardcoder.hardcode_subtitles(
                                video_path=str(video_path),
                                subtitle_path=str(srt_path),
                                output_path=str(output_path),
                            )
                            
                            # Update filename to the subtitled version
                            status.filename = output_path.name
                            logger.info(f"Subtitled video saved as: {output_path.name}")
                            
                            # Remove original (keep only subtitled version)
                            try:
                                video_path.unlink()
                                srt_path.unlink()
                            except Exception:
                                pass
                        else:
                            logger.warning(f"Whisper subtitle generation failed, keeping original video")
                            status.filename = filename
                    else:
                        logger.warning(f"Video file not found: {video_path}")
                        status.filename = filename
                except Exception as sub_err:
                    logger.error(f"Failed to add subtitles to video: {sub_err}")
                    logger.warning("Keeping original video without subtitles")
                    status.filename = filename
            else:
                status.filename = filename
            
            status.status = DownloadStatus.COMPLETED
            status.progress = 100.0
            
        except Exception as e:
            logger.error(f"Download failed for {url}: {e}")
            status.status = DownloadStatus.FAILED
            status.error = str(e)
        
        if status_callback:
            status_callback(status)
        
        return status
    
    async def download_batch(
        self,
        urls: list[str],
        task_id: str,
        status_callback: Optional[Callable[[int, DownloadItemStatus], None]] = None,
        format_id: Optional[str] = None,
        audio_only: bool = False,
        with_subtitle: bool = False,
    ) -> list[DownloadItemStatus]:
        """Download multiple videos concurrently."""
        
        semaphore = asyncio.Semaphore(settings.max_concurrent_downloads)
        results: list[DownloadItemStatus] = []
        
        async def download_with_semaphore(index: int, url: str) -> tuple[int, DownloadItemStatus]:
            async with semaphore:
                result = await self.download_video(
                    url=url,
                    task_id=task_id,
                    status_callback=lambda s: status_callback(index, s) if status_callback else None,
                    format_id=format_id,
                    audio_only=audio_only,
                    with_subtitle=with_subtitle,
                )
                return index, result
        
        # Start all downloads
        tasks = [
            download_with_semaphore(i, url)
            for i, url in enumerate(urls)
        ]
        
        # Wait for all to complete
        completed = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Process results
        for item in completed:
            if isinstance(item, Exception):
                logger.error(f"Download task failed: {item}")
            else:
                index, status = item
                results.insert(index, status)
        
        return results
    
    def cleanup_task_files(self, task_id: str) -> None:
        """Remove downloaded files for a task."""
        task_dir = self.download_dir / task_id
        if task_dir.exists():
            import shutil
            shutil.rmtree(task_dir)
            logger.info(f"Cleaned up files for task {task_id}")


# Global downloader instance
downloader = VideoDownloader()
