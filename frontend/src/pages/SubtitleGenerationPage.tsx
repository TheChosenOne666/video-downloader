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

  // Poll for task status
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
    }, 1000); // Poll every second

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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <Header />
      
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            🎬 AI 字幕生成
          </h1>
          <p className="text-slate-400">
            为没有字幕的视频自动生成字幕，支持多语言和格式
          </p>
        </div>

        {/* Input Section */}
        {!taskId && (
          <div className="bg-slate-800 rounded-lg p-6 mb-6 border border-slate-700">
            <div className="space-y-4">
              {/* Video URL Input */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  视频链接
                </label>
                <input
                  type="text"
                  value={videoInput || videoUrl || ''}
                  onChange={(e) => setVideoInput(e.target.value)}
                  placeholder="输入视频链接（B站、抖音、YouTube等）"
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Language Selection */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  语言
                </label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="zh">中文</option>
                  <option value="en">English</option>
                  <option value="ja">日本語</option>
                  <option value="ko">한국어</option>
                  <option value="es">Español</option>
                  <option value="fr">Français</option>
                </select>
              </div>

              {/* Subtitle Format */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  字幕格式
                </label>
                <select
                  value={subtitleFormat}
                  onChange={(e) => setSubtitleFormat(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="srt">SRT (标准格式)</option>
                  <option value="vtt">WebVTT</option>
                  <option value="json">JSON</option>
                </select>
              </div>

              {/* Options */}
              <div className="space-y-3">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hardcode}
                    onChange={(e) => setHardcode(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-600 text-blue-500 focus:ring-blue-500"
                  />
                  <span className="text-slate-300">
                    硬编码字幕到视频（重新编码，文件较大）
                  </span>
                </label>

                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={softSubtitles}
                    onChange={(e) => setSoftSubtitles(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-600 text-blue-500 focus:ring-blue-500"
                  />
                  <span className="text-slate-300">
                    添加软字幕（MP4格式，可选择显示/隐藏）
                  </span>
                </label>
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-900/20 border border-red-700 rounded-lg p-3 text-red-300 text-sm">
                  {error}
                </div>
              )}

              {/* Generate Button */}
              <button
                onClick={handleGenerateSubtitles}
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-slate-600 disabled:to-slate-700 text-white font-semibold py-3 rounded-lg transition-all duration-200 transform hover:scale-105 disabled:scale-100"
              >
                {loading ? '处理中...' : '生成字幕'}
              </button>
            </div>
          </div>
        )}

        {/* Progress Section */}
        {loading && (
          <div className="bg-slate-800 rounded-lg p-6 mb-6 border border-slate-700">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-slate-300 font-medium">处理进度</span>
                <span className="text-blue-400 font-semibold">{Math.round(progress)}%</span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-blue-500 to-blue-600 h-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-slate-400 text-sm">
                {progress < 30 && '正在下载视频...'}
                {progress >= 30 && progress < 60 && '正在提取音频和识别字幕...'}
                {progress >= 60 && progress < 90 && '正在处理字幕...'}
                {progress >= 90 && '即将完成...'}
              </p>
            </div>
          </div>
        )}

        {/* Result Section */}
        {result && !loading && (
          <div className="space-y-6">
            {/* Video Info */}
            {result.video_info && (
              <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                <h2 className="text-xl font-bold text-white mb-4">视频信息</h2>
                <div className="space-y-2">
                  <p className="text-slate-300">
                    <span className="font-semibold">标题：</span> {result.video_info.title}
                  </p>
                  {result.video_info.uploader && (
                    <p className="text-slate-300">
                      <span className="font-semibold">上传者：</span> {result.video_info.uploader}
                    </p>
                  )}
                  {result.video_info.duration && (
                    <p className="text-slate-300">
                      <span className="font-semibold">时长：</span>{' '}
                      {Math.floor(result.video_info.duration / 60)}分{result.video_info.duration % 60}秒
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Status */}
            <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
              <div className="flex items-center space-x-3">
                {result.status === 'completed' && (
                  <>
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-green-400 font-semibold">生成成功！</span>
                  </>
                )}
                {result.status === 'failed' && (
                  <>
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <span className="text-red-400 font-semibold">生成失败</span>
                  </>
                )}
              </div>
              {result.error && (
                <p className="text-red-300 text-sm mt-2">{result.error}</p>
              )}
            </div>

            {/* Subtitle Preview */}
            {result.subtitle_text && (
              <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                <h2 className="text-xl font-bold text-white mb-4">字幕预览</h2>
                <div className="bg-slate-900 rounded-lg p-4 max-h-64 overflow-y-auto">
                  <pre className="text-slate-300 text-sm whitespace-pre-wrap break-words font-mono">
                    {result.subtitle_text.slice(0, 500)}
                    {result.subtitle_text.length > 500 && '...'}
                  </pre>
                </div>
              </div>
            )}

            {/* Download Buttons */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {result.subtitle_url && (
                <button
                  onClick={downloadSubtitle}
                  className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold py-3 rounded-lg transition-all duration-200 transform hover:scale-105"
                >
                  📥 下载字幕文件
                </button>
              )}
              {result.video_with_subtitles_url && (
                <button
                  onClick={downloadVideoWithSubtitles}
                  className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-semibold py-3 rounded-lg transition-all duration-200 transform hover:scale-105"
                >
                  🎬 下载带字幕视频
                </button>
              )}
            </div>

            {/* Reset Button */}
            <button
              onClick={() => {
                setTaskId(null);
                setResult(null);
                setVideoInput('');
                setError(null);
              }}
              className="w-full bg-slate-700 hover:bg-slate-600 text-white font-semibold py-2 rounded-lg transition-all duration-200"
            >
              ← 返回
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
