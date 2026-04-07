"""抖音无水印下载模块 v10

基于 rathodpratham-dev/douyin_video_downloader 开源实现 (MIT, 2026-02)
核心原理：
1. 通过分享链接302重定向提取video_id
2. 优先调用API，失败时从分享页面提取数据
3. 替换 playwm 为 play 获取无水印视频
"""

import asyncio
import base64
import json
import logging
import re
from hashlib import sha256
from pathlib import Path
from typing import Awaitable, Callable, Optional
from urllib.parse import parse_qs, urlparse

import httpx

from app.models.schemas import (
    DownloadItemStatus,
    DownloadStatus,
    VideoDetail,
)

logger = logging.getLogger(__name__)

DEFAULT_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/122.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/json,*/*",
    "Accept-Language": "en-US,en;q=0.9",
    "Connection": "keep-alive",
    "Referer": "https://www.douyin.com/",
}

MOBILE_SHARE_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) "
        "AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 "
        "Mobile/15E148 Safari/604.1"
    ),
    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
    "Referer": "https://www.douyin.com/",
}


class DouyinDownloader:
    """抖音无水印下载器 v10 - 完整实现"""
    
    API_URL = "https://www.iesdouyin.com/web/api/v2/aweme/iteminfo/"
    DOUYIN_DOMAINS = ['douyin.com', 'v.douyin.com', 'www.douyin.com', 'iesdouyin.com']
    
    def __init__(self):
        self.client = httpx.AsyncClient(
            follow_redirects=True,
            timeout=60.0,
            headers=DEFAULT_HEADERS,
            cookies={}
        )
    
    def is_douyin_url(self, url: str) -> bool:
        try:
            parsed = urlparse(url)
            return any(domain in parsed.netloc.lower() for domain in self.DOUYIN_DOMAINS)
        except Exception:
            return False
    
    async def get_video_info(self, url: str) -> VideoDetail:
        """获取抖音视频信息"""
        
        # 步骤1: 解析分享链接获取最终URL
        resolved_url = await self._resolve_share_url(url)
        
        # 步骤2: 提取video_id
        video_id = self._extract_video_id(resolved_url)
        if not video_id:
            raise ValueError(f"无法提取视频ID: {resolved_url}")
        
        logger.info(f"抖音视频ID: {video_id}")
        
        # 步骤3: 尝试API，失败则从页面提取
        item_info = await self._fetch_item_info(video_id, resolved_url)
        
        # 步骤4: 解析返回数据
        return self._parse_item_info(item_info, video_id)
    
    async def _resolve_share_url(self, url: str) -> str:
        """解析分享链接"""
        try:
            response = await self.client.get(url, follow_redirects=True)
            return str(response.url)
        except Exception as e:
            logger.error(f"解析分享链接失败: {e}")
            raise
    
    def _extract_video_id(self, url: str) -> Optional[str]:
        """从URL提取video_id"""
        parsed = urlparse(url)
        query = parse_qs(parsed.query)
        
        for key in ("modal_id", "item_ids", "group_id", "aweme_id"):
            values = query.get(key)
            if values:
                match = re.search(r"(\d{8,24})", values[0])
                if match:
                    return match.group(1)
        
        for pattern in (r"/video/(\d{8,24})", r"/note/(\d{8,24})", r"/(\d{8,24})(?:/|$)"):
            match = re.search(pattern, parsed.path)
            if match:
                return match.group(1)
        
        fallback = re.search(r"(?<!\d)(\d{8,24})(?!\d)", url)
        if fallback:
            return fallback.group(1)
        
        return None
    
    async def _fetch_item_info(self, video_id: str, resolved_url: str) -> dict:
        """获取视频信息 - 先尝试API，失败则从页面提取"""
        
        # 尝试API
        params = {"item_ids": video_id}
        
        for attempt in range(3):
            try:
                response = await self.client.get(
                    self.API_URL,
                    params=params,
                    timeout=30.0
                )
                
                if response.status_code == 200 and response.content:
                    data = response.json()
                    
                    if data.get("status_code") in (0, None):
                        item_list = data.get("item_list") or []
                        if item_list:
                            logger.info(f"API成功获取视频信息")
                            return item_list[0]
                        
            except Exception as e:
                logger.debug(f"API请求失败: {e}")
            
            await asyncio.sleep(1)
        
        # API失败，从分享页面提取
        logger.warning("API失败，尝试从分享页面提取...")
        return await self._fetch_from_share_page(video_id, resolved_url)
    
    async def _fetch_from_share_page(self, video_id: str, resolved_url: str) -> dict:
        """从分享页面提取视频信息"""
        
        # 构建分享页面URL
        share_url = f"https://www.iesdouyin.com/share/video/{video_id}/"
        
        try:
            # 使用移动端headers
            response = await self.client.get(
                share_url,
                headers=MOBILE_SHARE_HEADERS,
                timeout=30.0
            )
            
            html = response.text or ""
            
            # 检查WAF挑战
            if self._is_waf_challenge(html):
                logger.info("检测到WAF挑战，尝试解决...")
                solved = await self._solve_waf_challenge(html, share_url)
                if solved:
                    response = await self.client.get(
                        share_url,
                        headers=MOBILE_SHARE_HEADERS,
                        timeout=30.0
                    )
                    html = response.text or ""
            
            # 提取_ROUTER_DATA
            router_data = self._extract_router_data(html)
            
            if router_data:
                item_info = self._parse_router_data(router_data)
                if item_info:
                    logger.info("从分享页面成功提取视频信息")
                    return item_info
            
        except Exception as e:
            logger.error(f"从分享页面提取失败: {e}")
        
        raise ValueError("无法获取抖音视频信息")
    
    def _is_waf_challenge(self, html: str) -> bool:
        """检查是否是WAF挑战页面"""
        return "Please wait..." in html and "wci=" in html and "cs=" in html
    
    async def _solve_waf_challenge(self, html: str, page_url: str) -> bool:
        """解决WAF挑战"""
        try:
            match = re.search(r'wci="([^"]+)"\s*,\s*cs="([^"]+)"', html)
            if not match:
                return False
            
            cookie_name, challenge_blob = match.groups()
            
            # 解码挑战数据
            challenge_data = json.loads(self._decode_urlsafe_b64(challenge_blob).decode("utf-8"))
            prefix = self._decode_urlsafe_b64(challenge_data["v"]["a"])
            expected_digest = self._decode_urlsafe_b64(challenge_data["v"]["c"]).hex()
            
            # 暴力破解（最多100万次）
            for candidate in range(1_000_001):
                digest = sha256(prefix + str(candidate).encode("utf-8")).hexdigest()
                if digest == expected_digest:
                    # 找到答案，设置cookie
                    challenge_data["d"] = base64.b64encode(str(candidate).encode("utf-8")).decode("utf-8")
                    cookie_value = base64.b64encode(
                        json.dumps(challenge_data, separators=(",", ":")).encode("utf-8")
                    ).decode("utf-8")
                    
                    domain = urlparse(page_url).hostname or "www.iesdouyin.com"
                    self.client.cookies.set(cookie_name, cookie_value, domain=domain)
                    
                    logger.info(f"WAF挑战解决成功")
                    return True
            
            return False
            
        except Exception as e:
            logger.error(f"WAF挑战解决失败: {e}")
            return False
    
    @staticmethod
    def _decode_urlsafe_b64(value: str) -> bytes:
        """URL安全的Base64解码"""
        normalized = value.replace("-", "+").replace("_", "/")
        normalized += "=" * (-len(normalized) % 4)
        return base64.b64decode(normalized)
    
    def _extract_router_data(self, html: str) -> dict:
        """从HTML中提取_ROUTER_DATA JSON"""
        marker = "window._ROUTER_DATA = "
        start = html.find(marker)
        if start < 0:
            return {}
        
        index = start + len(marker)
        while index < len(html) and html[index].isspace():
            index += 1
        
        if index >= len(html) or html[index] != "{":
            return {}
        
        # 解析JSON
        depth = 0
        in_string = False
        escaped = False
        
        for cursor in range(index, len(html)):
            char = html[cursor]
            
            if in_string:
                if escaped:
                    escaped = False
                elif char == "\\":
                    escaped = True
                elif char == '"':
                    in_string = False
                continue
            
            if char == '"':
                in_string = True
            elif char == "{":
                depth += 1
            elif char == "}":
                depth -= 1
                if depth == 0:
                    payload = html[index:cursor + 1]
                    try:
                        return json.loads(payload)
                    except ValueError:
                        return {}
        
        return {}
    
    @staticmethod
    def _parse_router_data(router_data: dict) -> dict:
        """从_ROUTER_DATA中提取视频信息"""
        loader_data = router_data.get("loaderData", {})
        if not isinstance(loader_data, dict):
            return {}
        
        for node in loader_data.values():
            if not isinstance(node, dict):
                continue
            video_info_res = node.get("videoInfoRes", {})
            if not isinstance(video_info_res, dict):
                continue
            item_list = video_info_res.get("item_list", [])
            if item_list and isinstance(item_list[0], dict):
                return item_list[0]
        
        return {}
    
    def _parse_item_info(self, item_info: dict, video_id: str) -> VideoDetail:
        """解析视频信息"""
        
        title = item_info.get("desc", "") or f"抖音视频{video_id}"
        
        author = item_info.get("author", {})
        uploader = author.get("nickname", "") if isinstance(author, dict) else ""
        
        video = item_info.get("video", {})
        
        # 封面图
        thumbnail = ""
        for key in ["origin_cover", "cover", "dynamic_cover"]:
            cover = video.get(key, {})
            if isinstance(cover, dict):
                url_list = cover.get("url_list", [])
                if url_list:
                    thumbnail = url_list[0] if isinstance(url_list[0], str) else url_list[0].get("url", "")
                    if thumbnail:
                        break
        
        duration_ms = video.get("duration", 0)
        duration = int(duration_ms // 1000) if duration_ms else 0
        
        return VideoDetail(
            title=title[:200] if title else f"抖音视频{video_id}",
            duration=duration,
            thumbnail=thumbnail,
            uploader=uploader,
            description=title,
            formats=[{"format_id": "best", "ext": "mp4", "resolution": "原画"}],
        )
    
    async def download_video(self, url: str, output_path: Path, progress, status_callback: Optional[Callable[["DownloadItemStatus"], Awaitable[None]]] = None) -> "DownloadItemStatus":
        """下载抖音视频"""
        status = DownloadItemStatus(url=url)
        
        try:
            resolved_url = await self._resolve_share_url(url)
            video_id = self._extract_video_id(resolved_url)
            
            if not video_id:
                raise ValueError("无法提取视频ID")
            
            info = await self.get_video_info(url)
            status.title = info.title
            
            status.status = DownloadStatus.DOWNLOADING
            if status_callback:
                await status_callback(status)
            
            # 获取无水印URL
            item_info = await self._fetch_item_info(video_id, resolved_url)
            video = item_info.get("video", {})
            play_addr = video.get("play_addr", {})
            url_list = play_addr.get("url_list", [])
            
            if not url_list:
                raise ValueError("无法获取视频下载地址")
            
            play_url = url_list[0]
            if isinstance(play_url, dict):
                play_url = play_url.get("url", "")
            
            # 替换为无水印
            if "playwm" in play_url:
                play_url = play_url.replace("playwm", "play")
            
            logger.info(f"开始下载: {play_url[:60]}...")
            
            filename = f"douyin_{video_id}.mp4"
            file_path = os.path.join(str(output_path), filename)
            
            async with self.client.stream('GET', play_url) as response:
                response.raise_for_status()
                
                total_size = int(response.headers.get("content-length", 0) or 0)
                downloaded = 0
                
                with open(file_path, "wb") as f:
                    async for chunk in response.aiter_bytes(chunk_size=65536):
                        f.write(chunk)
                        downloaded += len(chunk)
                        
                        if total_size > 0:
                            pct = min((downloaded / total_size) * 100, 100)
                            # 使用 yt-dlp 风格的 progress 字典
                            progress.update({
                                "status": "downloading",
                                "downloaded_bytes": downloaded,
                                "total_bytes": total_size,
                            })
                            status.progress = pct
                            if status_callback:
                                await status_callback(status)
            
            status.filename = filename
            status.status = DownloadStatus.COMPLETED
            status.progress = 100.0
            
            logger.info(f"下载完成: {filename}")
            
            if status_callback:
                await status_callback(status)
                
        except Exception as e:
            logger.error(f"抖音下载失败: {e}")
            status.status = DownloadStatus.FAILED
            status.error = str(e)
            
            if status_callback:
                await status_callback(status)
        
        return status
    
    async def close(self):
        await self.client.aclose()


douyin_downloader = DouyinDownloader()