"""抖音无水印下载模块 v7

基于用户提供的解决方案：
1. 通过分享链接 302 重定向提取 video_id  
2. 从抖音页面直接提取视频信息（绕过 API 限制）
3. 替换 playwm 为 play 获取无水印视频
"""

import asyncio
import logging
import re
from pathlib import Path
from typing import Callable, Optional
from urllib.parse import urlparse

import httpx

from app.models.schemas import (
    DownloadItemStatus,
    DownloadStatus,
    VideoDetail,
)

logger = logging.getLogger(__name__)


class DouyinDownloader:
    """抖音无水印下载器 v7"""
    
    DOUYIN_DOMAINS = ['douyin.com', 'v.douyin.com', 'www.douyin.com', 'iesdouyin.com']
    
    def __init__(self):
        self.client = httpx.AsyncClient(
            follow_redirects=True,
            timeout=60.0,
            headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
                "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
            }
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
        
        video_id = self._extract_video_id(final_url)
        if not video_id:
            raise ValueError(f"无法从 URL 提取视频 ID: {final_url}")
        
        logger.info(f"抖音视频 ID: {video_id}")
        
        # 从页面提取视频信息
        video_info = await self._extract_from_page(final_url)
        if video_info:
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
    
    async def _extract_from_page(self, url: str) -> Optional[VideoDetail]:
        """从页面提取视频信息"""
        try:
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                "Referer": "https://www.douyin.com/",
            }
            
            resp = await self.client.get(url, headers=headers)
            content = resp.text
            
            # 提取标题
            title = ""
            patterns = [r'"desc":\s*"([^"]*)"', r'"title":\s*"([^"]*)"', r'<title>([^<]+)</title>']
            for pattern in patterns:
                match = re.search(pattern, content)
                if match:
                    title = match.group(1).replace('\\u0026', '&').replace('\\n', ' ').strip()
                    if title and len(title) > 3:
                        break
            
            # 提取 UP 主
            uploader = ""
            match = re.search(r'"nickname":\s*"([^"]*)"', content)
            if match:
                uploader = match.group(1)
            
            # 提取封面
            thumbnail = ""
            match = re.search(r'"cover":\s*"([^"]*)"', content)
            if match:
                thumbnail = match.group(1).replace('\\/', '/')
            
            # 如果没有找到封面，尝试其他模式
            if not thumbnail:
                match = re.search(r'"origin_cover":\s*\{[^}]*"url_list":\s*\[([^\]]*)\]', content)
                if match:
                    url_match = re.search(r'"url":\s*"([^"]*)"', match.group(1))
                    if url_match:
                        thumbnail = url_match.group(1).replace('\\/', '/')
            
            if title or thumbnail or uploader:
                return VideoDetail(
                    title=title[:100] if title else "抖音视频",
                    duration=0,
                    thumbnail=thumbnail,
                    uploader=uploader,
                    description=title,
                    formats=[],
                )
            
            return None
            
        except Exception as e:
            logger.error(f"从页面提取失败：{e}")
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
            
            # 获取无水印视频下载地址
            video_url = await self._get_download_url(url, video_id)
            
            if not video_url:
                raise ValueError("无法获取视频下载地址")
            
            logger.info(f"抖音视频下载地址：{video_url[:100]}...")
            
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
            
            logger.info(f"抖音视频下载完成：{filename}")
            
            if status_callback:
                status_callback(status)
                
        except Exception as e:
            logger.error(f"抖音下载失败：{e}")
            status.status = DownloadStatus.FAILED
            status.error = str(e)
            
            if status_callback:
                status_callback(status)
        
        return status
    
    async def _get_download_url(self, url: str, video_id: str) -> Optional[str]:
        """获取无水印视频下载地址"""
        try:
            # 访问视频页面
            response = await self.client.head(url, follow_redirects=True)
            final_url = str(response.url)
            
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                "Referer": "https://www.douyin.com/",
            }
            
            resp = await self.client.get(final_url, headers=headers)
            content = resp.text
            
            # 查找视频 URL - 尝试多种模式
            patterns = [
                r'"play_addr":\s*\{[^}]*"url_list":\s*\[([^\]]*)\]',
                r'"play":\s*"([^"]+)"',
                r'(https?://[^\s"<>]*\.mp4[^\s"<>]*)',
            ]
            
            for pattern in patterns:
                matches = re.findall(pattern, content)
                for match in matches:
                    if isinstance(match, tuple):
                        match = match[0]
                    
                    # 提取 URL
                    url_match = re.search(r'"url":\s*"([^"]+)"', match) if '"' in match else None
                    video_url = url_match.group(1) if url_match else match
                    
                    video_url = video_url.replace('\\/', '/')
                    
                    # 替换 playwm 为 play 获取无水印
                    if 'playwm' in video_url:
                        video_url = video_url.replace('playwm', 'play')
                    
                    # 验证 URL
                    if video_url.startswith('http') and '.mp4' in video_url:
                        return video_url
            
            return None
            
        except Exception as e:
            logger.error(f"获取下载地址失败：{e}")
            return None
    
    async def close(self):
        await self.client.aclose()


douyin_downloader = DouyinDownloader()