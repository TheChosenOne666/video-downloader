import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import Header from '../components/Header';

const API_BASE = 'http://localhost:8000';

interface VideoInfo {
  title: string;
  duration?: number;
  thumbnail?: string;
  uploader?: string;
  view_count?: number;
  description?: string;
}

interface CardState {
  status: 'idle' | 'loading' | 'done' | 'error';
  content: string;
  error?: string;
}

export default function SummarizePage() {
  const { videoUrl } = useApp();
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 4个卡片的状态
  const [summaryCard, setSummaryCard] = useState<CardState>({ status: 'idle', content: '' });
  const [subtitleCard, setSubtitleCard] = useState<CardState>({ status: 'idle', content: '' });
  const [mindmapCard, setMindmapCard] = useState<CardState>({ status: 'idle', content: '' });
  const [chatCard, setChatCard] = useState<CardState>({ status: 'idle', content: '' });

  // 问答状态
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<Array<{ role: string; content: string }>>([]);

  // 加载视频信息
  useEffect(() => {
    if (!videoUrl) {
      setError('No video URL provided');
      setLoading(false);
      return;
    }

    const loadVideoInfo = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/info`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ urls: [videoUrl] }),
        });

        if (!response.ok) {
          throw new Error('Failed to extract video info');
        }

        const data = await response.json();
        if (data.infos && data.infos[0]) {
          setVideoInfo(data.infos[0]);
          setError(null);
        } else {
          setError('无法解析视频信息');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    loadVideoInfo();
  }, [videoUrl]);

  // 生成摘要（非流式）
  const handleGenerateSummary = async () => {
    setSummaryCard({ status: 'loading', content: '', error: undefined });

    try {
      const response = await fetch(`${API_BASE}/api/summarize/stream/summary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ video_url: videoUrl }),
      });

      if (!response.ok) {
        throw new Error(`服务器错误: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('无法读取响应');

      const decoder = new TextDecoder();
      let buffer = '';
      let fullContent = '';
      let hasError = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data: ')) continue;
          
          const data = trimmed.slice(6);
          
          if (data === '[DONE]') {
            // 流结束
            if (hasError) {
              // 已经设置了错误状态，不做处理
              return;
            }
            if (fullContent) {
              setSummaryCard({ status: 'done', content: fullContent });
            }
            return;
          }

          try {
            const json = JSON.parse(data);
            if (json.type === 'error') {
              // 服务器返回错误
              hasError = true;
              setSummaryCard({ status: 'error', content: '', error: json.data || '生成失败' });
              return;
            }
            fullContent += json.data || '';
            // 实时更新
            setSummaryCard({ status: 'loading', content: fullContent });
          } catch {
            // 非 JSON，直接追加
            fullContent += data;
            setSummaryCard({ status: 'loading', content: fullContent });
          }
        }
      }

      // 流结束但没有 [DONE]
      if (!hasError) {
        if (fullContent) {
          setSummaryCard({ status: 'done', content: fullContent });
        } else {
          setSummaryCard({ status: 'error', content: '', error: '服务器未返回有效内容' });
        }
      }
    } catch (err) {
      setSummaryCard({ status: 'error', content: '', error: err instanceof Error ? err.message : '未知错误' });
    }
  };

  // 提取字幕
  const handleExtractSubtitle = async () => {
    setSubtitleCard({ status: 'loading', content: '', error: undefined });

    try {
      const response = await fetch(`${API_BASE}/api/summarize/stream/subtitle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ video_url: videoUrl }),
      });

      if (!response.ok) {
        throw new Error(`服务器错误: ${response.status}`);
      }

      const data = await response.json();

      if (data.status === 'no_subtitle') {
        setSubtitleCard({ status: 'done', content: '视频无字幕' });
      } else if (data.subtitle_entries && data.subtitle_entries.length > 0) {
        const text = data.subtitle_entries
          .map((e: { start: string; end: string; text: string }) => `[${e.start} - ${e.end}]\n${e.text}`)
          .join('\n\n');
        setSubtitleCard({ status: 'done', content: text });
      } else {
        setSubtitleCard({ status: 'done', content: '视频无字幕' });
      }
    } catch (err) {
      setSubtitleCard({ status: 'error', content: '', error: err instanceof Error ? err.message : '未知错误' });
    }
  };

  // 生成思维导图（非流式）
  const handleGenerateMindmap = async () => {
    setMindmapCard({ status: 'loading', content: '', error: undefined });

    try {
      const response = await fetch(`${API_BASE}/api/summarize/stream/mindmap`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ video_url: videoUrl }),
      });

      if (!response.ok) {
        throw new Error(`服务器错误: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('无法读取响应');

      const decoder = new TextDecoder();
      let buffer = '';
      let fullContent = '';
      let hasError = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data: ')) continue;
          
          const data = trimmed.slice(6);
          
          if (data === '[DONE]') {
            if (hasError) return;
            if (fullContent) {
              setMindmapCard({ status: 'done', content: fullContent });
            }
            return;
          }

          try {
            const json = JSON.parse(data);
            if (json.type === 'error') {
              hasError = true;
              setMindmapCard({ status: 'error', content: '', error: json.data || '生成失败' });
              return;
            }
            fullContent += json.data || '';
            setMindmapCard({ status: 'loading', content: fullContent });
          } catch {
            fullContent += data;
            setMindmapCard({ status: 'loading', content: fullContent });
          }
        }
      }

      if (!hasError) {
        if (fullContent) {
          setMindmapCard({ status: 'done', content: fullContent });
        } else {
          setMindmapCard({ status: 'error', content: '', error: '服务器未返回有效内容' });
        }
      }
    } catch (err) {
      setMindmapCard({ status: 'error', content: '', error: err instanceof Error ? err.message : '未知错误' });
    }
  };

  // 发送问答
  const handleSendChat = async () => {
    if (!chatInput.trim()) return;

    const question = chatInput;
    setChatInput('');

    // 添加用户消息
    setChatHistory(prev => [...prev, { role: 'user', content: question }]);
    setChatCard({ status: 'loading', content: '', error: undefined });

    try {
      const response = await fetch(`${API_BASE}/api/summarize/stream/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      });

      if (!response.ok) {
        throw new Error(`服务器错误: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('无法读取响应');

      const decoder = new TextDecoder();
      let buffer = '';
      let fullContent = '';
      let hasError = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data: ')) continue;
          
          const data = trimmed.slice(6);
          
          if (data === '[DONE]') {
            if (hasError) return;
            if (fullContent) {
              setChatHistory(h => [...h, { role: 'assistant', content: fullContent }]);
              setChatCard({ status: 'done', content: fullContent });
            }
            return;
          }

          try {
            const json = JSON.parse(data);
            if (json.type === 'error') {
              hasError = true;
              setChatCard({ status: 'error', content: '', error: json.data || '生成失败' });
              return;
            }
            fullContent += json.data || '';
            setChatCard({ status: 'loading', content: fullContent });
          } catch {
            fullContent += data;
            setChatCard({ status: 'loading', content: fullContent });
          }
        }
      }

      if (!hasError) {
        if (fullContent) {
          setChatHistory(h => [...h, { role: 'assistant', content: fullContent }]);
          setChatCard({ status: 'done', content: fullContent });
        } else {
          setChatCard({ status: 'error', content: '', error: '服务器未返回有效内容' });
        }
      }
    } catch (err) {
      setChatCard({ status: 'error', content: '', error: err instanceof Error ? err.message : '未知错误' });
    }
  };

  // 加载状态
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <Header />
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-gray-600">加载视频信息中...</p>
          </div>
        </div>
      </div>
    );
  }

  // 错误状态
  if (error || !videoInfo) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <Header />
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <p className="text-red-600 mb-4">{error || '无法加载视频信息'}</p>
            <button
              onClick={() => window.history.back()}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              返回
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 主页面
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Header />

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* 视频信息 */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <div className="flex gap-6">
            {videoInfo.thumbnail ? (
              <img
                src={videoInfo.thumbnail}
                alt={videoInfo.title}
                className="w-48 h-32 object-cover rounded-lg"
                onError={(e) => (e.target as HTMLImageElement).style.display = 'none'}
              />
            ) : (
              <div className="w-48 h-32 bg-gray-200 rounded-lg flex items-center justify-center">
                <span className="text-gray-400">暂无封面</span>
              </div>
            )}
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-800 mb-2">{videoInfo.title || '未知标题'}</h1>
              <p className="text-gray-600 mb-1">
                <span className="font-semibold">时长:</span> {videoInfo.duration ? `${Math.floor(videoInfo.duration / 60)}分${videoInfo.duration % 60}秒` : '未知'}
              </p>
              {videoInfo.uploader && (
                <p className="text-gray-600">
                  <span className="font-semibold">上传者:</span> {videoInfo.uploader}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* 4个卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 摘要卡片 */}
          <FeatureCard
            title="📝 视频摘要"
            state={summaryCard}
            onGenerate={handleGenerateSummary}
            onCopy={() => navigator.clipboard.writeText(summaryCard.content)}
          />

          {/* 字幕卡片 */}
          <FeatureCard
            title="📄 字幕文本"
            state={subtitleCard}
            onGenerate={handleExtractSubtitle}
            onCopy={() => navigator.clipboard.writeText(subtitleCard.content)}
          />

          {/* 思维导图卡片 */}
          <FeatureCard
            title="🧠 思维导图"
            state={mindmapCard}
            onGenerate={handleGenerateMindmap}
            onCopy={() => navigator.clipboard.writeText(mindmapCard.content)}
          />

          {/* 问答卡片 */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">💬 AI 智能问答</h2>

            {/* 聊天历史 */}
            <div className="bg-gray-50 rounded-lg p-4 h-64 overflow-y-auto mb-4 border border-gray-200">
              {chatHistory.length === 0 ? (
                <p className="text-gray-500 text-center py-8">暂无对话</p>
              ) : (
                <div className="space-y-3">
                  {chatHistory.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-lg ${
                        msg.role === 'user'
                          ? 'bg-indigo-100 text-indigo-900 ml-8'
                          : 'bg-gray-200 text-gray-900 mr-8'
                      }`}
                    >
                      <p className="text-sm font-semibold mb-1">
                        {msg.role === 'user' ? '你' : 'AI'}
                      </p>
                      <p className="text-sm">{msg.content}</p>
                    </div>
                  ))}
                  {chatCard.status === 'loading' && (
                    <div className="p-3 rounded-lg bg-gray-200 text-gray-900 mr-8">
                      <p className="text-sm font-semibold mb-1">AI</p>
                      <p className="text-sm animate-pulse">正在思考...</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 输入框 */}
            <div className="flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendChat()}
                placeholder="输入你的问题..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                disabled={chatCard.status === 'loading'}
              />
              <button
                onClick={handleSendChat}
                disabled={chatCard.status === 'loading' || !chatInput.trim()}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 transition"
              >
                {chatCard.status === 'loading' ? '...' : '发送'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// 功能卡片组件
interface FeatureCardProps {
  title: string;
  state: CardState;
  onGenerate: () => void;
  onCopy: () => void;
}

function FeatureCard({ title, state, onGenerate, onCopy }: FeatureCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-xl font-bold text-gray-800 mb-4">{title}</h2>

      {/* 内容区域 */}
      <div className="bg-gray-50 rounded-lg p-4 h-64 overflow-y-auto mb-4 border border-gray-200">
        {state.status === 'idle' && (
          <p className="text-gray-500 text-center py-8">点击下方按钮生成内容</p>
        )}
        {state.status === 'loading' && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-2"></div>
              <p className="text-gray-600 text-sm">生成中...</p>
            </div>
          </div>
        )}
        {state.status === 'done' && (
          <p className="text-gray-800 text-sm whitespace-pre-wrap">{state.content || '(空内容)'}</p>
        )}
        {state.status === 'error' && (
          <div className="text-red-600">
            <p className="font-semibold">错误:</p>
            <p>{state.error || '未知错误'}</p>
          </div>
        )}
      </div>

      {/* 按钮 */}
      <div className="flex gap-2">
        <button
          onClick={onGenerate}
          disabled={state.status === 'loading'}
          className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 transition font-semibold"
        >
          {state.status === 'loading' ? '生成中...' : '生成'}
        </button>
        {state.content && (
          <button
            onClick={onCopy}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition"
            title="复制内容"
          >
            📋
          </button>
        )}
      </div>
    </div>
  );
}
