"""Subtitle extraction service using yt-dlp.

支持平台：B站、抖音、YouTube、腾讯视频等主流视频平台。
策略：
  1. 提取平台字幕（优先人工翻译字幕，自动字幕作备选）
  2. 字幕提取失败时，使用视频描述作为文本来源
  3. 若均无字幕，返回空文本让调用方判断处理
"""

import asyncio
import logging
import re
import json
from pathlib import Path
from typing import Optional, Tuple, Dict, List, Any

import yt_dlp

from app.core.config import settings
from app.services.douyin_downloader import douyin_downloader

logger = logging.getLogger(__name__)

# 所有支持的语言标签（按优先级排序）
# 某些平台用非标准标签，需要全部列出
ALL_SUBTITLE_LANGS = [
    # 中文
    "zh-Hans", "zh-Hant", "zh-TW", "zh-HK",
    "zh-CN", "zh", "chi", "zho",
    # 中文平台自动字幕
    "ai-zh", "zh-CN-ai", "zh-Hans-ai", "zh-TW-ai",
    # 英文（常见备选）
    "en", "eng", "english",
    # 日韩
    "ja", "jpn", "ko", "kor",
    # 通配符（获取所有可用）
    "all",
]


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

    def _seconds_to_timestamp(self, seconds: float) -> str:
        """Convert float seconds to HH:MM:SS.mmm timestamp."""
        hours = int(seconds // 3600)
        minutes = int((seconds % 3600) // 60)
        secs = int(seconds % 60)
        millis = int((seconds % 1) * 1000)
        return f"{hours:02d}:{minutes:02d}:{secs:02d}.{millis:03d}"

    def _parse_timestamp(self, ts: str) -> float:
        """Parse timestamp string (various formats) to float seconds."""
        ts = ts.strip()
        # VTT/ASS format: HH:MM:SS.mmm or MM:SS.mmm
        m = re.match(r"(?:(\d+):)?(\d{2}):(\d{2})[.,](\d{1,3})", ts)
        if m:
            h = int(m.group(1) or 0)
            mins = int(m.group(2))
            s = int(m.group(3))
            ms = int(m.group(4).ljust(3, '0'))
            return h * 3600 + mins * 60 + s + ms / 1000.0
        return 0.0

    def _parse_srt(self, content: str) -> list:
        """Parse SRT subtitle format (robust)."""
        entries = []
        # Split by double newline or line starting with digit
        blocks = re.split(r'\n(?=\d+\s*\n)', content)
        for block in blocks:
            lines = block.strip().split('\n')
            if len(lines) < 2:
                continue
            # Find timing line
            timing_idx = 0
            for i, line in enumerate(lines):
                if ' --> ' in line:
                    timing_idx = i
                    break
            if timing_idx >= len(lines):
                continue
            timing = lines[timing_idx]
            times = re.split(r'\s*-->+\s*', timing)
            if len(times) != 2:
                continue
            # Get text (everything after timing line)
            text_lines = lines[timing_idx + 1:]
            if not text_lines:
                continue
            text = ' '.join(t.strip() for t in text_lines if t.strip())
            if not text:
                continue
            entries.append({
                "start": times[0].strip().replace(',', '.'),
                "end": times[1].strip().replace(',', '.'),
                "text": text
            })
        return entries

    def _parse_vtt(self, content: str) -> list:
        """Parse WebVTT subtitle format (robust)."""
        entries = []
        # Remove WEBVTT header and metadata
        lines = content.replace('\r\n', '\n').replace('\r', '\n').split('\n')
        i = 0
        # Skip header
        while i < len(lines) and 'WEBVTT' not in lines[i].upper():
            i += 1
        i += 1  # skip WEBVTT line
        while i < len(lines):
            line = lines[i].strip()
            # Skip NOTE, STYLE, REGION blocks
            if line.startswith('NOTE') or line.startswith('STYLE') or line.startswith('REGION'):
                i += 1
                while i < len(lines) and lines[i].strip() and not lines[i].strip().startswith(('NOTE', 'STYLE', 'REGION')):
                    i += 1
                continue
            if ' --> ' in line:
                times = re.split(r'\s*-->+\s*', line)
                if len(times) != 2:
                    i += 1
                    continue
                start = times[0].strip()
                end = times[1].strip().split()[0]  # Remove optional cue settings
                text_lines = []
                i += 1
                while i < len(lines) and lines[i].strip() and ' --> ' not in lines[i]:
                    text_lines.append(lines[i].strip())
                    i += 1
                if text_lines:
                    entries.append({
                        "start": start,
                        "end": end,
                        "text": ' '.join(text_lines)
                    })
                continue
            i += 1
        return entries

    def _parse_ass(self, content: str) -> list:
        """Parse ASS/SSA subtitle format (robust)."""
        entries = []
        # ASS timestamps: H:MM:SS.cc (centiseconds)
        for line in content.split('\n'):
            line = line.strip()
            if line.startswith('Dialogue:'):
                # Format: Dialogue: Layer,Start,End,Style,Name,MarginL,MarginR,MarginV,Effect,Text
                parts = line[9:].split(',', 9)
                if len(parts) < 10:
                    continue
                start = parts[1].strip()
                end = parts[2].strip()
                text = parts[9].strip()
                # Remove ASS style tags {\\...}
                text = re.sub(r'\{[^}]*\}', '', text)
                # Convert ASS line breaks
                text = text.replace('\\N', ' ').replace('\\n', ' ').replace(r'\N', ' ')
                # Remove残留的样式信息
                text = re.sub(r'^\s*[\s\S]*?\s*:\s*', '', text)  # Remove Name: prefix
                text = text.strip()
                if text:
                    entries.append({"start": start, "end": end, "text": text})
        return entries

    def _normalize_timestamp(self, ts: str) -> str:
        """Normalize various timestamp formats to MM:SS or HH:MM:SS."""
        ts = ts.strip()
        # Convert ASS format (H:MM:SS.cc) to standard
        m = re.match(r"(\d+):(\d{2}):(\d{2})[.,](\d{2})", ts)
        if m:
            h, mn, s, cs = int(m.group(1)), int(m.group(2)), int(m.group(3)), int(m.group(4))
            # Centiseconds -> approximate milliseconds
            ms = int(cs * 10)
            total_sec = h * 3600 + mn * 60 + s + ms / 1000.0
            return self._seconds_to_timestamp(total_sec)
        # Already standard
        m2 = re.match(r"(\d+):(\d{2}):(\d{2})[.,](\d{1,3})", ts)
        if m2:
            h, mn, s = int(m2.group(1)), int(m2.group(2)), int(m2.group(3))
            ms = int(m2.group(4).ljust(3, '0'))
            total_sec = h * 3600 + mn * 60 + s + ms / 1000.0
            return self._seconds_to_timestamp(total_sec)
        # MM:SS format
        m3 = re.match(r"(\d+):(\d{2})[.,](\d{1,3})", ts)
        if m3:
            mn, s = int(m3.group(1)), int(m3.group(2))
            ms = int(m3.group(3).ljust(3, '0'))
            total_sec = mn * 60 + s + ms / 1000.0
            return self._seconds_to_timestamp(total_sec)
        return ts

    def _is_meaningful_subtitle(self, entries: list) -> bool:
        """Check if subtitle entries contain meaningful content."""
        if not entries:
            return False
        total_chars = sum(len(e["text"]) for e in entries)
        return total_chars >= 50  # At least 50 characters total

    async def _download_subtitles_for_lang(
        self,
        ydl: yt_dlp.YoutubeDL,
        info: dict,
        lang: str,
        temp_dir: Path
    ) -> Tuple[Optional[Path], str]:
        """Download subtitles for a specific language, return (file_path, format)."""
        video_id = info.get("id", "video")

        # Supported formats to try (in priority order)
        formats = ["srt", "vtt", "ass", "srv1", "srv2", "srv3"]

        for fmt in formats:
            try:
                # Clean up any existing files
                for f in temp_dir.glob(f"{video_id}*"):
                    try:
                        f.unlink()
                    except Exception:
                        pass

                opts = {
                    "quiet": True,
                    "no_warnings": True,
                    "skip_download": True,
                    "writesubtitles": True,
                    "writeautomaticsub": True,
                    "subtitleslangs": [lang],
                    "subtitlesformat": fmt,
                    "outtmpl": str(temp_dir / f"{video_id}.%(ext)s"),
                    "nocheckcertificate": True,
                    "cookiefile": None,
                    "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                }

                # Use a fresh instance to download subtitles for this lang
                with yt_dlp.YoutubeDL(opts) as sub_ydl:
                    sub_ydl.download([info.get("webpage_url", info.get("url"))])

                # Find the downloaded file
                for ext in [f".{fmt}"] + [".srt", ".vtt", ".ass"]:
                    candidates = list(temp_dir.glob(f"{video_id}{ext}"))
                    for f in candidates:
                        if f.stat().st_size > 100:  # At least 100 bytes
                            logger.info(f"Downloaded subtitle for lang='{lang}', format='{fmt}': {f.name} ({f.stat().st_size} bytes)")
                            return f, ext.lstrip('.')
                logger.warning(f"No subtitle file >100 bytes for lang='{lang}', format='{fmt}'")
            except Exception as e:
                logger.warning(f"Failed to download subtitles lang='{lang}', format='{fmt}': {e}")
                continue

        return None, ""

    async def extract_subtitle(self, url: str) -> Tuple[str, list, dict]:
        """Extract subtitle from video URL.

        Strategy:
          1. 列出所有可用字幕（human + auto），按优先级尝试下载
          2. 解析并验证字幕内容有效性
          3. 若无字幕或内容无意义，使用视频描述作为 fallback

        Returns:
            Tuple of (plain_text, timed_entries, video_info)
        """
        logger.info(f"Extracting subtitle from: {url}")

        temp_dir = self.download_dir / "temp_subtitles"
        temp_dir.mkdir(parents=True, exist_ok=True)

        try:
            # 抖音视频使用专用下载器获取信息
            if douyin_downloader.is_douyin_url(url):
                logger.info("Using Douyin-specific downloader for subtitle extraction")
                try:
                    douyin_info = await douyin_downloader.get_video_info(url)
                    video_info = {
                        "title": douyin_info.title,
                        "duration": douyin_info.duration or 0,
                        "uploader": douyin_info.uploader or "",
                        "thumbnail": douyin_info.thumbnail or "",
                        "description": douyin_info.description or "",
                    }
                    
                    # 抖音视频通常没有字幕，使用描述作为 fallback
                    desc = (douyin_info.description or "").strip()
                    if desc and len(desc) > 10:
                        # 清理描述中的话题标签
                        import re
                        desc = re.sub(r'#\S+#', '', desc).strip()
                        desc = re.sub(r'\s+', ' ', desc)
                        if desc:
                            entries = [{
                                "start": "00:00",
                                "end": self._format_time(douyin_info.duration) if douyin_info.duration else "00:00",
                                "text": desc[:5000]
                            }]
                            logger.info(f"Douyin: using description as subtitle ({len(desc)} chars)")
                            return desc[:5000], entries, video_info
                    
                    # 无有效描述，返回空
                    logger.info("Douyin: no meaningful description, returning empty")
                    return "", [], video_info
                except Exception as e:
                    logger.warning(f"Douyin downloader failed: {e}, falling back to yt-dlp")

            def _extract_info():
                """Get video metadata including available subtitle tracks."""
                opts = {
                    "quiet": True,
                    "no_warnings": True,
                    "extract_flat": False,
                    "nocheckcertificate": True,
                    "cookiefile": None,
                    "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                }
                with yt_dlp.YoutubeDL(opts) as ydl:
                    info = ydl.extract_info(url, download=False)
                    return info

            loop = asyncio.get_event_loop()
            info = await loop.run_in_executor(None, _extract_info)

            # Build video info
            video_info: Dict[str, Any] = {
                "title": info.get("title", "Unknown"),
                "duration": int(info.get("duration") or 0),
                "uploader": info.get("uploader") or info.get("uploader_name") or "",
                "thumbnail": info.get("thumbnail") or "",
                "description": info.get("description") or "",
            }

            # Collect all available subtitle languages (both human and auto)
            subtitles: Dict[str, Any] = info.get("subtitles", {}) or {}
            auto_subs: Dict[str, Any] = info.get("automatic_captions", {}) or {}

            # Filter out non-subtitle types (like danmaku)
            NON_SUBTITLE_TYPES = {"danmaku", "comments", "bullet_comments"}
            
            all_sub_langs = list(subtitles.keys()) + list(auto_subs.keys())
            # Filter out danmaku and other non-subtitle types
            all_sub_langs = [lang for lang in all_sub_langs if lang.lower() not in NON_SUBTITLE_TYPES]
            logger.info(f"Available subtitle languages (filtered): {all_sub_langs}")

            # Priority order: prefer human subtitles, then auto
            # Human subs first
            priority_langs: List[str] = []
            for lang in ["zh-Hans", "zh-Hant", "zh-CN", "zh-TW", "zh-HK", "zh", "chi"]:
                if lang in subtitles:
                    priority_langs.append(lang)
            # Auto subs as fallback
            for lang in ["zh-Hans", "zh-Hant", "zh-CN", "zh-TW", "zh-HK", "zh", "ai-zh"]:
                if lang in auto_subs and lang not in priority_langs:
                    priority_langs.append(lang)
            # Add remaining human subs
            for lang in subtitles:
                if lang not in priority_langs:
                    priority_langs.append(lang)
            # Add remaining auto subs
            for lang in auto_subs:
                if lang not in priority_langs:
                    priority_langs.append(lang)

            if not priority_langs:
                logger.warning(f"No subtitles available for {url}, falling back to description")
                return self._fallback_to_description(info, video_info)

            # Try to download subtitles for each language in priority order
            for lang in priority_langs:
                logger.info(f"Trying subtitle language: '{lang}'")
                sub_file, sub_fmt = await self._download_subtitles_for_lang(
                    yt_dlp.YoutubeDL({}), info, lang, temp_dir
                )

                if sub_file and sub_file.exists():
                    content = sub_file.read_text(encoding="utf-8", errors="replace")
                    if sub_file.suffix in [".ass", ".ssa"]:
                        entries = self._parse_ass(content)
                    elif sub_file.suffix == ".vtt":
                        entries = self._parse_vtt(content)
                    elif sub_file.suffix == ".srt":
                        entries = self._parse_srt(content)
                    else:
                        # Try all parsers
                        entries = self._parse_srt(content)
                        if not entries:
                            entries = self._parse_vtt(content)
                        if not entries:
                            entries = self._parse_ass(content)

                    # Normalize timestamps
                    for e in entries:
                        e["start"] = self._normalize_timestamp(e["start"])
                        e["end"] = self._normalize_timestamp(e["end"])

                    if self._is_meaningful_subtitle(entries):
                        plain_text = "\n".join(e["text"] for e in entries)
                        logger.info(f"Successfully extracted {len(entries)} entries for lang='{lang}', chars={len(plain_text)}")
                        return plain_text, entries, video_info
                    else:
                        logger.warning(f"Subtitle for lang='{lang}' has insufficient content, trying next...")
                        # Try to re-parse with different approach
                        try:
                            sub_file.unlink()
                        except Exception:
                            pass

            # All subtitle attempts failed or insufficient content
            logger.warning(f"No meaningful subtitles found for {url}, falling back to description")
            return self._fallback_to_description(info, video_info)

        except Exception as e:
            logger.error(f"Failed to extract subtitle: {e}", exc_info=True)
            raise
        finally:
            # Clean up temp files
            try:
                for f in temp_dir.glob("*"):
                    try:
                        f.unlink()
                    except Exception:
                        pass
            except Exception:
                pass

    def _fallback_to_description(
        self, info: dict, video_info: dict
    ) -> Tuple[str, list, dict]:
        """Use video description as fallback text source.
        
        Returns empty content if no meaningful description, so caller can handle appropriately.
        """
        description = (info.get("description") or "").strip()
        title = info.get("title", "")
        duration = video_info.get("duration", 0)

        # Check if description is meaningful (not just "-" or very short)
        if description and len(description) > 10 and description != "-":
            # Clean up description: collapse whitespace
            description = re.sub(r'\s+', ' ', description)
            description = re.sub(r'\n+', '\n', description).strip()
            entries = [{
                "start": "00:00",
                "end": self._format_time(duration) if duration else "00:00",
                "text": description[:5000]
            }]
            plain_text = description[:5000]
            logger.info(f"Using description fallback, {len(plain_text)} chars")
        else:
            # Return empty to indicate no subtitle
            plain_text = ""
            entries = []
            logger.info("No subtitle and no meaningful description, returning empty")

        return plain_text, entries, video_info


# Global instance
subtitle_extractor = SubtitleExtractor()
