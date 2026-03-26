"""FastAPI application entry point with WebSocket support."""

import logging
from contextlib import asynccontextmanager
from typing import Dict, Set

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from app.api.download import router as download_router
from app.api.summarize import router as summarize_router
from app.core.config import settings
from app.services.task_manager import set_ws_manager

# Configure logging
logging.basicConfig(
    level=logging.DEBUG if settings.debug else logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)

logger = logging.getLogger(__name__)


class ConnectionManager:
    """WebSocket connection manager for real-time progress updates."""
    
    def __init__(self):
        # task_id -> set of websocket connections
        self.active_connections: Dict[str, Set[WebSocket]] = {}
    
    async def connect(self, websocket: WebSocket, task_id: str):
        """Accept and register a new WebSocket connection."""
        await websocket.accept()
        if task_id not in self.active_connections:
            self.active_connections[task_id] = set()
        self.active_connections[task_id].add(websocket)
        logger.info(f"WebSocket connected for task: {task_id}")
    
    def disconnect(self, websocket: WebSocket, task_id: str):
        """Remove a WebSocket connection."""
        if task_id in self.active_connections:
            self.active_connections[task_id].discard(websocket)
            if not self.active_connections[task_id]:
                del self.active_connections[task_id]
        logger.info(f"WebSocket disconnected for task: {task_id}")
    
    async def broadcast_progress(self, task_id: str, progress_data: dict):
        """Broadcast progress update to all connections for a task."""
        if task_id not in self.active_connections:
            return
        
        disconnected = set()
        for connection in self.active_connections[task_id]:
            try:
                await connection.send_json(progress_data)
            except Exception:
                disconnected.add(connection)
        
        # Clean up disconnected clients
        for conn in disconnected:
            self.disconnect(conn, task_id)


# Global connection manager
ws_manager = ConnectionManager()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    logger.info(f"Starting {settings.app_name} v{settings.app_version}")
    logger.info(f"Download directory: {settings.download_dir.absolute()}")
    
    # Connect WebSocket manager to task manager
    set_ws_manager(ws_manager)
    
    yield
    
    logger.info("Shutting down application")


# Create FastAPI application
app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="Video downloader service using yt-dlp with WebSocket progress and AI summarization",
    lifespan=lifespan,
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(download_router)
app.include_router(summarize_router)


@app.get("/", tags=["health"])
async def root() -> dict:
    """Root endpoint - API health check."""
    return {
        "name": settings.app_name,
        "version": settings.app_version,
        "status": "running",
        "features": ["download", "ai-summarize"],
    }


@app.get("/health", tags=["health"])
async def health_check() -> dict:
    """Health check endpoint."""
    return {"status": "healthy"}


@app.websocket("/ws/{task_id}")
async def websocket_progress(websocket: WebSocket, task_id: str):
    """WebSocket endpoint for real-time progress updates."""
    await ws_manager.connect(websocket, task_id)
    try:
        while True:
            # Keep connection alive, wait for any message from client
            # This is mainly to detect when client disconnects
            data = await websocket.receive_text()
            # Client can send "ping" to keep connection alive
            if data == "ping":
                await websocket.send_json({"type": "pong"})
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket, task_id)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        ws_manager.disconnect(websocket, task_id)
