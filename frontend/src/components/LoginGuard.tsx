import { useNavigate } from 'react-router-dom';

interface LoginGuardProps {
  onClose: () => void;
}

/**
 * 未登录拦截弹窗
 * 当用户未登录时尝试使用功能，弹出此提示
 */
export default function LoginGuard({ onClose }: LoginGuardProps) {
  const navigate = useNavigate();

  const handleLogin = () => {
    onClose();
    navigate('/auth');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="glass-card p-8 w-full max-w-sm text-center animate-slide-up relative"
        style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}
      >
        {/* 关闭按钮 */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg transition-colors hover:bg-gray-100"
          style={{ color: 'var(--color-text-muted)' }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* 图标 */}
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
          style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.15) 0%, rgba(168,85,247,0.15) 100%)', border: '1px solid rgba(59,130,246,0.2)' }}
        >
          <svg className="w-8 h-8" style={{ color: 'var(--color-primary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>

        {/* 文字 */}
        <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--color-text-primary)' }}>
          请先登录
        </h3>
        <p className="text-sm mb-6 leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
          使用视频下载功能需要登录账号
          <br />
          登录后即可解锁全部功能
        </p>

        {/* 功能列表 */}
        <div
          className="text-left rounded-xl p-4 mb-6 space-y-2"
          style={{ backgroundColor: 'var(--color-surface-lighter)' }}
        >
          {[
            { icon: '📥', text: '高清视频下载' },
            { icon: '🤖', text: 'AI 视频总结' },
            { icon: '📝', text: '智能字幕生成' },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-3 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              <span>{item.icon}</span>
              <span>{item.text}</span>
              <svg className="w-4 h-4 ml-auto" style={{ color: 'var(--color-success)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          ))}
        </div>

        {/* 按钮 */}
        <button
          onClick={handleLogin}
          className="btn-primary w-full flex items-center justify-center gap-2 mb-3"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
          </svg>
          立即登录
        </button>
        <button
          onClick={onClose}
          className="w-full text-sm py-2 transition-colors"
          style={{ color: 'var(--color-text-muted)' }}
        >
          稍后再说
        </button>
      </div>
    </div>
  );
}
