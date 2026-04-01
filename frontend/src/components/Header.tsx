import { useNavigate, useLocation } from 'react-router-dom';

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const isHome = location.pathname === '/';

  return (
    <header className="glass-card px-6 py-4 flex items-center justify-between mb-6">
      <div className="flex items-center gap-3 cursor-pointer" onClick={() => !isHome && navigate('/')}>
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary-light flex items-center justify-center shadow-lg">
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
        </div>
        <div>
          <div className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>万能视频下载</div>
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>视频下载 & AI 总结</p>
        </div>
      </div>

      <nav className="flex items-center gap-2">
        {/* GEO: FAQ 和教程入口 */}
        <button
          onClick={() => navigate('/tutorial')}
          className="text-sm px-3 py-1.5 rounded-lg transition-colors hidden sm:flex items-center gap-1"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          📖 教程
        </button>
        <button
          onClick={() => navigate('/faq')}
          className="text-sm px-3 py-1.5 rounded-lg transition-colors hidden sm:flex items-center gap-1"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          ❓ 帮助
        </button>
        
        {!isHome && (
          <button
            onClick={() => navigate('/')}
            className="btn-secondary text-sm flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            新建任务
          </button>
        )}
      </nav>
    </header>
  );
}