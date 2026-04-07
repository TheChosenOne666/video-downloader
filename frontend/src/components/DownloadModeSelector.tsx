/** DownloadModeSelector — 让用户选择下载原视频还是带字幕的视频
 * 带字幕功能仅VIP可用
 */

import { useApp } from '../context/AppContext';

export default function DownloadModeSelector() {
  const { downloadMode, setDownloadMode, userInfo } = useApp();
  const isVip = userInfo?.role === 'vip' || userInfo?.role === 'admin';

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>字幕选项</span>
        <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>(需要 FFmpeg + Whisper)</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* 原视频 */}
        <button
          onClick={() => setDownloadMode('original')}
          className="relative p-4 rounded-xl border-2 transition-all duration-200 text-left"
          style={{ 
            borderColor: downloadMode === 'original' ? 'var(--color-primary)' : 'var(--color-surface-dark)',
            backgroundColor: downloadMode === 'original' ? 'rgba(59, 130, 246, 0.05)' : 'var(--color-surface-light)'
          }}
        >
          {downloadMode === 'original' && (
            <div className="absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--color-primary)' }}>
              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          )}
          <span className="text-xl mb-2 block">🎬</span>
          <span className="block font-medium text-sm" style={{ color: 'var(--color-text-primary)' }}>原视频</span>
          <span className="block text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>下载原始视频文件</span>
        </button>

        {/* 带字幕 - 仅VIP */}
        <button
          onClick={() => {
            if (!isVip) {
              if (confirm('带字幕下载功能仅VIP会员可用，是否开通VIP会员？')) {
                window.location.href = '/pricing';
              }
              return;
            }
            setDownloadMode('subtitled');
          }}
          className="relative p-4 rounded-xl border-2 transition-all duration-200 text-left"
          style={{ 
            borderColor: !isVip ? 'var(--color-surface-dark)' : (downloadMode === 'subtitled' ? 'var(--color-purple)' : 'var(--color-surface-dark)'),
            backgroundColor: !isVip ? 'var(--color-surface-light)' : (downloadMode === 'subtitled' ? 'rgba(168, 85, 247, 0.05)' : 'var(--color-surface-light)'),
            opacity: !isVip ? 0.7 : 1
          }}
        >
          {downloadMode === 'subtitled' && isVip && (
            <div className="absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--color-purple)' }}>
              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          )}
          
          {/* VIP 锁标识 */}
          {!isVip && (
            <div className="absolute top-2 right-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#a855f7' }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
          )}
          
          <span className="text-xl mb-2 block">🎬💬</span>
          <span className="block font-medium text-sm" style={{ color: 'var(--color-text-primary)' }}>带字幕</span>
          {!isVip ? (
            <span className="block text-xs mt-1" style={{ color: '#a855f7' }}>VIP专属功能 🔒</span>
          ) : (
            <span className="block text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>AI 识别并烧录字幕到视频</span>
          )}
        </button>
      </div>

      {downloadMode === 'subtitled' && isVip && (
        <div className="rounded-lg px-4 py-3 text-xs" style={{ backgroundColor: 'rgba(168, 85, 247, 0.1)', border: '1px solid rgba(168, 85, 247, 0.2)', color: 'var(--color-purple)' }}>
          💡 首次使用需要下载 Whisper AI 模型（约 140MB），请耐心等待。带字幕视频下载时间会更长。
        </div>
      )}
    </div>
  );
}
