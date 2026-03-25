"""
配置 yt-dlp 使用 ffmpeg 的替代方案
"""

import os
import sys
from pathlib import Path

# 方案1: 使用 imageio-ffmpeg (Python 包)
# 这个包会自动下载 ffmpeg 二进制

def setup_ffmpeg_via_imageio():
    """通过 imageio-ffmpeg 包获取 ffmpeg"""
    try:
        import imageio_ffmpeg
        ffmpeg_path = imageio_ffmpeg.get_ffmpeg_exe()
        print(f"[OK] FFmpeg found via imageio-ffmpeg: {ffmpeg_path}")
        return ffmpeg_path
    except ImportError:
        print("[SKIP] imageio-ffmpeg not installed")
        return None

# 方案2: 检查系统 PATH
def find_ffmpeg_in_path():
    """在系统 PATH 中查找 ffmpeg"""
    import shutil
    ffmpeg = shutil.which('ffmpeg')
    if ffmpeg:
        print(f"[OK] FFmpeg found in PATH: {ffmpeg}")
        return ffmpeg
    return None

# 方案3: 检查常见安装位置
def find_ffmpeg_in_common_paths():
    """在常见位置查找 ffmpeg"""
    common_paths = [
        "C:\\Program Files\\ffmpeg\\bin\\ffmpeg.exe",
        "C:\\Program Files (x86)\\ffmpeg\\bin\\ffmpeg.exe",
        os.path.expanduser("~/ffmpeg/ffmpeg.exe"),
        os.path.expanduser("~/ffmpeg_build/ffmpeg.exe"),
    ]
    
    for path in common_paths:
        if os.path.exists(path):
            print(f"[OK] FFmpeg found at: {path}")
            return path
    
    return None

# 方案4: 配置 yt-dlp 使用单一格式 (不需要 ffmpeg)
def configure_yt_dlp_no_ffmpeg():
    """配置 yt-dlp 使用单一格式下载，不需要 ffmpeg"""
    print("⚠️  配置 yt-dlp 使用单一格式下载（不需要 ffmpeg）")
    print("   - 优点: 不需要 ffmpeg，下载速度快")
    print("   - 缺点: 无法选择清晰度，只能下载最佳单一格式")
    return True

if __name__ == "__main__":
    print("=" * 60)
    print("FFmpeg 配置检查")
    print("=" * 60)
    
    # 尝试各种方案
    ffmpeg_path = None
    
    print("\n[1] Checking imageio-ffmpeg...")
    ffmpeg_path = setup_ffmpeg_via_imageio()
    
    if not ffmpeg_path:
        print("\n[2] Checking system PATH...")
        ffmpeg_path = find_ffmpeg_in_path()
    
    if not ffmpeg_path:
        print("\n[3] Checking common paths...")
        ffmpeg_path = find_ffmpeg_in_common_paths()
    
    if ffmpeg_path:
        print(f"\n[OK] FFmpeg configured: {ffmpeg_path}")
        sys.exit(0)
    else:
        print("\n[FAIL] FFmpeg not found")
        print("\nSolutions:")
        print("1. pip install imageio-ffmpeg")
        print("2. Download from: https://github.com/BtbN/FFmpeg-Builds/releases")
        print("3. winget install ffmpeg")
        sys.exit(1)
