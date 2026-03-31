import type { DownloadTask } from '../types';

interface ProgressCardProps {
  task: DownloadTask;
}

const statusConfig = {
  pending: {
    label: '等待中',
    color: 'var(--color-text-muted)',
    bgColor: 'rgba(148, 163, 184, 0.1)',
  },
  downloading: {
    label: '下载中',
    color: 'var(--color-primary)',
    bgColor: 'rgba(59, 130, 246, 0.1)',
  },
  completed: {
    label: '已完成',
    color: 'var(--color-success)',
    bgColor: 'rgba(34, 197, 94, 0.1)',
  },
  error: {
    label: '失败',
    color: 'var(--color-error)',
    bgColor: 'rgba(239, 68, 68, 0.1)',
  },
};

export default function ProgressCard({ task }: ProgressCardProps) {
  const config = statusConfig[task.status];

  return (
    <div className="glass-card p-5 animate-slide-up">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate pr-4" style={{ color: 'var(--color-text-primary)' }}>
            {task.title || task.url}
          </p>
          <p className="text-xs truncate mt-1 font-mono" style={{ color: 'var(--color-text-muted)' }}>
            {task.url}
          </p>
        </div>
        <span 
          className="flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium"
          style={{ color: config.color, backgroundColor: config.bgColor }}
        >
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
            <span className="font-mono" style={{ color: 'var(--color-primary)' }}>{task.progress.toFixed(1)}%</span>
            {task.speed && (
              <span style={{ color: 'var(--color-text-muted)' }}>{task.speed}</span>
            )}
            {task.eta && (
              <span style={{ color: 'var(--color-text-muted)' }}>剩余 {task.eta}</span>
            )}
          </div>
        </>
      )}

      {task.status === 'completed' && (
        <div className="flex items-center gap-2" style={{ color: 'var(--color-success)' }}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-sm">下载完成</span>
        </div>
      )}

      {task.status === 'error' && (
        <div className="p-3 rounded-lg" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)' }}>
          <p className="text-sm" style={{ color: 'var(--color-error)' }}>{task.error || '下载失败'}</p>
        </div>
      )}
    </div>
  );
}
