import { useState } from 'react';
import { useApp } from '../context/AppContext';
import Header from '../components/Header';
import SuccessAnimation from '../components/SuccessAnimation';
import { getDownloadUrl } from '../services/api';

export default function CompletePage() {
  const { tasks, completedFiles, taskId, reset, setPage } = useApp();
  const [showAnimation, setShowAnimation] = useState(true);

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

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl">
        {/* Success Header */}
        <div className="glass-card p-6 mb-8 text-center animate-slide-up">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center mx-auto mb-4 shadow-lg">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">全部下载完成！</h2>
          <p className="text-gray-400">
            成功下载 {completedFiles.length} 个文件
          </p>
        </div>

        {/* File List */}
        <div className="glass-card overflow-hidden animate-slide-up">
          <div className="p-4 border-b border-surface-lighter flex items-center justify-between">
            <h3 className="font-semibold text-white">下载文件</h3>
            {completedFiles.length > 1 && (
              <button
                onClick={handleDownloadAll}
                className="btn-secondary text-sm flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                全部下载
              </button>
            )}
          </div>

          <div className="divide-y divide-surface-lighter">
            {completedFiles.map((file, index) => (
              <div 
                key={index}
                className="p-4 flex items-center justify-between hover:bg-surface-light/50 transition-colors"
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-gold/20 to-gold/5 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-white truncate">
                      {file.title || file.filename}
                    </p>
                    <p className="text-xs text-gray-500 font-mono truncate">
                      {file.filename}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleDownload(file.filename)}
                  className="ml-4 px-4 py-2 bg-gold/20 text-gold rounded-lg hover:bg-gold/30 transition-colors flex items-center gap-2 flex-shrink-0"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  下载
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Error Files */}
        {tasks.some(t => t.status === 'error') && (
          <div className="mt-6 glass-card p-6 animate-slide-up">
            <h3 className="font-semibold text-red-400 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              下载失败 ({tasks.filter(t => t.status === 'error').length})
            </h3>
            <div className="space-y-3">
              {tasks.filter(t => t.status === 'error').map((task, index) => (
                <div key={index} className="p-3 bg-red-500/10 rounded-lg">
                  <p className="text-sm text-gray-300 truncate">{task.url}</p>
                  <p className="text-xs text-red-400 mt-1">{task.error || '下载失败'}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="mt-8 flex flex-col sm:flex-row gap-4 animate-slide-up">
          <button
            onClick={() => setPage('home')}
            className="btn-secondary flex-1 flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            新建任务
          </button>
          <button
            onClick={reset}
            className="btn-primary flex-1 flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            重新开始
          </button>
        </div>
      </main>

      <footer className="py-6 text-center text-gray-500 text-sm">
        <p>VideoGrab © 2026 · 本地处理，保护隐私</p>
      </footer>
    </div>
  );
}
