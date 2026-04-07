"""Whisper-based subtitle generation service using Faster-Whisper.

Faster-Whisper 比原版 Whisper 小 3-5 倍，速度快 2-4 倍。
不需要 PyTorch，安装包 < 100MB。
"""

import logging
import subprocess
import json
from pathlib import Path
from typing import Optional, List
import tempfile

# 延迟导入 faster_whisper，避免 DLL 冲突
WhisperModel = None
imageio_ffmpeg = None

# 保持 pydantic 正常导入
from pydantic import BaseModel

def _ensure_imports():
    """延迟导入必要的模块"""
    global WhisperModel, imageio_ffmpeg
    if WhisperModel is None:
        from faster_whisper import WhisperModel as _WhisperModel
        WhisperModel = _WhisperModel
    if imageio_ffmpeg is None:
        import imageio_ffmpeg as _imageio_ffmpeg
        imageio_ffmpeg = _imageio_ffmpeg


def get_ffmpeg_path() -> str:
    """Get ffmpeg executable path, prefer imageio-ffmpeg bundled binary."""
    _ensure_imports()
    try:
        path = imageio_ffmpeg.get_ffmpeg_exe()
        logger.info(f"Using imageio-ffmpeg bundled binary: {path}")
        return path
    except Exception:
        logger.warning("imageio-ffmpeg not available, falling back to system ffmpeg")
        return "ffmpeg"

logger = logging.getLogger(__name__)


class SubtitleSegment(BaseModel):
    """Single subtitle segment."""
    start: float  # Start time in seconds
    end: float    # End time in seconds
    text: str     # Subtitle text


class WhisperSubtitleGenerator:
    """Generate subtitles from video using Faster-Whisper.
    
    比原版 Whisper 更快更小，无需 PyTorch 依赖。
    """
    
    def __init__(self, model_size: str = "base"):
        """
        Initialize Faster-Whisper subtitle generator.
        
        Args:
            model_size: Whisper model size - "tiny", "base", "small", "medium", "large"
                       推荐: "base" (约 140MB)
        """
        self.model_size = model_size
        self.model = None
        self._load_model()
    
    def _load_model(self):
        """Load Faster-Whisper model, prefer local cache."""
        _ensure_imports()  # 确保导入完成
        try:
            # 优先使用本地已下载的模型
            local_model_path = r"C:\Users\l\.cache\huggingface\hub\faster-whisper-base"
            import os
            if os.path.exists(os.path.join(local_model_path, "model.bin")):
                logger.info(f"Loading Faster-Whisper from local path: {local_model_path}")
                self.model = WhisperModel(
                    local_model_path,
                    device="cpu",
                    compute_type="int8"
                )
            else:
                logger.info(f"Loading Faster-Whisper model: {self.model_size} (will download if needed)")
                os.environ.setdefault("HF_ENDPOINT", "https://hf-mirror.com")
                self.model = WhisperModel(
                    self.model_size,
                    device="cpu",
                    compute_type="int8"
                )
            logger.info("Faster-Whisper model loaded successfully")
        except Exception as e:
            logger.error(f"Failed to load Faster-Whisper model: {e}")
            raise
    
    async def extract_audio_from_video(self, video_path: str) -> str:
        """
        Extract audio from video file using FFmpeg.
        If video has no audio stream, try to find a companion audio file.
        """
        try:
            video_path = Path(video_path)
            if not video_path.exists():
                raise FileNotFoundError(f"Video file not found: {video_path}")
            
            audio_path = video_path.parent / f"{video_path.stem}_audio.wav"
            ffmpeg_exe = get_ffmpeg_path()
            
            # 先检查视频是否有音频流
            probe_cmd = [
                ffmpeg_exe, "-i", str(video_path),
                "-hide_banner", "-loglevel", "error",
                "-select_streams", "a", "-show_entries", "stream=codec_type",
                "-of", "csv=p=0"
            ]
            probe = subprocess.run(probe_cmd, capture_output=True, text=True, timeout=30)
            has_audio = "audio" in probe.stdout or "audio" in probe.stderr
            
            # 如果没有音频流，查找同目录下的音频文件
            if not has_audio:
                logger.warning(f"Video has no audio stream, looking for companion audio file...")
                audio_files = list(video_path.parent.glob("*.m4a")) + \
                              list(video_path.parent.glob("*.mp3")) + \
                              list(video_path.parent.glob("*.aac"))
                if audio_files:
                    source = str(audio_files[0])
                    logger.info(f"Found companion audio: {source}")
                else:
                    raise RuntimeError(
                        "视频没有音频流，且未找到伴音文件。"
                        "请确保下载时包含音频（B站视频需要 ffmpeg 合并音视频）。"
                    )
            else:
                source = str(video_path)
            
            logger.info(f"Extracting audio from: {source}")
            
            cmd = [
                ffmpeg_exe,
                "-i", source,
                "-vn",
                "-acodec", "pcm_s16le",
                "-ar", "16000",
                "-ac", "1",
                "-y",
                str(audio_path)
            ]
            
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
            
            if result.returncode != 0:
                raise RuntimeError(f"FFmpeg error: {result.stderr}")
            
            logger.info(f"Audio extracted to: {audio_path}")
            return str(audio_path)
            
        except Exception as e:
            logger.error(f"Failed to extract audio: {e}")
            raise
    
    async def generate_subtitles(
        self,
        video_path: str,
        language: str = "zh"
    ) -> List[SubtitleSegment]:
        """
        Generate subtitles from video using Faster-Whisper.
        
        Args:
            video_path: Path to video file
            language: Language code (e.g., "zh" for Chinese, "en" for English)
            
        Returns:
            List of subtitle segments
        """
        try:
            logger.info(f"Generating subtitles for: {video_path}")
            
            # Extract audio
            audio_path = await self.extract_audio_from_video(video_path)
            
            try:
                # Run Faster-Whisper transcription
                logger.info(f"Running Faster-Whisper transcription (language: {language})")
                
                # language=None 让模型自动检测语言
                segments, info = self.model.transcribe(
                    audio_path,
                    language=language if language != "auto" else None,
                    task="transcribe",
                    beam_size=5,
                    vad_filter=False,  # 关闭 VAD，避免误过滤
                )
                
                logger.info(f"Detected language: {info.language} (probability: {info.language_probability:.2f})")
                
                # Convert to subtitle segments
                subtitle_segments = []
                for segment in segments:
                    subtitle_segments.append(SubtitleSegment(
                        start=segment.start,
                        end=segment.end,
                        text=segment.text.strip()
                    ))
                
                logger.info(f"Generated {len(subtitle_segments)} subtitle segments")
                return subtitle_segments
                
            finally:
                # Clean up audio file
                try:
                    Path(audio_path).unlink()
                    logger.info(f"Cleaned up audio file: {audio_path}")
                except Exception as e:
                    logger.warning(f"Failed to clean up audio file: {e}")
                    
        except Exception as e:
            logger.error(f"Failed to generate subtitles: {e}")
            raise
    
    def segments_to_srt(self, segments: List[SubtitleSegment]) -> str:
        """
        Convert subtitle segments to SRT format.
        
        Args:
            segments: List of subtitle segments
            
        Returns:
            SRT format string
        """
        srt_content = ""
        for idx, segment in enumerate(segments, 1):
            start_time = self._seconds_to_srt_time(segment.start)
            end_time = self._seconds_to_srt_time(segment.end)
            srt_content += f"{idx}\n{start_time} --> {end_time}\n{segment.text}\n\n"
        return srt_content
    
    def segments_to_vtt(self, segments: List[SubtitleSegment]) -> str:
        """
        Convert subtitle segments to WebVTT format.
        
        Args:
            segments: List of subtitle segments
            
        Returns:
            WebVTT format string
        """
        vtt_content = "WEBVTT\n\n"
        for segment in segments:
            start_time = self._seconds_to_vtt_time(segment.start)
            end_time = self._seconds_to_vtt_time(segment.end)
            vtt_content += f"{start_time} --> {end_time}\n{segment.text}\n\n"
        return vtt_content
    
    def segments_to_json(self, segments: List[SubtitleSegment]) -> str:
        """
        Convert subtitle segments to JSON format.
        
        Args:
            segments: List of subtitle segments
            
        Returns:
            JSON format string
        """
        data = [
            {
                "start": segment.start,
                "end": segment.end,
                "text": segment.text
            }
            for segment in segments
        ]
        return json.dumps(data, ensure_ascii=False, indent=2)
    
    @staticmethod
    def _seconds_to_srt_time(seconds: float) -> str:
        """Convert seconds to SRT time format (HH:MM:SS,mmm)."""
        hours = int(seconds // 3600)
        minutes = int((seconds % 3600) // 60)
        secs = int(seconds % 60)
        millis = int((seconds % 1) * 1000)
        return f"{hours:02d}:{minutes:02d}:{secs:02d},{millis:03d}"
    
    @staticmethod
    def _seconds_to_vtt_time(seconds: float) -> str:
        """Convert seconds to WebVTT time format (HH:MM:SS.mmm)."""
        hours = int(seconds // 3600)
        minutes = int((seconds % 3600) // 60)
        secs = int(seconds % 60)
        millis = int((seconds % 1) * 1000)
        return f"{hours:02d}:{minutes:02d}:{secs:02d}.{millis:03d}"


# Global instance
whisper_generator = None


def get_whisper_generator(model_size: str = "base") -> WhisperSubtitleGenerator:
    """Get or create Whisper subtitle generator instance."""
    global whisper_generator
    if whisper_generator is None:
        whisper_generator = WhisperSubtitleGenerator(model_size=model_size)
    return whisper_generator
