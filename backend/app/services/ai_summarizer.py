"""AI Summarization service using 火山引擎 豆包 via official SDK."""

import json
import logging
from typing import Optional

from volcenginesdkarkruntime import Ark

from app.core.config import settings

logger = logging.getLogger(__name__)


class AISummarizer:
    """AI summarization service using 火山引擎 豆包 via official SDK."""

    def __init__(self):
        self.api_key = settings.volcengine_api_key
        self.model = "doubao-seed-2-0-lite-260215"
        self.base_url = settings.volcengine_base_url or "https://ark.cn-beijing.volces.com/api/v3"
        
        if not self.api_key:
            logger.warning("Volcengine API key not configured")
            return
        
        # Initialize Ark client with official SDK
        self.client = Ark(
            base_url=self.base_url,
            api_key=self.api_key,
        )
        logger.info(f"AI Summarizer initialized with model: {self.model}")

    def _call_doubao(self, messages: list, temperature: float = 0.7) -> str:
        """Call Doubao API via official SDK."""
        try:
            logger.info(f"Calling Doubao API with model: {self.model}")
            
            response = self.client.responses.create(
                model=self.model,
                input=messages,
                temperature=temperature,
            )
            
            logger.info(f"Doubao API response received")
            
            # Extract text from response
            if hasattr(response, 'output') and len(response.output) > 0:
                for item in response.output:
                    if hasattr(item, 'content') and len(item.content) > 0:
                        for content in item.content:
                            if hasattr(content, 'text'):
                                return content.text
            
            logger.error(f"Unexpected response format: {response}")
            raise Exception(f"Unexpected response format from Doubao API")
                
        except Exception as e:
            logger.error(f"Doubao API call failed: {e}")
            raise

    async def generate_summary(self, subtitle_text: str, video_title: str = "") -> str:
        """Generate video summary from subtitle text.
        
        Args:
            subtitle_text: Full subtitle text
            video_title: Optional video title for context
            
        Returns:
            Summary text (concise, ~200 words)
        """
        system_prompt = """你是一个专业的视频内容总结助手。你的任务是将视频字幕内容提炼成简洁的摘要。

要求：
1. 摘要控制在200字以内
2. 包含视频的核心主题和关键信息
3. 使用简洁的中文表达
4. 只输出摘要内容，不要有开场白或总结语

格式：
## 视频总结
[摘要内容]

### 核心要点
- 要点1
- 要点2
- 要点3"""

        user_prompt = f"视频标题：{video_title}\n\n字幕内容：\n{subtitle_text[:50000]}"

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]

        return self._call_doubao(messages, temperature=0.5)

    async def generate_chapters(self, subtitle_text: str, duration_seconds: int = 0) -> list:
        """Generate chapter timestamps from subtitle.
        
        Returns:
            List of {time, title} dicts
        """
        system_prompt = """你是一个视频内容分析助手。根据字幕内容，识别视频的章节结构。

要求：
1. 根据内容自然分段，每段3-10分钟
2. 为每个章节生成简洁的标题
3. 估计每个章节在视频中的时间位置

返回JSON数组格式：
[
  {"time": "00:00", "title": "开场/介绍"},
  {"time": "05:30", "title": "核心内容"},
  {"time": "15:00", "title": "总结"}
]

注意：time格式为MM:SS或HH:MM:SS"""

        user_prompt = f"字幕内容：\n{subtitle_text[:30000]}"

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]

        result = self._call_doubao(messages, temperature=0.3)
        
        # Parse JSON from response
        try:
            import re
            json_match = re.search(r'\[[\s\S]*\]', result)
            if json_match:
                chapters = json.loads(json_match.group())
                return chapters
        except Exception as e:
            logger.error(f"Failed to parse chapters: {e}")
        
        return []

    async def generate_mindmap(self, subtitle_text: str, video_title: str = "") -> dict:
        """Generate mind map structure from subtitle.
        
        Returns:
            Dict with title and children
        """
        system_prompt = """你是一个思维导图生成助手。根据视频内容，生成树状的思维导图结构。

要求：
1. 提取3-7个主要主题
2. 每个主题下生成2-4个要点
3. 使用简洁的短语作为标题

返回JSON格式：
{
  "title": "视频主题",
  "children": [
    {"name": "章节1", "children": [
      {"name": "要点1"},
      {"name": "要点2"}
    ]},
    {"name": "章节2", "children": [
      {"name": "要点1"}
    ]}
  ]
}"""

        user_prompt = f"视频标题：{video_title}\n\n字幕内容：\n{subtitle_text[:30000]}"

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]

        result = self._call_doubao(messages, temperature=0.5)
        
        try:
            import re
            json_match = re.search(r'\{[\s\S]*\}', result)
            if json_match:
                mindmap = json.loads(json_match.group())
                return mindmap
        except Exception as e:
            logger.error(f"Failed to parse mindmap: {e}")
        
        return {"title": video_title, "children": []}

    async def answer_question(
        self, 
        question: str, 
        subtitle_text: str, 
        chat_history: list = None
    ) -> dict:
        """Answer question about video content.
        
        Returns:
            Dict with answer and context
        """
        system_prompt = """你是一个视频内容问答助手。根据提供的字幕内容，回答用户的问题。

要求：
1. 只根据字幕内容回答，不要编造信息
2. 如果找不到相关信息，诚实告知用户
3. 如果需要，可以引用字幕中的原文
4. 回答要简洁明了"""

        # Build context from chat history
        history_context = ""
        if chat_history:
            for msg in chat_history[-5:]:  # Last 5 messages
                history_context += f"用户：{msg['question']}\nAI：{msg['answer']}\n\n"

        user_prompt = f"""视频字幕内容：
{subtitle_text[:40000]}

历史对话：
{history_context}

用户问题：{question}"""

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]

        answer = self._call_doubao(messages, temperature=0.5)
        
        # Try to find relevant context
        context = ""
        question_keywords = question.split()
        for kw in question_keywords[:3]:
            if kw in subtitle_text:
                idx = subtitle_text.find(kw)
                context = subtitle_text[max(0, idx-50):idx+200]
                break

        return {
            "answer": answer,
            "context": context
        }

    def _call_doubao_stream(self, messages: list, temperature: float = 0.7):
        """Call Doubao API with streaming via official SDK.
        
        Yields:
            Streamed text chunks
        """
        try:
            logger.info(f"Calling Doubao API (streaming) with model: {self.model}")
            
            response = self.client.responses.create(
                model=self.model,
                input=messages,
                temperature=temperature,
                stream=True,  # Enable streaming
            )
            
            # Stream the response
            for event in response:
                # Handle ResponseReasoningSummaryTextDeltaEvent (reasoning text)
                if hasattr(event, 'delta') and event.delta:
                    yield event.delta
                
                # Handle ResponseOutputTextDeltaEvent (final output text)
                elif hasattr(event, 'text') and event.text:
                    yield event.text
                
                # Handle output items
                elif hasattr(event, 'output') and event.output:
                    for item in event.output:
                        if hasattr(item, 'content') and item.content:
                            for content in item.content:
                                if hasattr(content, 'text') and content.text:
                                    yield content.text
                
        except Exception as e:
            logger.error(f"Doubao API streaming failed: {e}")
            raise

    def stream_summary(self, subtitle_text: str, video_title: str = ""):
        """Stream video summary generation.
        
        Yields:
            JSON chunks with partial summary
        """
        system_prompt = """你是一个专业的视频内容总结助手。你的任务是将视频字幕内容提炼成简洁的摘要。

要求：
1. 摘要控制在200字以内
2. 包含视频的核心主题和关键信息
3. 使用简洁的中文表达
4. 只输出摘要内容，不要有开场白或总结语

格式：
## 视频总结
[摘要内容]

### 核心要点
- 要点1
- 要点2
- 要点3"""

        user_prompt = f"视频标题：{video_title}\n\n字幕内容：\n{subtitle_text[:50000]}"

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]

        for chunk in self._call_doubao_stream(messages, temperature=0.5):
            yield json.dumps({"type": "summary", "data": chunk}, ensure_ascii=False)

    def stream_mindmap(self, subtitle_text: str, video_title: str = ""):
        """Stream mind map generation.
        
        Yields:
            JSON chunks with partial mindmap
        """
        system_prompt = """你是一个思维导图生成助手。根据视频内容，生成树状的思维导图结构。

要求：
1. 提取3-7个主要主题
2. 每个主题下生成2-4个要点
3. 使用简洁的短语作为标题

返回JSON格式：
{
  "title": "视频主题",
  "children": [
    {"name": "章节1", "children": [
      {"name": "要点1"},
      {"name": "要点2"}
    ]},
    {"name": "章节2", "children": [
      {"name": "要点1"}
    ]}
  ]
}"""

        user_prompt = f"视频标题：{video_title}\n\n字幕内容：\n{subtitle_text[:30000]}"

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]

        for chunk in self._call_doubao_stream(messages, temperature=0.5):
            yield json.dumps({"type": "mindmap", "data": chunk}, ensure_ascii=False)

    def stream_chat(
        self, 
        question: str, 
        subtitle_text: str, 
        chat_history: list = None
    ):
        """Stream question answering.
        
        Yields:
            JSON chunks with partial answer
        """
        system_prompt = """你是一个视频内容问答助手。根据提供的字幕内容，回答用户的问题。

要求：
1. 只根据字幕内容回答，不要编造信息
2. 如果找不到相关信息，诚实告知用户
3. 如果需要，可以引用字幕中的原文
4. 回答要简洁明了"""

        # Build context from chat history
        history_context = ""
        if chat_history:
            for msg in chat_history[-5:]:  # Last 5 messages
                history_context += f"用户：{msg['question']}\nAI：{msg['answer']}\n\n"

        user_prompt = f"""视频字幕内容：
{subtitle_text[:40000]}

历史对话：
{history_context}

用户问题：{question}"""

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]

        for chunk in self._call_doubao_stream(messages, temperature=0.5):
            yield json.dumps({"type": "chat", "data": chunk}, ensure_ascii=False)


# Global instance
ai_summarizer = AISummarizer()
