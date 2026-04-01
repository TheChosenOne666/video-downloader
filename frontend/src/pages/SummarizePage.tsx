import { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import Header from '../components/Header';
import SEO from '../components/SEO';
import { seoConfig } from '../config/seo';
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
        backgroundColor: '#f8fafc',
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
    .node { fill: #f1f5f9; stroke: #3b82f6; stroke-width: 2; }
    .text { fill: #1e293b; font-family: sans-serif; font-size: 14px; }
  </style>
  <rect width="100%" height="100%" fill="#f8fafc"/>
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
      <div className="min-h-screen flex flex-col">
        <SEO config={seoConfig['/summarize']} />
        <Header />
        <div className="flex items-center justify-center flex-1">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: 'var(--color-primary)' }}></div>
            <p style={{ color: 'var(--color-text-muted)' }}>加载视频信息中...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !videoInfo) {
    return (
      <div className="min-h-screen flex flex-col">
        <SEO config={seoConfig['/summarize']} />
        <Header />
        <div className="flex items-center justify-center flex-1">
          <div className="text-center">
            <p className="mb-4" style={{ color: 'var(--color-error)' }}>{error || '无法加载视频信息'}</p>
            <button onClick={() => window.history.back()} className="btn-primary">
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
    <div className="min-h-screen flex flex-col">
      <SEO config={seoConfig['/summarize']} />
      <Header />

      <div className="flex-1 flex flex-col px-4 py-4">
        {/* 视频信息 */}
        <div className="glass-card p-4 mb-4">
          <div className="flex gap-4">
            {videoInfo.thumbnail ? (
              <img src={videoInfo.thumbnail} alt={videoInfo.title} className="w-32 h-20 object-cover rounded-lg"
                onError={(e) => (e.target as HTMLImageElement).style.display = 'none'} />
            ) : (
              <div className="w-32 h-20 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--color-surface-lighter)' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>暂无封面</span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-bold mb-1 truncate" style={{ color: 'var(--color-text-primary)' }}>{videoInfo.title || '未知标题'}</h1>
              <div className="flex flex-wrap gap-3 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                {videoInfo.uploader && <span>👤 {videoInfo.uploader}</span>}
                {videoInfo.duration && <span>⏱️ {Math.floor(videoInfo.duration / 60)}分{videoInfo.duration % 60}秒</span>}
                {videoInfo.view_count && <span>👁️ {videoInfo.view_count.toLocaleString()}</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Tab 导航 */}
        <div className="glass-card p-1 mb-4">
          <div className="flex gap-1">
            {tabs.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className="flex-1 px-4 py-3 rounded-lg font-medium transition-all"
                style={{ 
                  backgroundColor: activeTab === tab.id ? 'var(--color-primary)' : 'transparent',
                  color: activeTab === tab.id ? '#ffffff' : 'var(--color-text-muted)'
                }}>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab 内容 */}
        <div className="glass-card p-4 flex-1 overflow-auto">
          {activeTab === 'summary' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>📝 视频摘要</h2>
                <button onClick={handleGenerateSummary} disabled={summaryCard.status === 'loading'} className="btn-primary">
                  {summaryCard.status === 'loading' ? '生成中...' : '生成摘要'}
                </button>
              </div>
              <div className="rounded-lg p-6 min-h-[400px]" style={{ backgroundColor: 'var(--color-surface-light)' }}>
                {summaryCard.status === 'idle' && (
                  <div className="flex flex-col items-center justify-center h-[400px]" style={{ color: 'var(--color-text-muted)' }}>
                    <p>点击「生成摘要」获取视频内容总结</p>
                  </div>
                )}
                {summaryCard.status === 'loading' && (
                  <div className="flex items-center justify-center h-[400px]">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2" style={{ borderColor: 'var(--color-primary)' }}></div>
                  </div>
                )}
                {summaryCard.status === 'done' && (
                  <div style={{ color: 'var(--color-text-primary)' }}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{summaryCard.content}</ReactMarkdown>
                  </div>
                )}
                {summaryCard.status === 'error' && (
                  <div style={{ color: 'var(--color-error)' }}>生成失败: {summaryCard.error}</div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'titleinfo' && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>📄 标题信息</h2>
              <div className="rounded-lg p-6 space-y-4" style={{ backgroundColor: 'var(--color-surface-light)' }}>
                <div>
                  <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>视频标题</span>
                  <p className="font-medium" style={{ color: 'var(--color-text-primary)' }}>{videoInfo.title}</p>
                </div>
                {videoInfo.uploader && (
                  <div>
                    <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>上传者</span>
                    <p style={{ color: 'var(--color-text-secondary)' }}>👤 {videoInfo.uploader}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'mindmap' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>🧠 思维导图</h2>
                <div className="flex gap-2">
                  <button onClick={() => setIsMindmapFullscreen(true)} disabled={mindmapCard.status !== 'done'} className="btn-secondary">🔍 全屏</button>
                  <button onClick={handleGenerateMindmap} disabled={mindmapCard.status === 'loading'} className="btn-primary">
                    {mindmapCard.status === 'loading' ? '生成中...' : '生成导图'}
                  </button>
                </div>
              </div>
              <div className="rounded-lg p-6 min-h-[400px]" style={{ backgroundColor: 'var(--color-surface-light)' }}>
                {mindmapCard.status === 'idle' && (
                  <div className="flex flex-col items-center justify-center h-[400px]" style={{ color: 'var(--color-text-muted)' }}>
                    <p>点击「生成导图」获取视频知识结构</p>
                  </div>
                )}
                {mindmapCard.status === 'done' && <div ref={mindmapRef}><MindmapGraph content={mindmapCard.content} /></div>}
              </div>
              {mindmapCard.status === 'done' && (
                <div className="flex gap-2 justify-end">
                  <button onClick={exportMindmapPNG} className="btn-primary" style={{ background: 'linear-gradient(135deg, var(--color-success) 0%, #34d399 100%)' }}>📷 PNG</button>
                  <button onClick={exportMindmapSVG} className="btn-primary" style={{ background: 'linear-gradient(135deg, var(--color-warning) 0%, #fbbf24 100%)' }}>📐 SVG</button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'chat' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>💬 AI 问答</h2>
                <button onClick={() => { setChatHistory([]); setChatCard({ status: 'idle', content: '' }); }} disabled={chatHistory.length === 0} className="btn-secondary">🗑️ 清空</button>
              </div>
              <div className="rounded-lg p-4 h-[300px] overflow-y-auto" style={{ backgroundColor: 'var(--color-surface-light)' }}>
                {chatHistory.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full" style={{ color: 'var(--color-text-muted)' }}>
                    <p>开始和 AI 讨论这个视频吧</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {chatHistory.map((msg, idx) => (
                      <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className="max-w-[80%] p-3 rounded-xl" style={{ backgroundColor: msg.role === 'user' ? 'var(--color-primary)' : 'var(--color-surface-dark)', color: msg.role === 'user' ? '#fff' : 'var(--color-text-primary)' }}>
                          <p className="text-xs opacity-70">{msg.role === 'user' ? '你' : 'AI'}</p>
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleSendChat()} placeholder="输入你的问题..." className="input-glow flex-1" disabled={chatCard.status === 'loading'} />
                <button onClick={handleSendChat} disabled={chatCard.status === 'loading' || !chatInput.trim()} className="btn-primary">{chatCard.status === 'loading' ? '...' : '发送'}</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {isMindmapFullscreen && (
        <div className="fixed inset-0 bg-black/90 z-50 flex flex-col" onClick={() => setIsMindmapFullscreen(false)}>
          <div className="flex items-center justify-between p-4" style={{ backgroundColor: 'var(--color-surface)' }}>
            <h3 className="font-bold" style={{ color: 'var(--color-text-primary)' }}>🧠 思维导图</h3>
            <button onClick={() => setIsMindmapFullscreen(false)} className="btn-secondary">✕ 关闭</button>
          </div>
          <div className="flex-1 p-8 overflow-auto" onClick={(e) => e.stopPropagation()}>
            {mindmapCard.content && <div ref={mindmapRef} className="mx-auto max-w-4xl" style={{ backgroundColor: 'var(--color-surface)' }}><MindmapGraph content={mindmapCard.content} /></div>}
          </div>
        </div>
      )}
    </div>
  );
}
