import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import Header from '../components/Header';
import SuccessAnimation from '../components/SuccessAnimation';
import { getDownloadUrl } from '../services/api';

const API_BASE = 'http://localhost:8000';

interface SubtitleTask {
  task_id: string;
  status: string;
  progress: number;
  subtitle_url?: string;
  video_with_subtitles_url?: string;
  error?: string;
}

export default function CompletePage() {
  const { tasks, completedFiles: contextCompletedFiles, taskId, reset, setPage, downloadMode } = useApp();
  
  // 合并 context 中的 completedFiles 和 tasks 中已完成的任务
  const completedFiles = contextCompletedFiles.length > 0 
    ? contextCompletedFiles 
    : tasks.filter(t => t.status === 'completed' && t.filename).map(t => ({
        filename: t.filename!,
        title: t.title,
      }));
  
  console.log('CompletePage - completedFiles:', completedFiles);
  
  const [showAnimation, setShowAnimation] = useState(true);
  const [subtitleTaskId, setSubtitleTaskId] = useState<string | null>(null);
  const [subtitleTask, setSubtitleTask] = useState<SubtitleTask | null>(null);
  const [subtitleLoading, setSubtitleLoading] = useState(false);

  const handleDownload = (filename: string) => {
    if (!taskId) return;
    const url = getDownloadUrl(taskId, filename);
    window.open(url, '_blank');
  };

  const handleDownloadAll = () => {
    completedFiles.forEach(file => {
      handleDownload(file.filename);
    });
  };

  const handleGenerateSubtitle = async (videoUrl: string) => {
    setSubtitleLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/subtitle/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          video_url: videoUrl,
          language: 'zh',
          subtitle_format: 'srt',
          hardcode: true,
          soft_subtitles: false,
        }),
      });

      if (!response.ok) throw new Error('Failed to create subtitle task');
      const data = await response.json();
      setSubtitleTaskId(data.task_id);
    } catch (err) {
      console.error('Subtitle generation failed:', err);
      setSubtitleLoading(false);
    }
  };

  useEffect(() => {
    if (!subtitleTaskId) return;
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`${API_BASE}/api/subtitle/${subtitleTaskId}`);
        const data: SubtitleTask = await response.json();
        setSubtitleTask(data);
        if (data.status === 'completed' || data.status === 'failed') {
          clearInterval(interval);
          setSubtitleLoading(false);
        }
      } catch (err) {
        console.error('Poll error:', err);
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [subtitleTaskId]);

  const handleDownloadWithSubtitles = () => {
    if (subtitleTask?.video_with_subtitles_url) {
      window.open(`${API_BASE}${subtitleTask.video_with_subtitles_url}`, '_blank');
    }
  };

  if (showAnimation) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl flex items-center justify-center">
          <SuccessAnimation onComplete={() => setShowAnimation(false)} />
        </main>
      </div>
    );
  }

  const renderFileItem = (file: { filename: string; title?: string }, index: number) => {
    const isVideo = /\.(mp4|mkv|webm|avi|mov|m4v)$/i.test(file.filename);
    const originalUrl = tasks[index]?.url || '';
    
    return (
      <div key={index} className="p-4 transition-colors" style={{ backgroundColor: 'var(--color-surface)' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)' }}>
              <svg className="w-5 h-5" style={{ color: 'var(--color-primary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>{file.title || file.filename}</p>
              <p className="text-xs font-mono truncate" style={{ color: 'var(--color-text-muted)' }}>{file.filename}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 ml-4 flex-shrink-0">
            <button
              onClick={() => handleDownload(file.filename)}
              className="px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
              style={{ 
                backgroundColor: downloadMode === 'subtitled' ? 'rgba(168, 85, 247, 0.1)' : 'rgba(59, 130, 246, 0.1)', 
                color: downloadMode === 'subtitled' ? 'var(--color-purple)' : 'var(--color-primary)' 
              }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              {downloadMode === 'subtitled' ? '下载带字幕视频' : '下载原视频'}
            </button>
            
            {isVideo && originalUrl && !subtitleTaskId && (
              <button
                onClick={() => handleGenerateSubtitle(originalUrl)}
                disabled={subtitleLoading}
                className="px-4 py-2 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
                style={{ backgroundColor: 'rgba(168, 85, 247, 0.1)', color: 'var(--color-purple)' }}
              >
                生成字幕
              </button>
            )}
            
            {subtitleTaskId && subtitleTask?.status === 'processing' && (
              <span className="px-4 py-2 rounded-lg text-sm" style={{ backgroundColor: 'var(--color-surface-lighter)', color: 'var(--color-text-secondary)' }}>
                字幕生成中 {Math.round(subtitleTask.progress)}%
              </span>
            )}
            
            {subtitleTask?.status === 'completed' && subtitleTask.video_with_subtitles_url && (
              <button
                onClick={handleDownloadWithSubtitles}
                className="px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
                style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)', color: 'var(--color-success)' }}
              >
                下载带字幕视频
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl">
        <div className="glass-card p-6 mb-8 text-center animate-slide-up">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg" style={{ background: 'linear-gradient(135deg, var(--color-success) 0%, #34d399 100%)' }}>
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--color-text-primary)' }}>全部下载完成！</h2>
          <p style={{ color: 'var(--color-text-muted)' }}>成功下载 {completedFiles.length} 个文件</p>
        </div>

        <div className="glass-card overflow-hidden animate-slide-up">
          <div className="p-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--color-surface-dark)' }}>
            <h3 className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>下载文件</h3>
            {completedFiles.length > 1 && (
              <button onClick={handleDownloadAll} className="btn-secondary text-sm flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                全部下载
              </button>
            )}
          </div>

          <div className="divide-y" style={{ borderColor: 'var(--color-surface-dark)' }}>
            {completedFiles.length === 0 ? (
              <div className="p-8 text-center" style={{ color: 'var(--color-text-muted)' }}>
                <p>没有下载成功的文件</p>
              </div>
            ) : (
              completedFiles.map((file, index) => renderFileItem(file, index))
            )}
          </div>
        </div>

        {tasks.some(t => t.status === 'error') && (
          <div className="mt-6 glass-card p-6 animate-slide-up">
            <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--color-error)' }}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              下载失败 ({tasks.filter(t => t.status === 'error').length})
            </h3>
            <div className="space-y-3">
              {tasks.filter(t => t.status === 'error').map((task, index) => (
                <div key={index} className="p-3 rounded-lg" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)' }}>
                  <p className="text-sm truncate" style={{ color: 'var(--color-text-secondary)' }}>{task.url}</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--color-error)' }}>{task.error || '下载失败'}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-8 flex flex-col sm:flex-row gap-4 animate-slide-up">
          <button onClick={() => setPage('home')} className="btn-secondary flex-1 flex items-center justify-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            新建任务
          </button>
          <button onClick={reset} className="btn-primary flex-1 flex items-center justify-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            重新开始
          </button>
        </div>
      </main>
      <footer className="py-6 text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>
        <p>VideoGrab © 2026 · 本地处理，保护隐私</p>
      </footer>
    </div>
  );
}
