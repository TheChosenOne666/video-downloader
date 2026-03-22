"""抖音无水印下载模块 v5

整合多种解析策略
"""

import asyncio
import logging
import re
from pathlib import Path
from typing import Callable, Optional
from urllib.parse import urlparse, quote

import httpx

from app.models.schemas import (
    DownloadItemStatus,
    DownloadStatus,
    VideoDetail,
)

logger = logging.getLogger(__name__)


class DouyinDownloader:
    """抖音无水印下载器 v5"""
    
    DOUYIN_DOMAINS = ['douyin.com', 'v.douyin.com', 'www.douyin.com', 'iesdouyin.com']
    
    def __init__(self):
        self.client = httpx.AsyncClient(
            follow_redirects=True,
            timeout=60.0,
            headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
        )
    
    def is_douyin_url(self, url: str) -> bool:
        try:
            parsed = urlparse(url)
            return any(domain in parsed.netloc.lower() for domain in self.DOUYIN_DOMAINS)
        except Exception:
            return False
    
    async def get_video_info(self, url: str) -> VideoDetail:
        """获取抖音视频信息"""
        
        # 获取重定向后的 URL
        response = await self.client.head(url, follow_redirects=True)
        final_url = str(response.url)
        
        # 提取 video_id
        video_id = self._extract_video_id(final_url)
        if not video_id:
            raise ValueError(f"无法从 URL 提取视频 ID: {final_url}")
        
        # 方法 1：尝试公开的抖音解析 API
        video_info = await self._parse_via_api(url, video_id)
        if video_info and video_info.thumbnail:
            return video_info
        
        # 兜底
        return VideoDetail(
            title=f"抖音视频 {video_id}",
            duration=0,
            thumbnail="",
            uploader="",
            description="",
            formats=[],
        )
    
    def _extract_video_id(self, url: str) -> Optional[str]:
        patterns = [r'/video/(\d+)', r'/share/video/(\d+)', r'video_id=(\d+)']
        for pattern in patterns:
            match = re.search(pattern, url)
            if match:
                return match.group(1)
        return None
    
    async def _parse_via_api(self, url: str, video_id: str) -> Optional[VideoDetail]:
        """尝试使用公开 API 解析"""
        
        # 多个备用 API
        apis = [
            f"https://api.vctool.cn/tool/dy?url={quote(url)}",
            f"https://www.linilib.com/api/dy?url={quote(url)}",
        ]
        
        for api_url in apis:
            try:
                headers = {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                    "Accept": "application/json",
                }
                
                resp = await self.client.get(api_url, headers=headers, timeout=15.0)
                
                if resp.status_code == 200:
                    data = resp.json()
                    
                    # 不同 API 的响应格式不同，尝试多种字段名
                    title = ""
                    cover = ""
                    author = ""
                    play_url = ""
                    description = ""
                    
                    # 常见字段名映射
                    if isinstance(data, dict):
                        # 顶层字段
                        title = data.get('title') or data.get('desc') or data.get('desc', '')
                        cover = data.get('cover') or data.get('cover_url') or data.get('image_list', [{}])[0].get('url_prefix', '') if isinstance(data.get('image_list'), list) else ''
                        author = data.get('author') or data.get('nickname') or ''
                        play_url = data.get('play_url') or data.get('nwm_video_url') or data.get('video_url') or ''
                        description = data.get('desc') or data.get('description') or title
                        
                        # 嵌套字段
                        if 'data' in data and isinstance(data['data'], dict):
                            d = data['data']
                            if not title:
                                title = d.get('title') or d.get('desc') or d.get('desc_text', '')
                            if not cover:
                                cover = d.get('cover') or d.get('cover_url')
                            if not author:
                                author = d.get('author') or d.get('nickname') or d.get('name', '')
                            if not play_url:
                                play_url = d.get('play_url') or d.get('nwm_video_url') or d.get('download_url')
                            if not description:
                                description = d.get('desc') or title
                        
                        # 如果有数据，返回
                        if title or cover or author or play_url:
                            return VideoDetail(
                                title=title[:100] if title else f"抖音视频{video_id}",
                                duration=0,
                                thumbnail=cover.replace('\\/', '/') if cover else "",
                                uploader=author,
                                description=description[:200] if description else "",
                                formats=[{"format_id": "best", "ext": "mp4", "resolution": "原画"}],
                            )
                    
            except Exception as e:
                logger.info(f"API {api_url} 解析失败：{e}")
                continue
        
        return None
    
    async def download_video(self, url: str, output_path: Path, progress, status_callback: Optional[Callable] = None) -> DownloadItemStatus:
        """下载抖音视频"""
        status = DownloadItemStatus(url=url)
        
        try:
            response = await self.client.head(url, follow_redirects=True)
            final_url = str(response.url)
            video_id = self._extract_video_id(final_url)
            
            if not video_id:
                raise ValueError("无法提取抖音视频 ID")
            
            info = await self.get_video_info(url)
            status.title = info.title
            
            status.status = DownloadStatus.DOWNLOADING
            if status_callback:
                status_callback(status)
            
            # 获取下载地址
            video_url = await self._get_download_url(url)
            
            if not video_url:
                raise ValueError("无法获取视频下载地址")
            
            filename = f"douyin_{video_id}.mp4"
            file_path = output_path / filename
            
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                "Referer": "https://www.douyin.com/",
            }
            
            async with self.client.stream('GET', video_url, headers=headers) as response:
                response.raise_for_status()
                
                total_size = int(response.headers.get('content-length', 0) or 0)
                downloaded = 0
                
                with open(file_path, 'wb') as f:
                    async for chunk in response.aiter_bytes(chunk_size=8192):
                        f.write(chunk)
                        downloaded += len(chunk)
                        
                        if total_size > 0:
                            pct = min((downloaded / total_size) * 100, 100)
                            progress.update(pct)
                            status.progress = pct
                            if status_callback:
                                status_callback(status)
            
            status.filename = filename
            status.status = DownloadStatus.COMPLETED
            status.progress = 100.0
            
            if status_callback:
                status_callback(status)
                
        except Exception as e:
            logger.error(f"抖音下载失败：{e}")
            status.status = DownloadStatus.FAILED
            status.error = str(e)
            
            if status_callback:
                status_callback(status)
        
        return status
    
    async def _get_download_url(self, url: str) -> Optional[str]:
        """获取无水印视频下载地址"""
        
        apis = [
            f"https://api.vctool.cn/tool/dy?url={quote(url)}",
            f"https://www.linilib.com/api/dy?url={quote(url)}",
        ]
        
        for api_url in apis:
            try:
                headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36", "Accept": "application/json"}
                resp = await self.client.get(api_url, headers=headers, timeout=15.0)
                
                if resp.status_code == 200:
                    data = resp.json()
                    
                    if isinstance(data, dict):
                        play_url = (
                            data.get('play_url') or data.get('nwm_video_url') or data.get('video_url') or
                            data.get('data', {}).get('play_url') or data.get('data', {}).get('nwm_video_url') or
                            data.get('data', {}).get('download_url')
                        )
                        
                        if play_url:
                            return play_url if not play_url.startswith('//') else 'https:' + play_url
                    
            except Exception as e:
                logger.info(f"获取下载地址失败：{e}")
                continue
        
        return None
    
    async def close(self):
        await self.client.aclose()


douyin_downloader = DouyinDownloader()