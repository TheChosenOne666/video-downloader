import type { DownloadTask } from '../types';

interface ProgressCardProps {
  task: DownloadTask;
}

const statusConfig = {
  pending: {
    label: '等待中',
    color: 'text-gray-400',
    bgColor: 'bg-gray-500',
  },
  downloading: {
    label: '下载中',
    color: 'text-gold',
    bgColor: 'bg-gold',
  },
  completed: {
    label: '已完成',
    color: 'text-green-400',
    bgColor: 'bg-green-500',
  },
  error: {
    label: '失败',
    color: 'text-red-400',
    bgColor: 'bg-red-500',
  },
};

export default function ProgressCard({ task }: ProgressCardProps) {
  const config = statusConfig[task.status];

  return (
    <div className="glass-card p-5 animate-slide-up">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-white truncate pr-4">
            {task.title || task.url}
          </p>
          <p className="text-xs text-gray-500 truncate mt-1 font-mono">
            {task.url}
          </p>
        </div>
        <span className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium ${config.color} bg-current/10`}>
          {config.label}
        </span>
      </div>

      {task.status === 'downloading' && (
        <>
          <div className="progress-bar mb-3">
            <div 
              className="progress-fill"
              style={{ width: `${task.progress}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gold font-mono">{task.progress.toFixed(1)}%</span>
            {task.speed && (
              <span className="text-gray-500">{task.speed}</span>
            )}
            {task.eta && (
              <span className="text-gray-500">剩余 {task.eta}</span>
            )}
          </div>
        </>
      )}

      {task.status === 'completed' && (
        <div className="flex items-center gap-2 text-green-400">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-sm">下载完成</span>
        </div>
      )}

      {task.status === 'error' && (
        <div className="p-3 bg-red-500/10 rounded-lg">
          <p className="text-sm text-red-400">{task.error || '下载失败'}</p>
        </div>
      )}
    </div>
  );
}
