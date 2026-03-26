"""Subtitle extraction service using yt-dlp."""

import asyncio
import logging
import re
from pathlib import Path
from typing import Optional, Tuple

import yt_dlp

from app.core.config import settings
from app.services.douyin_downloader import douyin_downloader

logger = logging.getLogger(__name__)


class SubtitleExtractor:
    """Service for extracting subtitles from videos."""

    def __init__(self):
        self.download_dir: Path = settings.download_dir.resolve()

    def _format_time(self, seconds: float) -> str:
        """Format seconds to HH:MM:SS or MM:SS."""
        hours = int(seconds // 3600)
        minutes = int((seconds % 3600) // 60)
        secs = int(seconds % 60)
        
        if hours > 0:
            return f"{hours:02d}:{minutes:02d}:{secs:02d}"
        return f"{minutes:02d}:{secs:02d}"

    def _parse_srt(self, content: str) -> list:
        """Parse SRT subtitle format."""
        entries = []
        pattern = r'\d+\s+(\d{2}:\d{2}:\d{2}[,.]\d{3})\s+-->\s+(\d{2}:\d{2}:\d{2}[,.]\d{3})\s+(.+?)(?=\n\d+\s+\d{2}:|\Z)'
        matches = re.findall(pattern, content, re.DOTALL)
        
        for start, end, text in matches:
            entries.append({
                "start": start.replace(",", "."),
                "end": end.replace(",", "."),
                "text": text.strip().replace("\n", " ")
            })
        
        return entries

    def _parse_vtt(self, content: str) -> list:
        """Parse VTT subtitle format."""
        entries = []
        lines = content.split("\n")
        i = 0
        while i < len(lines):
            line = lines[i].strip()
            if " --> " in line:
                times = line.split(" --> ")
                if len(times) == 2:
                    start = times[0].strip()
                    end = times[1].strip()
                    text_lines = []
                    i += 1
                    while i < len(lines) and lines[i].strip() and " --> " not in lines[i]:
                        text_lines.append(lines[i].strip())
                        i += 1
                    
                    if text_lines:
                        entries.append({
                            "start": start,
                            "end": end,
                            "text": " ".join(text_lines)
                        })
                    continue
            i += 1
        
        return entries

    def _parse_ass(self, content: str) -> list:
        """Parse ASS/SSA subtitle format."""
        entries = []
        for line in content.split("\n"):
            if line.startswith("Dialogue:"):
                parts = line.split(",", 10)
                if len(parts) >= 10:
                    start = parts[1].strip()
                    end = parts[2].strip()
                    text = parts[9].strip()
                    text = re.sub(r'\{[^}]*\}', '', text)
                    text = text.replace("\\N", " ").replace("\\n", " ")
                    
                    entries.append({
                        "start": start,
                        "end": end,
                        "text": text
                    })
        
        return entries

    async def extract_subtitle(self, url: str) -> Tuple[str, list, dict]:
        """Extract subtitle from video URL.
        
        Strategy:
        1. Try to extract platform subtitles (SRT/VTT/ASS)
        2. If no subtitle, use video description + title as fallback text
        
        Returns:
            Tuple of (plain_text, timed_entries, video_info)
        """
        logger.info(f"Extracting subtitle from: {url}")
        
        temp_dir = self.download_dir / "temp_subtitles"
        temp_dir.mkdir(parents=True, exist_ok=True)
        
        try:
            def _extract():
                opts = {
                    "quiet": True,
                    "no_warnings": True,
                    "skip_download": True,
                    "writesubtitles": True,
                    "writeautomaticsub": True,
                    "subtitleslangs": ["zh-CN", "zh-Hans", "zh", "zh-TW", "zh-Hant", "en", "ai-zh"],
                    "subtitlesformat": "srt/best",
                    "outtmpl": str(temp_dir / "%(id)s.%(ext)s"),
                    "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                    "http_headers": {
                        "Referer": url,
                    },
                    "listsubtitles": True,
                }
                
                info = None
                with yt_dlp.YoutubeDL(opts) as ydl:
                    info = ydl.extract_info(url, download=False)
                    
                    # Check available subtitles
                    subtitles = info.get("subtitles", {})
                    auto_subs = info.get("automatic_captions", {})
                    
                    all_subs = {**subtitles, **auto_subs}
                    logger.info(f"Available subtitles: {list(all_subs.keys())}")
                    
                    # Try downloading subtitles
                    try:
                        ydl.process_info(info)
                    except Exception as sub_err:
                        logger.warning(f"Subtitle download attempt: {sub_err}")
                    
                    return info
            
            loop = asyncio.get_event_loop()
            info = await loop.run_in_executor(None, _extract)
            
            # Get video info
            video_info = {
                "title": info.get("title", "Unknown"),
                "duration": int(info.get("duration") or 0),
                "uploader": info.get("uploader", ""),
                "thumbnail": info.get("thumbnail", ""),
                "description": info.get("description", ""),
            }
            
            # Find subtitle files
            video_id = info.get("id", "")
            subtitle_files = list(temp_dir.glob(f"{video_id}*"))
            
            subtitle_file = None
            for ext in [".srt", ".vtt", ".ass", ".ssa"]:
                for f in subtitle_files:
                    if f.suffix == ext and f.stat().st_size > 0:
                        subtitle_file = f
                        break
                if subtitle_file:
                    break
            
            if subtitle_file:
                content = subtitle_file.read_text(encoding="utf-8", errors="ignore")
                
                if subtitle_file.suffix == ".srt":
                    entries = self._parse_srt(content)
                elif subtitle_file.suffix == ".vtt":
                    entries = self._parse_vtt(content)
                elif subtitle_file.suffix in [".ass", ".ssa"]:
                    entries = self._parse_ass(content)
                else:
                    entries = []
                
                plain_text = "\n".join([e["text"] for e in entries])
                
                if plain_text.strip():
                    logger.info(f"Extracted {len(entries)} subtitle entries from file")
                    return plain_text, entries, video_info
            
            # Fallback: use video description as text source
            logger.warning(f"No subtitle file found for {url}, using description as fallback")
            description = info.get("description", "").strip()
            title = info.get("title", "")
            
            if description:
                # Clean up description
                description = re.sub(r'\n+', '\n', description)
                description = re.sub(r'\s+', ' ', description)
                
                # Create a single "subtitle" entry from description
                entries = [{"start": "00:00", "end": self._format_time(video_info["duration"]), "text": description[:5000]}]
                plain_text = description[:5000]
            else:
                # Last resort: just use title
                plain_text = f"视频标题：{title}"
                entries = [{"start": "00:00", "end": "00:01", "text": plain_text}]
            
            logger.info(f"Using description fallback, text length: {len(plain_text)}")
            return plain_text, entries, video_info
            
        except Exception as e:
            logger.error(f"Failed to extract subtitle: {e}")
            raise
        finally:
            try:
                for f in temp_dir.glob("*"):
                    f.unlink()
            except Exception:
                pass


# Global instance
subtitle_extractor = SubtitleExtractor()
