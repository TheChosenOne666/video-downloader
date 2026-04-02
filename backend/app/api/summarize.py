"""AI Summarization API endpoints."""

import logging
import uuid
from datetime import datetime
from typing import Dict, Optional, AsyncGenerator

from fastapi import APIRouter, HTTPException, status
from fastapi.responses import StreamingResponse

from app.models.schemas import (
    ChatRequest,
    ChatResponse,
    ChatMessage,
    ErrorResponse,
    SummarizeRequest,
    SummarizeResponse,
    SummarizeResultResponse,
    SummarizeStatus,
    VideoInfo,
    SubtitleEntry,
    ChapterInfo,
    MindMapNode,
    MindMapData,
)
from app.database import summarize_repository
from app.services.subtitle_extractor import subtitle_extractor
from app.services.ai_summarizer import ai_summarizer

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/summarize", tags=["summarize"])

# In-memory storage for chat histories (lightweight, can be extended to DB if needed)
chat_histories: Dict[str, list] = {}


# ================================================================
# Helper SSE generators
# ================================================================

async def _stream_summary_generator(
    subtitle_text: str,
    video_title: str
) -> AsyncGenerator[str, None]:
    """Generator for streaming summary."""
    try:
        for chunk in ai_summarizer.stream_summary(subtitle_text, video_title):
            yield f"data: {chunk}\n\n"
        yield "data: [DONE]\n\n"
    except Exception as e:
        logger.error(f"Stream summary failed: {e}")
        import json
        error_json = json.dumps({"type": "error", "data": str(e)}, ensure_ascii=False)
        yield f"data: {error_json}\n\n"
        yield "data: [DONE]\n\n"


async def _stream_mindmap_generator(
    subtitle_text: str,
    video_title: str
) -> AsyncGenerator[str, None]:
    """Generator for streaming mindmap."""
    try:
        for chunk in ai_summarizer.stream_mindmap(subtitle_text, video_title):
            yield f"data: {chunk}\n\n"
        yield "data: [DONE]\n\n"
    except Exception as e:
        logger.error(f"Stream mindmap failed: {e}")
        import json
        error_json = json.dumps({"type": "error", "data": str(e)}, ensure_ascii=False)
        yield f"data: {error_json}\n\n"
        yield "data: [DONE]\n\n"


async def _stream_chat_generator(
    question: str,
    subtitle_text: str,
    chat_history: list = None
) -> AsyncGenerator[str, None]:
    """Generator for streaming chat."""
    try:
        for chunk in ai_summarizer.stream_chat(question, subtitle_text, chat_history):
            yield f"data: {chunk}\n\n"
        yield "data: [DONE]\n\n"
    except Exception as e:
        logger.error(f"Stream chat failed: {e}")
        import json
        error_json = json.dumps({"type": "error", "data": str(e)}, ensure_ascii=False)
        yield f"data: {error_json}\n\n"
        yield "data: [DONE]\n\n"


async def _stream_error_generator(error_msg: str) -> AsyncGenerator[str, None]:
    """Generator for error messages."""
    import json
    yield f"data: {json.dumps({'type': 'error', 'data': error_msg}, ensure_ascii=False)}\n\n"
    yield "data: [DONE]\n\n"


def _build_mindmap_response(mindmap_data: dict) -> Optional[MindMapData]:
    """Build mind map response from raw data."""
    if not mindmap_data:
        return None

    def build_node(node: dict) -> MindMapNode:
        children = node.get("children", [])
        return MindMapNode(
            name=node.get("name", ""),
            children=[build_node(c) for c in children] if children else None
        )

    return MindMapData(
        title=mindmap_data.get("title", ""),
        children=[build_node(c) for c in mindmap_data.get("children", [])]
    )


# ================================================================
# Background task processor
# ================================================================

async def _process_summarization(task_id: str, video_url: str):
    """Background task to process summarization."""
    try:
        # Step 1: Extract subtitle
        await summarize_repository.update_task(task_id, status=SummarizeStatus.EXTRACTING)
        logger.info(f"[{task_id}] Extracting subtitle...")

        subtitle_text, subtitle_entries, video_info = await subtitle_extractor.extract_subtitle(video_url)

        await summarize_repository.update_task(
            task_id,
            video_info=video_info,
            subtitle=subtitle_text,
            subtitle_entries=subtitle_entries
        )

        if not subtitle_text:
            await summarize_repository.update_task(
                task_id,
                status=SummarizeStatus.FAILED,
                error="No subtitle found for this video",
                completed=True
            )
            return

        # Step 2: AI Analysis
        await summarize_repository.update_task(task_id, status=SummarizeStatus.ANALYZING)
        logger.info(f"[{task_id}] AI analyzing...")

        # Generate summary
        summary = await ai_summarizer.generate_summary(
            subtitle_text,
            video_info.get("title", "")
        )
        await summarize_repository.update_task(task_id, summary=summary)

        # Generate chapters
        chapters = await ai_summarizer.generate_chapters(
            subtitle_text,
            video_info.get("duration", 0)
        )
        await summarize_repository.update_task(task_id, chapters=chapters)

        # Generate mindmap
        mindmap = await ai_summarizer.generate_mindmap(
            subtitle_text,
            video_info.get("title", "")
        )
        await summarize_repository.update_task(task_id, mindmap=mindmap)

        # Mark completed
        await summarize_repository.update_task(task_id, status=SummarizeStatus.COMPLETED, completed=True)
        logger.info(f"[{task_id}] Summarization completed")

    except Exception as e:
        logger.error(f"[{task_id}] Summarization failed: {e}")
        await summarize_repository.update_task(
            task_id,
            status=SummarizeStatus.FAILED,
            error=str(e),
            completed=True
        )


# ================================================================
# API Endpoints
# ================================================================

@router.post(
    "",
    response_model=SummarizeResponse,
    status_code=status.HTTP_202_ACCEPTED,
    responses={400: {"model": ErrorResponse}, 500: {"model": ErrorResponse}},
    summary="Create AI summarization task",
    description="Submit a video URL for AI summarization. Returns task ID for tracking.",
)
async def create_summarize_task(request: SummarizeRequest) -> SummarizeResponse:
    """Create a new AI summarization task."""
    try:
        task_id = str(uuid.uuid4())

        # Save to database
        await summarize_repository.create_task(
            task_id=task_id,
            video_url=request.video_url,
            platform=request.platform,
        )

        import asyncio
        asyncio.create_task(_process_summarization(task_id, request.video_url))

        logger.info(f"Created summarize task: {task_id}")
        return SummarizeResponse(
            task_id=task_id,
            status=SummarizeStatus.PENDING,
            message="Summarization task created, processing...",
        )

    except Exception as e:
        logger.error(f"Failed to create summarize task: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create task: {str(e)}",
        )


# ---- SSE Streaming Endpoints ----
# 注意：这些 /stream/* 路由必须放在 /{task_id} 之前！
# FastAPI 按定义顺序匹配，字面路径优先于动态路径参数

@router.post(
    "/stream/subtitle",
    summary="Extract subtitle (sync)",
    description="Extract subtitle from video URL (synchronous).",
)
async def extract_subtitle_sync(request: SummarizeRequest):
    """Extract subtitle from video synchronously."""
    try:
        logger.info(f"Extracting subtitle from: {request.video_url}")

        subtitle_text, subtitle_entries, video_info = await subtitle_extractor.extract_subtitle(
            request.video_url
        )

        if not subtitle_text:
            return {
                "status": "no_subtitle",
                "message": "视频无字幕",
                "video_info": video_info,
                "subtitle_entries": []
            }

        return {
            "status": "success",
            "video_info": video_info,
            "subtitle": subtitle_text,
            "subtitle_entries": [
                {"start": e["start"], "end": e["end"], "text": e["text"]}
                for e in subtitle_entries
            ]
        }

    except Exception as e:
        logger.error(f"Subtitle extraction failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to extract subtitle: {str(e)}",
        )


@router.post(
    "/stream/summary",
    summary="Stream video summary",
    description="Stream AI-generated video summary using Server-Sent Events.",
)
async def stream_summary(request: SummarizeRequest):
    """Stream video summary generation."""
    try:
        subtitle_text, _, video_info = await subtitle_extractor.extract_subtitle(
            request.video_url
        )

        if not subtitle_text or len(subtitle_text.strip()) < 10:
            title = video_info.get("title", "")
            description = video_info.get("description", "")

            if title or description:
                context = f"视频标题：{title}\n\n视频描述：{description}"
                logger.info(f"Using title+description as context ({len(context)} chars)")
                return StreamingResponse(
                    _stream_summary_generator(context, title),
                    media_type="text/event-stream"
                )
            else:
                return StreamingResponse(
                    _stream_error_generator("视频无字幕、无标题、无描述，无法生成摘要。请选择有字幕的视频。"),
                    media_type="text/event-stream"
                )

        return StreamingResponse(
            _stream_summary_generator(subtitle_text, video_info.get("title", "")),
            media_type="text/event-stream"
        )

    except Exception as e:
        logger.error(f"Stream summary endpoint failed: {e}")
        return StreamingResponse(
            _stream_error_generator(str(e)),
            media_type="text/event-stream"
        )


@router.post(
    "/stream/mindmap",
    summary="Stream mind map",
    description="Stream AI-generated mind map using Server-Sent Events.",
)
async def stream_mindmap(request: SummarizeRequest):
    """Stream mind map generation."""
    try:
        subtitle_text, _, video_info = await subtitle_extractor.extract_subtitle(
            request.video_url
        )

        if not subtitle_text or len(subtitle_text.strip()) < 10:
            title = video_info.get("title", "")
            description = video_info.get("description", "")

            if title or description:
                context = f"视频标题：{title}\n\n视频描述：{description}"
                logger.info(f"Using title+description for mindmap ({len(context)} chars)")
                return StreamingResponse(
                    _stream_mindmap_generator(context, title),
                    media_type="text/event-stream"
                )
            else:
                return StreamingResponse(
                    _stream_error_generator("视频无字幕、无标题、无描述，无法生成思维导图。请选择有字幕的视频。"),
                    media_type="text/event-stream"
                )

        return StreamingResponse(
            _stream_mindmap_generator(subtitle_text, video_info.get("title", "")),
            media_type="text/event-stream"
        )

    except Exception as e:
        logger.error(f"Stream mindmap endpoint failed: {e}")
        return StreamingResponse(
            _stream_error_generator(str(e)),
            media_type="text/event-stream"
        )


@router.post(
    "/stream/chat",
    summary="Stream chat response",
    description="Stream AI answer to question using Server-Sent Events.",
)
async def stream_chat(
    request: ChatRequest,
    task_id: Optional[str] = None,
    video_url: Optional[str] = None
):
    """Stream chat response. Supports both task_id and direct video_url."""
    try:
        subtitle_text = ""

        # 方式1: 通过 task_id 获取字幕
        if task_id:
            task = await summarize_repository.get_task(task_id)
            if task:
                subtitle_text = task.get("subtitle", "")

        # 方式2: 直接从视频提取字幕
        if not subtitle_text and video_url:
            try:
                subtitle_text, _, _ = await subtitle_extractor.extract_subtitle(video_url)
            except Exception as e:
                logger.warning(f"Failed to extract subtitle for chat: {e}")

        if not subtitle_text:
            return StreamingResponse(
                _stream_error_generator("无法获取字幕，请确保视频有字幕或先使用「AI 字幕生成」功能"),
                media_type="text/event-stream"
            )

        history = chat_histories.get(task_id, []) if task_id else []

        return StreamingResponse(
            _stream_chat_generator(request.question, subtitle_text, history),
            media_type="text/event-stream"
        )

    except Exception as e:
        logger.error(f"Stream chat endpoint failed: {e}")
        return StreamingResponse(
            _stream_error_generator(str(e)),
            media_type="text/event-stream"
        )


# ---- Task Endpoints (/{task_id} 放在 /stream/* 之后) ----

@router.get(
    "/{task_id}",
    response_model=SummarizeResultResponse,
    responses={404: {"model": ErrorResponse}},
    summary="Get summarization result",
    description="Get the full summarization result for a task.",
)
async def get_summarize_result(task_id: str) -> SummarizeResultResponse:
    """Get summarization result by task ID."""
    task = await summarize_repository.get_task(task_id)
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Task not found: {task_id}",
        )

    video_info = task.get("video_info") or {}

    return SummarizeResultResponse(
        task_id=task_id,
        status=SummarizeStatus(task["status"]),
        video_info=VideoInfo.from_dict(video_info) if isinstance(video_info, dict) else video_info,
        subtitle=task.get("subtitle", ""),
        subtitle_entries=[
            SubtitleEntry(start=e["start"], end=e["end"], text=e["text"])
            for e in task.get("subtitle_entries", [])
        ],
        summary=task.get("summary", ""),
        chapters=[
            ChapterInfo(time=c["time"], title=c["title"])
            for c in task.get("chapters", [])
        ],
        mindmap=_build_mindmap_response(task.get("mindmap")) if task.get("mindmap") else None,
        created_at=datetime.fromisoformat(task["created_at"].replace("Z", "+00:00")) if isinstance(task["created_at"], str) else task["created_at"],
        completed_at=datetime.fromisoformat(task["completed_at"].replace("Z", "+00:00")) if task.get("completed_at") and isinstance(task["completed_at"], str) else task.get("completed_at"),
        error=task.get("error"),
    )


@router.post(
    "/{task_id}/chat",
    response_model=ChatResponse,
    responses={404: {"model": ErrorResponse}},
    summary="Ask question about video",
    description="Ask a question about the video content. Requires completed summarization task.",
)
async def chat_about_video(task_id: str, request: ChatRequest) -> ChatResponse:
    """Ask question about video content (non-streaming)."""
    task = await summarize_repository.get_task(task_id)
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Task not found: {task_id}",
        )

    if task["status"] != SummarizeStatus.COMPLETED.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Task is not completed yet",
        )

    subtitle_text = task.get("subtitle", "")
    if not subtitle_text:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No subtitle available for this video",
        )

    history = chat_histories.get(task_id, [])

    try:
        result = await ai_summarizer.answer_question(
            request.question,
            subtitle_text,
            history
        )

        history.append({
            "question": request.question,
            "answer": result["answer"]
        })
        chat_histories[task_id] = history

        # Save chat history to database
        await summarize_repository.add_chat_message(
            task_id=task_id,
            role="user",
            content=request.question
        )
        await summarize_repository.add_chat_message(
            task_id=task_id,
            role="assistant",
            content=result["answer"],
            context=result.get("context")
        )

        chat_messages = []
        for h in history:
            chat_messages.append(ChatMessage(role="user", content=h["question"]))
            chat_messages.append(ChatMessage(role="assistant", content=h["answer"]))

        return ChatResponse(
            answer=result["answer"],
            context=result.get("context"),
            chat_history=chat_messages
        )

    except Exception as e:
        logger.error(f"Chat failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get answer: {str(e)}",
        )


@router.delete(
    "/{task_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    responses={404: {"model": ErrorResponse}},
    summary="Delete summarization task",
    description="Delete a summarization task and its data.",
)
async def delete_summarize_task(task_id: str) -> None:
    """Delete a summarization task."""
    deleted = await summarize_repository.delete_task(task_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Task not found: {task_id}",
        )

    if task_id in chat_histories:
        del chat_histories[task_id]

    logger.info(f"Deleted summarize task: {task_id}")
