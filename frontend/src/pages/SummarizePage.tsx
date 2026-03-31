import { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import Header from '../components/Header';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import MindmapGraph from '../components/MindmapGraph';

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

type TabType = 'summary' | 'titleinfo' | 'mindmap' | 'chat';

export default function SummarizePage() {
  const { videoUrl } = useApp();
  const [activeTab, setActiveTab] = useState<TabType>('summary');
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [summaryCard, setSummaryCard] = useState<CardState>({ status: 'idle', content: '' });
  const [mindmapCard, setMindmapCard] = useState<CardState>({ status: 'idle', content: '' });
  const [chatCard, setChatCard] = useState<CardState>({ status: 'idle', content: '' });
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<Array<{ role: string; content: string }>>([]);
  const [isMindmapFullscreen, setIsMindmapFullscreen] = useState(false);
  const mindmapRef = useRef<HTMLDivElement>(null);

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

        if (!response.ok) throw new Error('Failed to extract video info');

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

  const handleGenerateSummary = async () => {
    setSummaryCard({ status: 'loading', content: '', error: undefined });

    try {
      const response = await fetch(`${API_BASE}/api/summarize/stream/summary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ video_url: videoUrl }),
      });

      if (!response.ok) throw new Error(`服务器错误: ${response.status}`);

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
            setSummaryCard({ status: 'done', content: fullContent });
            return;
          }

          try {
            const json = JSON.parse(data);
            if (json.type === 'error') {
              hasError = true;
              setSummaryCard({ status: 'error', content: '', error: json.data });
              return;
            }
            fullContent += json.data || '';
            setSummaryCard({ status: 'loading', content: fullContent });
          } catch {
            fullContent += data;
            setSummaryCard({ status: 'loading', content: fullContent });
          }
        }
      }

      if (!hasError && fullContent) {
        setSummaryCard({ status: 'done', content: fullContent });
      } else {
        setSummaryCard({ status: 'error', content: '', error: '服务器未返回有效内容' });
      }
    } catch (err) {
      setSummaryCard({ status: 'error', content: '', error: err instanceof Error ? err.message : '未知错误' });
    }
  };

  const handleGenerateMindmap = async () => {
    setMindmapCard({ status: 'loading', content: '', error: undefined });

    try {
      const response = await fetch(`${API_BASE}/api/summarize/stream/mindmap`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ video_url: videoUrl }),
      });

      if (!response.ok) throw new Error(`服务器错误: ${response.status}`);

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
            setMindmapCard({ status: 'done', content: fullContent });
            return;
          }

          try {
            const json = JSON.parse(data);
            if (json.type === 'error') {
              hasError = true;
              setMindmapCard({ status: 'error', content: '', error: json.data });
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

      if (!hasError && fullContent) {
        setMindmapCard({ status: 'done', content: fullContent });
      } else {
        setMindmapCard({ status: 'error', content: '', error: '服务器未返回有效内容' });
      }
    } catch (err) {
      setMindmapCard({ status: 'error', content: '', error: err instanceof Error ? err.message : '未知错误' });
    }
  };

  const handleSendChat = async () => {
    if (!chatInput.trim()) return;

    const question = chatInput;
    setChatInput('');

    setChatHistory(prev => [...prev, { role: 'user', content: question }]);
    setChatCard({ status: 'loading', content: '', error: undefined });

    try {
      const response = await fetch(`${API_BASE}/api/summarize/stream/chat?video_url=${encodeURIComponent(videoUrl || '')}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      });

      if (!response.ok) throw new Error(`服务器错误: ${response.status}`);

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
              setChatCard({ status: 'error', content: '', error: json.data });
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

      if (!hasError && fullContent) {
        setChatHistory(h => [...h, { role: 'assistant', content: fullContent }]);
        setChatCard({ status: 'done', content: fullContent });
      } else {
        setChatCard({ status: 'error', content: '', error: '服务器未返回有效内容' });
      }
    } catch (err) {
      setChatCard({ status: 'error', content: '', error: err instanceof Error ? err.message : '未知错误' });
    }
  };

  const exportMindmapPNG = async () => {
    if (!mindmapRef.current) return;

    try {
      const html2canvas = (await import('html2canvas')).default;
      const element = mindmapRef.current;
      const canvas = await html2canvas(element, {
        backgroundColor: '#1e293b',
        scale: 2,
      });

      const link = document.createElement('a');
      link.download = `mindmap-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('Export PNG failed:', err);
      alert('导出 PNG 失败，请重试');
    }
  };

  const exportMindmapSVG = () => {
    if (!mindmapCard.content) return;

    try {
      const lines = mindmapCard.content.split('\n');
      const svgWidth = 800;
      const svgHeight = Math.max(600, lines.length * 40 + 100);
      const nodeHeight = 36;
      const nodeGap = 8;

      let svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${svgWidth}" height="${svgHeight}" viewBox="0 0 ${svgWidth} ${svgHeight}">
  <style>
    .node { fill: #334155; stroke: #4ade80; stroke-width: 2; }
    .text { fill: #f1f5f9; font-family: sans-serif; font-size: 14px; }
  </style>
  <rect width="100%" height="100%" fill="#1e293b"/>
`;

      let y = 40;
      for (const line of lines) {
        if (line.trim().startsWith('#')) {
          const text = line.replace(/^#+\s*/, '');
          const width = Math.max(text.length * 18 + 40, 200);
          svgContent += `  <rect class="node" x="${(svgWidth - width) / 2}" y="${y}" width="${width}" height="${nodeHeight}" rx="8"/>\n`;
          svgContent += `  <text class="text" x="${svgWidth / 2}" y="${y + 24}" text-anchor="middle" font-weight="bold">${text}</text>\n`;
          y += nodeHeight + nodeGap;
        } else if (line.trim().startsWith('-') || line.trim().startsWith('*')) {
          const text = line.trim().substring(1).trim();
          const width = Math.max(text.length * 14 + 30, 150);
          svgContent += `  <rect class="node" x="80" y="${y}" width="${width}" height="${nodeHeight}" rx="6"/>\n`;
          svgContent += `  <text class="text" x="100" y="${y + 24}">${text}</text>\n`;
          y += nodeHeight + nodeGap;
        }
      }

      svgContent += '</svg>';

      const blob = new Blob([svgContent], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = `mindmap-${Date.now()}.svg`;
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export SVG failed:', err);
      alert('导出 SVG 失败，请重试');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <Header />
        <div className="flex items-center justify-center h-[calc(100vh-80px)]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-slate-400">加载视频信息中...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !videoInfo) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <Header />
        <div className="flex items-center justify-center h-[calc(100vh-80px)]">
          <div className="text-center">
            <p className="text-red-400 mb-4">{error || '无法加载视频信息'}</p>
            <button onClick={() => window.history.back()} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              返回
            </button>
          </div>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'summary' as TabType, label: '📝 摘要总结' },
    { id: 'titleinfo' as TabType, label: '📄 标题信息' },
    { id: 'mindmap' as TabType, label: '🧠 思维导图' },
    { id: 'chat' as TabType, label: '💬 AI 问答' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <Header />

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* 视频信息 */}
        <div className="bg-slate-800/50 backdrop-blur rounded-xl p-4 mb-6 border border-slate-700">
          <div className="flex gap-4">
            {videoInfo.thumbnail ? (
              <img src={videoInfo.thumbnail} alt={videoInfo.title} className="w-32 h-20 object-cover rounded-lg"
                onError={(e) => (e.target as HTMLImageElement).style.display = 'none'} />
            ) : (
              <div className="w-32 h-20 bg-slate-700 rounded-lg flex items-center justify-center">
                <span className="text-slate-500">暂无封面</span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-bold text-white mb-1 truncate">{videoInfo.title || '未知标题'}</h1>
              <div className="flex flex-wrap gap-3 text-sm text-slate-400">
                {videoInfo.uploader && <span>👤 {videoInfo.uploader}</span>}
                {videoInfo.duration && <span>⏱️ {Math.floor(videoInfo.duration / 60)}分{videoInfo.duration % 60}秒</span>}
                {videoInfo.view_count && <span>👁️ {videoInfo.view_count.toLocaleString()}</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Tab 导航 */}
        <div className="bg-slate-800/50 backdrop-blur rounded-xl p-1 mb-6 border border-slate-700">
          <div className="flex gap-1">
            {tabs.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all ${
                  activeTab === tab.id ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                }`}>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab 内容 */}
        <div className="bg-slate-800/50 backdrop-blur rounded-xl p-6 border border-slate-700 min-h-[500px]">
          {/* 摘要 Tab */}
          {activeTab === 'summary' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">📝 视频摘要</h2>
                <button onClick={handleGenerateSummary} disabled={summaryCard.status === 'loading'}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition">
                  {summaryCard.status === 'loading' ? '生成中...' : '生成摘要'}
                </button>
              </div>

              <div className="bg-slate-900/50 rounded-lg p-6 min-h-[400px] overflow-auto">
                {summaryCard.status === 'idle' && (
                  <div className="flex flex-col items-center justify-center h-[400px] text-slate-500">
                    <svg className="w-16 h-16 mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p>点击「生成摘要」获取视频内容总结</p>
                    <p className="text-sm mt-2">基于 AI 分析视频字幕，自动生成结构化摘要</p>
                  </div>
                )}

                {summaryCard.status === 'loading' && (
                  <div className="flex items-center justify-center h-[400px]">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mx-auto mb-3"></div>
                      <p className="text-slate-400">AI 正在分析视频内容...</p>
                    </div>
                  </div>
                )}

                {summaryCard.status === 'done' && (
                  <div className="prose prose-invert prose-blue max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {summaryCard.content}
                    </ReactMarkdown>
                  </div>
                )}

                {summaryCard.status === 'error' && (
                  <div className="flex flex-col items-center justify-center h-[400px] text-red-400">
                    <p className="font-semibold">生成失败</p>
                    <p className="text-sm mt-2">{summaryCard.error}</p>
                  </div>
                )}
              </div>

              {summaryCard.content && (
                <div className="flex gap-2 justify-end">
                  <button onClick={() => navigator.clipboard.writeText(summaryCard.content)}
                    className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition">
                    📋 复制内容
                  </button>
                </div>
              )}
            </div>
          )}

          {/* 标题信息 Tab */}
          {activeTab === 'titleinfo' && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-white">📄 标题信息</h2>

              <div className="bg-slate-900/50 rounded-lg p-6 space-y-4">
                <div>
                  <span className="text-xs text-slate-500 uppercase tracking-wide">视频标题</span>
                  <p className="text-white text-lg font-medium mt-1">{videoInfo.title || '未知标题'}</p>
                </div>

                {videoInfo.uploader && (
                  <div>
                    <span className="text-xs text-slate-500 uppercase tracking-wide">上传者</span>
                    <p className="text-slate-300 mt-1">👤 {videoInfo.uploader}</p>
                  </div>
                )}

                {videoInfo.duration != null && videoInfo.duration > 0 && (
                  <div>
                    <span className="text-xs text-slate-500 uppercase tracking-wide">时长</span>
                    <p className="text-slate-300 mt-1">⏱️ {Math.floor(videoInfo.duration / 60)}分{videoInfo.duration % 60}秒</p>
                  </div>
                )}

                {videoInfo.view_count != null && (
                  <div>
                    <span className="text-xs text-slate-500 uppercase tracking-wide">播放量</span>
                    <p className="text-slate-300 mt-1">👁️ {videoInfo.view_count.toLocaleString()}</p>
                  </div>
                )}

                {videoInfo.description && (
                  <div>
                    <span className="text-xs text-slate-500 uppercase tracking-wide">视频描述</span>
                    <p className="text-slate-300 mt-1 whitespace-pre-wrap">{videoInfo.description}</p>
                  </div>
                )}
              </div>

              <div className="flex gap-2 justify-end">
                <button onClick={() => navigator.clipboard.writeText(videoInfo.title || '')}
                  className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition">
                  📋 复制标题
                </button>
              </div>
            </div>
          )}

          {/* 思维导图 Tab */}
          {activeTab === 'mindmap' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">🧠 思维导图</h2>
                <div className="flex gap-2">
                  <button onClick={() => setIsMindmapFullscreen(true)} disabled={mindmapCard.status !== 'done'}
                    className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition" title="全屏查看">
                    🔍 全屏
                  </button>
                  <button onClick={handleGenerateMindmap} disabled={mindmapCard.status === 'loading'}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition">
                    {mindmapCard.status === 'loading' ? '生成中...' : '生成导图'}
                  </button>
                </div>
              </div>

              <div className="bg-slate-900/50 rounded-lg p-6 min-h-[400px] overflow-auto">
                {mindmapCard.status === 'idle' && (
                  <div className="flex flex-col items-center justify-center h-[400px] text-slate-500">
                    <svg className="w-16 h-16 mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    <p>点击「生成导图」获取视频知识结构</p>
                    <p className="text-sm mt-2">以思维导图形式展示视频核心知识点</p>
                  </div>
                )}

                {mindmapCard.status === 'loading' && (
                  <div className="flex items-center justify-center h-[400px]">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mx-auto mb-3"></div>
                      <p className="text-slate-400">AI 正在生成思维导图...</p>
                    </div>
                  </div>
                )}

                {mindmapCard.status === 'done' && (
                  <div ref={mindmapRef} className="mindmap-container">
                    <MindmapGraph content={mindmapCard.content} />
                  </div>
                )}

                {mindmapCard.status === 'error' && (
                  <div className="flex flex-col items-center justify-center h-[400px] text-red-400">
                    <p className="font-semibold">生成失败</p>
                    <p className="text-sm mt-2">{mindmapCard.error}</p>
                  </div>
                )}
              </div>

              {mindmapCard.status === 'done' && (
                <div className="flex gap-2 justify-end">
                  <button onClick={exportMindmapPNG}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition">
                    📷 下载 PNG
                  </button>
                  <button onClick={exportMindmapSVG}
                    className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition">
                    📐 下载 SVG
                  </button>
                </div>
              )}
            </div>
          )}

          {/* 问答 Tab */}
          {activeTab === 'chat' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">💬 AI 智能问答</h2>
                <button onClick={() => { setChatHistory([]); setChatCard({ status: 'idle', content: '' }); }}
                  disabled={chatHistory.length === 0}
                  className="px-3 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 disabled:opacity-50 transition text-sm">
                  🗑️ 清空对话
                </button>
              </div>

              <div className="bg-slate-900/50 rounded-lg p-4 h-[350px] overflow-y-auto mb-4">
                {chatHistory.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-slate-500">
                    <svg className="w-16 h-16 mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <p>开始和 AI 讨论这个视频吧</p>
                    <p className="text-sm mt-2">可以问任何关于视频内容的问题</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {chatHistory.map((msg, idx) => (
                      <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] p-4 rounded-2xl ${
                          msg.role === 'user' ? 'bg-blue-600 text-white rounded-br-sm' : 'bg-slate-700 text-slate-100 rounded-bl-sm'
                        }`}>
                          <p className="text-xs opacity-70 mb-1">{msg.role === 'user' ? '你' : 'AI'}</p>
                          <div className="prose prose-sm prose-invert max-w-none">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                          </div>
                        </div>
                      </div>
                    ))}

                    {chatCard.status === 'loading' && (
                      <div className="flex justify-start">
                        <div className="bg-slate-700 text-slate-100 p-4 rounded-2xl rounded-bl-sm">
                          <p className="text-xs opacity-70 mb-1">AI</p>
                          <p className="text-slate-400 animate-pulse">正在思考...</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendChat()}
                  placeholder="输入你的问题..."
                  className="flex-1 px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 transition"
                  disabled={chatCard.status === 'loading'} />
                <button onClick={handleSendChat} disabled={chatCard.status === 'loading' || !chatInput.trim()}
                  className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium">
                  {chatCard.status === 'loading' ? '...' : '发送'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 全屏思维导图 Modal */}
      {isMindmapFullscreen && (
        <div className="fixed inset-0 bg-black/90 z-50 flex flex-col" onClick={() => setIsMindmapFullscreen(false)}>
          <div className="flex items-center justify-between p-4 bg-slate-800">
            <h3 className="text-white font-bold text-lg">🧠 思维导图 - 全屏</h3>
            <button onClick={() => setIsMindmapFullscreen(false)}
              className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition">
              ✕ 关闭
            </button>
          </div>
          <div className="flex-1 p-8 overflow-auto" onClick={(e) => e.stopPropagation()}>
            {mindmapCard.content && (
              <div ref={mindmapRef} className="bg-slate-800 rounded-xl p-8 mx-auto max-w-4xl min-h-full">
                <MindmapGraph content={mindmapCard.content} />
              </div>
            )}
          </div>
          <div className="flex gap-2 justify-center p-4 bg-slate-800">
            <button onClick={(e) => { e.stopPropagation(); exportMindmapPNG(); }}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium">
              📷 下载 PNG
            </button>
            <button onClick={(e) => { e.stopPropagation(); exportMindmapSVG(); }}
              className="px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition font-medium">
              📐 下载 SVG
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
