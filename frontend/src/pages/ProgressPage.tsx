import { useEffect } from 'react';
import { useApp } from '../context/AppContext';
import Header from '../components/Header';
import ProgressCard from '../components/ProgressCard';

export default function ProgressPage() {
  const { tasks, taskId, fetchStatus, page, setPage } = useApp();

  useEffect(() => {
    if (!taskId) {
      // No task ID, redirect to home
      setPage('home');
      return;
    }

    // 更快轮询（500ms）以显示实时进度
    const interval = setInterval(() => {
      fetchStatus();
    }, 500);

    return () => clearInterval(interval);
  }, [taskId, fetchStatus, setPage]);

  // Redirect if page changed to complete
  useEffect(() => {
    if (page === 'complete') {
      // Already on complete, no need to do anything
    }
  }, [page]);

  const completedCount = tasks.filter(t => t.status === 'completed').length;
  const totalCount = tasks.length;
  const overallProgress = totalCount > 0 
    ? tasks.reduce((acc, t) => acc + t.progress, 0) / totalCount 
    : 0;

  // Show loading state if no tasks yet
  if (tasks.length === 0) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl">
          <div className="glass-card p-6 mb-8 animate-slide-up">
            <div className="flex items-center justify-center py-8">
              <svg className="w-8 h-8 animate-spin text-gold" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span className="ml-3 text-gray-400">正在初始化下载任务...</span>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl">
        {/* Progress Summary */}
        <div className="glass-card p-6 mb-8 animate-slide-up">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-white">下载进度</h2>
              <p className="text-sm text-gray-500 mt-1">
                任务 ID: <span className="font-mono text-gold">{taskId}</span>
              </p>
            </div>
            <div className="text-right">
              <span className="text-3xl font-bold text-gradient">
                {completedCount}/{totalCount}
              </span>
              <p className="text-sm text-gray-500 mt-1">已完成</p>
            </div>
          </div>

          <div className="progress-bar h-3">
            <div 
              className="progress-fill"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
          <div className="flex justify-between mt-2 text-sm text-gray-500">
            <span>{overallProgress.toFixed(1)}%</span>
            <span>
              {completedCount === totalCount ? '🎉 即将完成' : '下载中...'}
            </span>
          </div>
        </div>

        {/* Task List */}
        <div className="space-y-4">
          {tasks.map((task, index) => (
            <ProgressCard key={index} task={task} />
          ))}
        </div>

        {/* Summary Stats */}
        <div className="mt-8 grid grid-cols-3 gap-4">
          <div className="glass-card p-4 text-center">
            <div className="text-2xl font-bold text-gold">
              {tasks.filter(t => t.status === 'downloading').length}
            </div>
            <div className="text-xs text-gray-500 mt-1">正在下载</div>
          </div>
          <div className="glass-card p-4 text-center">
            <div className="text-2xl font-bold text-green-400">
              {completedCount}
            </div>
            <div className="text-xs text-gray-500 mt-1">已完成</div>
          </div>
          <div className="glass-card p-4 text-center">
            <div className="text-2xl font-bold text-gray-400">
              {tasks.filter(t => t.status === 'pending').length}
            </div>
            <div className="text-xs text-gray-500 mt-1">等待中</div>
          </div>
        </div>
      </main>
    </div>
  );
}
