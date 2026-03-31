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

interface SubtitleGenerationResult {
  task_id: string;
  status: string;
  video_info?: VideoInfo;
  subtitle_text: string;
  subtitle_url?: string;
  video_with_subtitles_url?: string;
  progress: number;
  created_at: string;
  completed_at?: string;
  error?: string;
}

export default function SubtitleGenerationPage() {
  const { videoUrl } = useApp();
  const [videoInput, setVideoInput] = useState('');
  const [language, setLanguage] = useState('zh');
  const [hardcode, setHardcode] = useState(false);
  const [softSubtitles, setSoftSubtitles] = useState(false);
  const [subtitleFormat, setSubtitleFormat] = useState('srt');
  
  const [taskId, setTaskId] = useState<string | null>(null);
  const [result, setResult] = useState<SubtitleGenerationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!taskId) return;

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`${API_BASE}/api/subtitle/${taskId}`);
        if (!response.ok) throw new Error('Failed to fetch task status');

        const data: SubtitleGenerationResult = await response.json();
        setResult(data);
        setProgress(data.progress);

        if (data.status === 'completed' || data.status === 'failed') {
          clearInterval(pollInterval);
          setLoading(false);
          if (data.status === 'failed') {
            setError(data.error || 'Subtitle generation failed');
          }
        }
      } catch (err) {
        console.error('Poll error:', err);
      }
    }, 1000);

    return () => clearInterval(pollInterval);
  }, [taskId]);

  const handleGenerateSubtitles = async () => {
    const url = videoInput || videoUrl;
    if (!url) {
      setError('Please enter a video URL');
      return;
    }

    setLoading(true);
    setError(null);
    setProgress(0);

    try {
      const response = await fetch(`${API_BASE}/api/subtitle/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          video_url: url,
          language,
          subtitle_format: subtitleFormat,
          hardcode,
          soft_subtitles: softSubtitles,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const data = await response.json();
      setTaskId(data.task_id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setLoading(false);
    }
  };

  const downloadSubtitle = () => {
    if (result?.subtitle_url) {
      window.open(`${API_BASE}${result.subtitle_url}`, '_blank');
    }
  };

  const downloadVideoWithSubtitles = () => {
    if (result?.video_with_subtitles_url) {
      window.open(`${API_BASE}${result.video_with_subtitles_url}`, '_blank');
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <div className="max-w-4xl mx-auto px-4 py-8 flex-1">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2" style={{ color: 'var(--color-text-primary)' }}>
            🎬 AI 字幕生成
          </h1>
          <p style={{ color: 'var(--color-text-muted)' }}>
            为没有字幕的视频自动生成字幕，支持多语言和格式
          </p>
        </div>

        {!taskId && (
          <div className="glass-card p-6 mb-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>视频链接</label>
                <input
                  type="text"
                  value={videoInput || videoUrl || ''}
                  onChange={(e) => setVideoInput(e.target.value)}
                  placeholder="输入视频链接（B站、抖音、YouTube等）"
                  className="input-glow"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>语言</label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="input-glow"
                >
                  <option value="zh">中文</option>
                  <option value="en">English</option>
                  <option value="ja">日本語</option>
                  <option value="ko">한국어</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>字幕格式</label>
                <select
                  value={subtitleFormat}
                  onChange={(e) => setSubtitleFormat(e.target.value)}
                  className="input-glow"
                >
                  <option value="srt">SRT (标准格式)</option>
                  <option value="vtt">WebVTT</option>
                  <option value="json">JSON</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={hardcode} onChange={(e) => setHardcode(e.target.checked)} className="w-4 h-4" />
                  <span style={{ color: 'var(--color-text-secondary)' }}>硬编码字幕到视频（重新编码）</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={softSubtitles} onChange={(e) => setSoftSubtitles(e.target.checked)} className="w-4 h-4" />
                  <span style={{ color: 'var(--color-text-secondary)' }}>添加软字幕（可选择显示/隐藏）</span>
                </label>
              </div>

              {error && (
                <div className="p-3 rounded-lg text-sm" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--color-error)' }}>
                  {error}
                </div>
              )}

              <button
                onClick={handleGenerateSubtitles}
                disabled={loading}
                className="btn-primary w-full"
              >
                {loading ? '处理中...' : '生成字幕'}
              </button>
            </div>
          </div>
        )}

        {loading && (
          <div className="glass-card p-6 mb-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span style={{ color: 'var(--color-text-secondary)' }}>处理进度</span>
                <span style={{ color: 'var(--color-primary)' }}>{Math.round(progress)}%</span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${progress}%` }} />
              </div>
              <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                {progress < 30 && '正在下载视频...'}
                {progress >= 30 && progress < 60 && '正在提取音频和识别字幕...'}
                {progress >= 60 && progress < 90 && '正在处理字幕...'}
                {progress >= 90 && '即将完成...'}
              </p>
            </div>
          </div>
        )}

        {result && !loading && (
          <div className="space-y-6">
            <div className="glass-card p-6">
              <div className="flex items-center gap-3">
                {result.status === 'completed' && (
                  <>
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'var(--color-success)' }}></div>
                    <span style={{ color: 'var(--color-success)' }}>生成成功！</span>
                  </>
                )}
                {result.status === 'failed' && (
                  <>
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'var(--color-error)' }}></div>
                    <span style={{ color: 'var(--color-error)' }}>生成失败</span>
                  </>
                )}
              </div>
              {result.error && (
                <p className="text-sm mt-2" style={{ color: 'var(--color-error)' }}>{result.error}</p>
              )}
            </div>

            {result.video_info && (
              <div className="glass-card p-6">
                <h2 className="font-bold mb-4" style={{ color: 'var(--color-text-primary)' }}>视频信息</h2>
                <p style={{ color: 'var(--color-text-secondary)' }}>{result.video_info.title}</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {result.subtitle_url && (
                <button onClick={downloadSubtitle} className="btn-primary">
                  📥 下载字幕文件
                </button>
              )}
              {result.video_with_subtitles_url && (
                <button onClick={downloadVideoWithSubtitles} className="btn-primary" style={{ background: 'linear-gradient(135deg, var(--color-purple) 0%, #c084fc 100%)' }}>
                  🎬 下载带字幕视频
                </button>
              )}
            </div>

            <button
              onClick={() => { setTaskId(null); setResult(null); setVideoInput(''); setError(null); }}
              className="btn-secondary w-full"
            >
              ← 返回
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
