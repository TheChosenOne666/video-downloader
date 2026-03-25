"""Application configuration settings."""

from pathlib import Path
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings."""
    
    # Server
    app_name: str = "Video Downloader API"
    app_version: str = "1.0.0"
    debug: bool = False
    host: str = "0.0.0.0"
    port: int = 8000
    
    # Download settings
    download_dir: Path = Path("downloads")
    max_concurrent_downloads: int = 3
    download_timeout: int = 3600  # 1 hour
    
    # Cleanup settings
    auto_cleanup: bool = True
    cleanup_after_hours: int = 24
    
    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
    }


# Global settings instance
settings = Settings()

# Ensure download directory exists (resolve relative to backend dir)
_backend_dir = Path(__file__).resolve().parent.parent.parent
settings.download_dir = (_backend_dir / "downloads").resolve()
settings.download_dir.mkdir(parents=True, exist_ok=True)
