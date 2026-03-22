"""抖音无水印下载模块

基于 rathodpratham-dev/douyin_video_downloader 开源实现
MIT 协议，2026年2月创建

核心原理：
1. 通过分享链接302重定向提取video_id
2. 调用公开API获取无水印播放地址
3. 把URL中的playwm (watermark)替换成play即可获取无水印视频
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
    VideoInfo,
)

logger = logging.getLogger(__name__)


class DouyinProgress:
    """抖音下载进度追踪"""
    
    def __init__(self) -> None:
        self.progress: float = 0.0
        self.speed: Optional[str] = None
        self.eta: Optional[str] = None
    
    def update(self, progress: float) -> None:
        """更新进度"""
        self.progress = progress


class DouyinDownloader:
    """抖音无水印下载器"""
    
    # 抖音域名列表
    DOUYIN_DOMAINS = [
        'douyin.com',
        'v.douyin.com',
        'www.douyin.com',
        'iesdouyin.com',
        'ixigua.com',
    ]
    
    def __init__(self) -> None:
        self.client = httpx.AsyncClient(
            follow_redirects=True,
            timeout=30.0,
            headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like  Gecko) Chrome/120.0.0.0 Safari/537.36",
            }
        )
    
    def is_douyin_url(self, url: str) -> bool:
        """判断是否为抖音链接"""
        try:
            parsed = urlparse(url)
            return any(domain in parsed.netloc.lower() for domain in self.DOUYIN_DOMAINS)
        except Exception:
            return False
    
    async def extract_video_id(self, url: str) -> Optional[str]:
        """从抖音链接提取video_id
        
        通过分享链接302重定向获取真实video_id
        """
        try:
            # 获取重定向后的URL
            response = await self.client.head(url)
            final_url = str(response.url)
            
            # 从URL中提取video_id
            # 常见格式：/video/xxxxx 或 /share/video/xxxxx
            patterns = [
                r'/video/(\d+)',
                r'/share/video/(\d+)',
                r'video_id=(\d+)',
            ]
            
            for pattern in patterns:
                match = re.search(pattern, final_url)
                if match:
                    return match.group(1)
            
            logger.warning(f"无法从URL提取video_id: {final_url}")
            return None
            
        except Exception as e:
            logger.error(f"提取video_id失败: {e}")
            return None
    
    async def get_video_info_api(self, video_id: str) -> Optional[dict]:
        """调用抖音公开API获取视频信息"""
        try:
            # 抖音公开API
            api_url = f"https://www.iesdouyin.com/web/api/v2/web/aweme/detail?aweme_id={video_id}"
            
            response = await self.client.get(api_url)
            response.raise_for_status()
            
            data = response.json()
            
            if data.get('status_code') != 0:
                logger.error(f"抖音API返回错误: {data}")
                return None
            
            aweme_detail = data.get('aweme_detail', {})
            return aweme_detail
            
        except Exception as e:
            logger.error(f"调用抖音API失败: {e}")
            return None
    
    async def get_video_info(self, url: str) -> VideoDetail:
        """获取抖音视频信息（不下载）"""
        video_id = await self.extract_video_id(url)
        if not video_id:
            raise ValueError("无法提取抖音视频ID")
        
        aweme_detail = await self.get_video_info_api(video_id)
        if not aweme_detail:
            raise ValueError("无法获取抖音视频信息")
        
        # 解析视频信息
        video_info = aweme_detail.get('video', {})
        desc = aweme_detail.get('desc', '')
        author = aweme_detail.get('author', {})
        
        # 获取无水印播放地址
        play_addr = video_info.get('play_addr', {})
        url_list = play_addr.get('url_list', [])
        
        # 选择最高清晰度
        video_url = None
        if url_list:
            # 优先选择第一个（通常是最清晰的）
            video_url = url_list[0].get('url', '')
        
        if not video_url:
            raise ValueError("无法获取抖音视频播放地址")
        
        # 获取封面图
        cover = video_info.get('cover', {}).get('url_list', [])
        thumbnail = cover[0].get('url', '') if cover else ''
        
        # 获取时长
        duration = video_info.get('duration', 0) // 1000  # 毫秒转秒
        
        return VideoDetail(
            title=desc[:100] if desc else '抖音视频',
            duration=duration,
            thumbnail=thumbnail,
            uploader=author.get('nickname', ''),
            description=desc,
            formats=[],  # 抖音只有一种格式
        )
    
    async def download_video(
        self,
        url: str,
        output_path: Path,
        progress: DouyinProgress,
        status_callback: Optional[Callable[[DownloadItemStatus], None]] = None,
    ) -> DownloadItemStatus:
        """下载抖音视频"""
        status = DownloadItemStatus(url=url)
        
        try:
            # 获取视频信息
            info = await self.get_video_info(url)
            status.title = info.title
            
            # 提取video_id
            video_id = await self.extract_video_id(url)
            if not video_id:
                raise ValueError("无法提取抖音视频ID")
            
            # 调用API获取视频信息
            aweme_detail = await self.get_video_info_api(video_id)
            if not aweme_detail:
                raise ValueError("无法获取抖音视频信息")
            
            # 获取播放地址
            video_info = aweme_detail.get('video', {})
            play_addr = video_info.get('play_addr', {})
            url_list = play_addr.get('url_list', [])
            
            if not url_list:
                raise ValueError("无法获取抖音视频播放地址")
            
            video_url = url_list[0].get('url', '')
            
            # 下载视频
            status.status = DownloadStatus.DOWNLOADING
            if status_callback:
                status_callback(status)
            
            async with self.client.stream('GET', video_url) as response:
                response.raise_for_status()
                
                total_size = int(response.headers.get('content-length', 0))
                downloaded = 0
                
                # 确定文件名
                filename = f"douyin_{video_id}.mp4"
                file_path = output_path / filename
                
                with open(file_path, 'wb') as f:
                    async for chunk in response.aiter_bytes():
                        f.write(chunk)
                        downloaded += len(chunk)
                        
                        # 更新进度
                        if total_size > 0:
                            progress.update((downloaded / total_size) * 100)
                            
                            # 更新状态
                            status.progress = progress.progress
                            if status_callback:
                                status_callback(status)
            
            status.filename = filename
            status.status = DownloadStatus.COMPLETED
            status.progress = 100.0
            
            if status_callback:
                status_callback(status)
            
        except Exception as e:
            logger.error(f"抖音下载失败: {e}")
            status.status = DownloadStatus.FAILED
            status.error = str(e)
            
            if status_callback:
                status_callback(status)
        
        return status
    
    async def close(self) -> None:
        """关闭客户端"""
        await self.client.aclose()


# 全局抖音下载器实例
douyin_downloader = DouyinDownloader()
