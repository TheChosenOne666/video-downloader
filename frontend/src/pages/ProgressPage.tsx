import { useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import Header from '../components/Header';
import { getTaskStatus } from '../services/api';
import type { DownloadTask } from '../types';

export default function ProgressPage() {
  const { taskId, urls, videoInfos, tasks, completedFiles, updateTasks, downloadFile, setPage, reset } = useApp();
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const urlsRef = useRef(urls);
  const videoInfosRef = useRef(videoInfos);
  const doneRef = useRef(false);

  // 保持 ref 同步（避免闭包陷阱）
  urlsRef.current = urls;
  videoInfosRef.current = videoInfos;

  // 轮询逻辑
  useEffect(() => {
    if (!taskId) return;
    doneRef.current = false;

    const poll = async () => {
      if (doneRef.current) return;
      try {
        const status = await getTaskStatus(taskId);
        console.log('[ProgressPage] Status:', status.status, 'completed:', status.completed, '/', status.total);

        const newTasks: DownloadTask[] = (status.videos || []).map((item, i) => ({
          taskId,
          url: item.url || urlsRef.current[i],
          title: item.title || videoInfosRef.current[i]?.title || '未知标题',
          status: item.status === 'failed' ? 'error' : item.status,
          progress: item.progress || 0,
          filename: item.filename,
          error: item.error,
        }));

        const newCompleted = (status.videos || [])
          .filter(item => (item.status === 'completed') && item.filename)
          .map(item => ({ filename: item.filename!, title: item.title }));

        updateTasks(newTasks, newCompleted);

        // 全部完成
        if (status.status === 'completed' || status.status === 'failed' || status.completed >= status.total) {
          doneRef.current = true;
          if (pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
          }
          console.log('[ProgressPage] Polling stopped - task finished');
        }
      } catch (err) {
        console.error('[ProgressPage] Poll error:', err);
      }
    };

    // 立即执行一次
    poll();
    pollRef.current = setInterval(poll, 500);

    return () => {
      doneRef.current = true;
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [taskId, updateTasks]);

  // 没有 taskId 时跳转首页
  useEffect(() => {
    if (!taskId) setPage('home');
  }, [taskId, setPage]);

  const completedCount = tasks.filter(t => t.status === 'completed').length;
  const totalCount = tasks.length || urls.length || 1;
  const overallProgress = tasks.length > 0
    ? tasks.reduce((acc, t) => acc + t.progress, 0) / tasks.length
    : 0;
  const allDone = completedCount >= totalCount && totalCount > 0;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl">
        {/* Progress Summary */}
        <div className="glass-card p-6 mb-8 animate-slide-up">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>下载进度</h2>
              <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
                任务 ID: <span className="font-mono" style={{ color: 'var(--color-primary)' }}>{taskId?.slice(0, 8)}...</span>
              </p>
            </div>
            <div className="text-right">
              <span className="text-3xl font-bold text-gradient">{completedCount}/{totalCount}</span>
              <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>已完成</p>
            </div>
          </div>

          <div className="progress-bar h-3">
            <div className="progress-fill" style={{ width: `${overallProgress}%` }} />
          </div>
          <div className="flex justify-between mt-2 text-sm" style={{ color: 'var(--color-text-muted)' }}>
            <span>{overallProgress.toFixed(1)}%</span>
            <span>{allDone ? '🎉 下载完成！点击下方按钮下载到本地' : '下载中...'}</span>
          </div>
        </div>

        {/* Task List */}
        <div className="space-y-4">
          {tasks.map((task, index) => (
            <div key={index} className="glass-card p-5 animate-slide-up">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate pr-4" style={{ color: 'var(--color-text-primary)' }}>
                    {task.title || task.url}
                  </p>
                  <p className="text-xs truncate mt-1 font-mono" style={{ color: 'var(--color-text-muted)' }}>
                    {task.filename || task.url}
                  </p>
                </div>
                <span
                  className="flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium"
                  style={{
                    color: task.status === 'completed' ? 'var(--color-success)' :
                      task.status === 'downloading' ? 'var(--color-primary)' :
                      task.status === 'error' ? 'var(--color-error)' : 'var(--color-text-muted)',
                    backgroundColor: task.status === 'completed' ? 'rgba(34, 197, 94, 0.1)' :
                      task.status === 'downloading' ? 'rgba(59, 130, 246, 0.1)' :
                      task.status === 'error' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(148, 163, 184, 0.1)'
                  }}
                >
                  {task.status === 'completed' ? '已完成' :
                    task.status === 'downloading' ? '下载中' :
                    task.status === 'error' ? '失败' : '等待中'}
                </span>
              </div>

              {task.status === 'downloading' && (
                <div className="progress-bar mb-2">
                  <div className="progress-fill" style={{ width: `${task.progress}%` }} />
                </div>
              )}

              {task.status === 'completed' && task.filename && (
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-sm" style={{ color: 'var(--color-success)' }}>✓ 文件已就绪</span>
                  <button
                    onClick={() => downloadFile(task.filename!)}
                    className="btn-primary text-sm py-2 px-4"
                  >
                    📥 下载到本地
                  </button>
                </div>
              )}

              {task.status === 'error' && (
                <div className="p-3 rounded-lg mt-2" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)' }}>
                  <p className="text-sm" style={{ color: 'var(--color-error)' }}>{task.error || '下载失败'}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Download All */}
        {completedFiles.length > 0 && (
          <div className="mt-8 glass-card p-6 text-center animate-slide-up">
            <h3 className="font-bold mb-4" style={{ color: 'var(--color-text-primary)' }}>
              ✅ 全部下载完成！共 {completedFiles.length} 个文件
            </h3>
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => completedFiles.forEach(f => downloadFile(f.filename))}
                className="btn-primary px-8"
              >
                📥 全部下载到本地
              </button>
              <button
                onClick={() => { reset(); }}
                className="btn-secondary px-8"
              >
                新建任务
              </button>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="mt-8 grid grid-cols-3 gap-4">
          <div className="glass-card p-4 text-center">
            <div className="text-2xl font-bold" style={{ color: 'var(--color-primary)' }}>
              {tasks.filter(t => t.status === 'downloading').length}
            </div>
            <div className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>正在下载</div>
          </div>
          <div className="glass-card p-4 text-center">
            <div className="text-2xl font-bold" style={{ color: 'var(--color-success)' }}>
              {completedCount}
            </div>
            <div className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>已完成</div>
          </div>
          <div className="glass-card p-4 text-center">
            <div className="text-2xl font-bold" style={{ color: 'var(--color-error)' }}>
              {tasks.filter(t => t.status === 'error').length}
            </div>
            <div className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>失败</div>
          </div>
        </div>
      </main>
    </div>
  );
}
