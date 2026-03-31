"""FFmpeg-based subtitle hardcoding service.

需要 FFmpeg 可执行文件。
安装方式:
  - scoop install ffmpeg
  - winget install ffmpeg
  - 或从 https://ffmpeg.org 下载并添加到 PATH
"""

import logging
import subprocess
from pathlib import Path
from typing import Literal
import imageio_ffmpeg

logger = logging.getLogger(__name__)


def get_ffmpeg_path() -> str:
    """Get ffmpeg executable path, prefer imageio-ffmpeg bundled binary."""
    try:
        path = imageio_ffmpeg.get_ffmpeg_exe()
        return path
    except Exception:
        return "ffmpeg"


class SubtitleHardcoder:
    """Hardcode subtitles into video using FFmpeg."""
    
    @staticmethod
    async def hardcode_subtitles(
        video_path: str,
        subtitle_path: str,
        output_path: str,
        subtitle_format: Literal["srt", "vtt", "ass"] = "srt",
        font_size: int = 24,
        font_color: str = "white",
        background_color: str = "black",
        background_alpha: float = 0.5,
    ) -> str:
        """
        Hardcode subtitles into video using FFmpeg.
        
        Args:
            video_path: Path to input video
            subtitle_path: Path to subtitle file
            output_path: Path to output video
            subtitle_format: Subtitle format (srt, vtt, ass)
            font_size: Font size for subtitles
            font_color: Font color (e.g., "white", "yellow")
            background_color: Background color
            background_alpha: Background transparency (0-1)
            
        Returns:
            Path to output video
        """
        try:
            video_path = Path(video_path)
            subtitle_path = Path(subtitle_path)
            output_path = Path(output_path)
            
            if not video_path.exists():
                raise FileNotFoundError(f"Video file not found: {video_path}")
            if not subtitle_path.exists():
                raise FileNotFoundError(f"Subtitle file not found: {subtitle_path}")
            
            # Create output directory if needed
            output_path.parent.mkdir(parents=True, exist_ok=True)
            
            logger.info(f"Hardcoding subtitles into video")
            logger.info(f"  Video: {video_path}")
            logger.info(f"  Subtitle: {subtitle_path}")
            logger.info(f"  Output: {output_path}")
            
            # Build FFmpeg filter for subtitles
            if subtitle_format.lower() == "ass":
                subtitle_filter = f"ass='{subtitle_path}'"
            else:
                subtitle_filter = f"subtitles='{subtitle_path}':force_style='FontSize={font_size},PrimaryColour=&H00FFFFFF,BorderStyle=3,Outline=1,Shadow=1'"
            
            ffmpeg_exe = get_ffmpeg_path()
            cmd = [
                ffmpeg_exe,
                "-i", str(video_path),
                "-vf", subtitle_filter,
                "-c:v", "libx264",  # Video codec
                "-preset", "medium",  # Encoding speed (ultrafast, superfast, veryfast, faster, fast, medium, slow, slower, veryslow)
                "-crf", "23",  # Quality (0-51, lower is better, 23 is default)
                "-c:a", "aac",  # Audio codec
                "-b:a", "128k",  # Audio bitrate
                "-y",  # Overwrite output
                str(output_path)
            ]
            
            logger.info(f"Running FFmpeg command: {' '.join(cmd)}")
            
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=3600  # 1 hour timeout
            )
            
            if result.returncode != 0:
                logger.error(f"FFmpeg stderr: {result.stderr}")
                raise RuntimeError(f"FFmpeg error: {result.stderr}")
            
            logger.info(f"Successfully hardcoded subtitles to: {output_path}")
            return str(output_path)
            
        except Exception as e:
            logger.error(f"Failed to hardcode subtitles: {e}")
            raise
    
    @staticmethod
    async def add_soft_subtitles(
        video_path: str,
        subtitle_path: str,
        output_path: str,
        subtitle_format: Literal["srt", "vtt", "ass"] = "srt",
    ) -> str:
        """
        Add subtitles as soft subtitles (not hardcoded) to video.
        
        Args:
            video_path: Path to input video
            subtitle_path: Path to subtitle file
            output_path: Path to output video
            subtitle_format: Subtitle format
            
        Returns:
            Path to output video
        """
        try:
            video_path = Path(video_path)
            subtitle_path = Path(subtitle_path)
            output_path = Path(output_path)
            
            if not video_path.exists():
                raise FileNotFoundError(f"Video file not found: {video_path}")
            if not subtitle_path.exists():
                raise FileNotFoundError(f"Subtitle file not found: {subtitle_path}")
            
            output_path.parent.mkdir(parents=True, exist_ok=True)
            
            logger.info(f"Adding soft subtitles to video")
            logger.info(f"  Video: {video_path}")
            logger.info(f"  Subtitle: {subtitle_path}")
            logger.info(f"  Output: {output_path}")
            
            ffmpeg_exe = get_ffmpeg_path()
            cmd = [
                ffmpeg_exe,
                "-i", str(video_path),
                "-i", str(subtitle_path),
                "-c:v", "copy",  # Copy video codec (no re-encoding)
                "-c:a", "copy",  # Copy audio codec
                "-c:s", "mov_text",  # Subtitle codec for MP4
                "-metadata:s:s:0", "language=chi",  # Set subtitle language
                "-y",  # Overwrite output
                str(output_path)
            ]
            
            logger.info(f"Running FFmpeg command: {' '.join(cmd)}")
            
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=3600
            )
            
            if result.returncode != 0:
                logger.error(f"FFmpeg stderr: {result.stderr}")
                raise RuntimeError(f"FFmpeg error: {result.stderr}")
            
            logger.info(f"Successfully added soft subtitles to: {output_path}")
            return str(output_path)
            
        except Exception as e:
            logger.error(f"Failed to add soft subtitles: {e}")
            raise


# Global instance
subtitle_hardcoder = SubtitleHardcoder()
