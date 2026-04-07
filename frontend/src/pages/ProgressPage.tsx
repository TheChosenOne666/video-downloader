import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import Header from '../components/Header';
import SEO from '../components/SEO';
import { seoConfig } from '../config/seo';
import { getTaskStatus } from '../services/api';
import { checkDownloadLimit } from '../services/membership';
import type { DownloadTask } from '../types';

export default function ProgressPage() {
  const { taskId, urls, videoInfos, tasks, completedFiles, updateTasks, downloadFile, reset, userInfo, downloadLimit, setDownloadLimitCtx } = useApp();
  const navigate = useNavigate();
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const urlsRef = useRef(urls);
  const videoInfosRef = useRef(videoInfos);
  const doneRef = useRef(false);
  const [limitReached, setLimitReached] = useState(false);
  const prevCompletedCount = useRef(0);

  // 保持 ref 同步（避免闭包陷阱）
  urlsRef.current = urls;
  videoInfosRef.current = videoInfos;

  // 初始化加载次数（页面挂载时和 userInfo 变化时都刷新）
  useEffect(() => {
    if (userInfo) {
      console.log('[ProgressPage] Refreshing download limit...');
      checkDownloadLimit().then(data => {
        console.log('[ProgressPage] Download limit:', data);
        setDownloadLimitCtx(data);
      }).catch(err => {
        console.error('[ProgressPage] Failed to refresh:', err);
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userInfo]);

  // 轮询逻辑
  useEffect(() => {
    if (!taskId) return;
    doneRef.current = false;
    prevCompletedCount.current = 0;

    const poll = async () => {
      if (doneRef.current) return;
      try {
        const status = await getTaskStatus(taskId);
        console.log('[ProgressPage] Status:', status.status, 'completed:', status.completed, '/', status.total);

        const newTasks: DownloadTask[] = (status.items || []).map((item, i) => ({
          taskId,
          url: item.url || urlsRef.current[i],
          title: item.title || videoInfosRef.current[i]?.title || '未知标题',
          status: item.status === 'failed' ? 'error' : item.status,
          progress: item.progress || 0,
          filename: item.filename,
          error: item.error,
        }));

        const newCompleted = (status.items || [])
          .filter(item => (item.status === 'completed') && item.filename)
          .map(item => ({ filename: item.filename!, title: item.title }));

        updateTasks(newTasks, newCompleted);

        // 每完成一个视频就刷新次数
        const completedCount = status.items.filter((item: any) => item.status === 'completed').length;
        console.log('[ProgressPage] Check refresh:', { completedCount, prev: prevCompletedCount.current, items: status.items.map((i: any) => i.status) });
        if (completedCount > prevCompletedCount.current) {
          prevCompletedCount.current = completedCount;
          console.log('[ProgressPage] Refreshing download limit...');
          // 刷新次数（无论是否为VIP，都更新状态）
          const newLimit = await checkDownloadLimit();
          console.log('[ProgressPage] New limit:', newLimit);
          setDownloadLimitCtx(newLimit);
          console.log('[ProgressPage] Limit updated in context');
          // 非VIP用户：次数用完时停止轮询
          if (!newLimit.is_vip && !newLimit.can_download) {
            setLimitReached(true);
            doneRef.current = true;
            if (pollRef.current) {
              clearInterval(pollRef.current);
              pollRef.current = null;
            }
          }
        }

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
  }, [taskId, updateTasks, downloadLimit?.is_vip]);

  // 没有 taskId 且没有 urls 时跳转首页（说明用户直接访问了这个页面）
  useEffect(() => {
    if (!taskId && urls.length === 0) {
      reset();
    }
  }, [taskId, urls.length, reset]);

  const completedCount = tasks.filter(t => t.status === 'completed').length;
  const totalCount = tasks.length || urls.length || 1;
  const overallProgress = tasks.length > 0
    ? tasks.reduce((acc, t) => acc + t.progress, 0) / tasks.length
    : 0;
  const allDone = completedCount >= totalCount && totalCount > 0;

  return (
    <div className="min-h-screen flex flex-col">
      <SEO config={seoConfig['/progress']} />
      <Header />

      <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl">
        {/* 次数用完提醒 */}
        {limitReached && (
          <div className="glass-card p-5 mb-6 flex items-center gap-4 animate-slide-up rounded-2xl"
               style={{ background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(168, 85, 247, 0.08) 100%)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
            <span className="text-2xl">🔒</span>
            <div className="flex-1">
              <p className="font-semibold" style={{ color: '#ef4444' }}>今日免费下载次数已用完</p>
              <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>剩余视频无法继续下载，开通VIP会员即可无限次下载</p>
            </div>
            <button
              onClick={() => navigate('/pricing')}
              className="px-5 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:scale-105"
              style={{ background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-purple) 100%)', boxShadow: '0 2px 8px rgba(59, 130, 246, 0.3)' }}
            >
              开通VIP会员
            </button>
          </div>
        )}

        {/* 次数进度条 */}
        {!limitReached && downloadLimit && !downloadLimit.is_vip && downloadLimit.daily_limit > 0 && (
          <div className="mb-6 px-5 py-3 rounded-2xl animate-slide-up"
               style={{ background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.06) 0%, rgba(168, 85, 247, 0.06) 100%)', border: '1px solid rgba(168, 85, 247, 0.15)' }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>今日免费下载次数</span>
              <span className="text-sm font-bold" style={{ color: '#a855f7' }}>
                剩余 {Math.max(0, downloadLimit.daily_limit - downloadLimit.daily_used).toString().padStart(2, '0')} 次
              </span>
            </div>
            <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--color-surface-dark)' }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(100, ((downloadLimit.daily_limit - downloadLimit.daily_used) / downloadLimit.daily_limit) * 100)}%`,
                  background: 'linear-gradient(90deg, var(--color-primary) 0%, #a855f7 100%)'
                }}
              />
            </div>
          </div>
        )}

        {/* 过期提醒 */}
        {allDone && (
          <div className="glass-card p-4 mb-6 flex items-center gap-3 animate-slide-up" 
               style={{ backgroundColor: 'rgba(251, 191, 36, 0.1)', border: '1px solid rgba(251, 191, 36, 0.3)' }}>
            <span className="text-2xl">⚠️</span>
            <p className="text-sm font-medium" style={{ color: '#d97706' }}>
              文件将在 <strong>7 天后过期删除</strong>，请及时下载到本地！
            </p>
          </div>
        )}

        {/* Progress Summary */}
        <div className="glass-card p-6 mb-8 animate-slide-up">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>下载进度</h1>
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
            <h2 className="font-bold mb-4" style={{ color: 'var(--color-text-primary)' }}>
              ✅ 全部下载完成！共 {completedFiles.length} 个文件
            </h2>
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
