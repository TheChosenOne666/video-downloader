import { useNavigate, useLocation } from 'react-router-dom';

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const isHome = location.pathname === '/';

  return (
    <header className="glass-card px-6 py-4 flex items-center justify-between mb-6 relative z-10">
      <div className="flex items-center gap-3 cursor-pointer group" onClick={() => !isHome && navigate('/')}>
        <div 
          className="w-10 h-10 rounded-xl flex items-center justify-center relative overflow-hidden"
          style={{ 
            background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-light) 100%)',
            boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
          }}
        >
          {/* 光效 */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
          
          <svg className="w-6 h-6 text-white relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
        </div>
        <div>
          <div className="text-lg font-bold group-hover:text-primary transition-colors" style={{ color: 'var(--color-text-primary)' }}>
            万能视频下载
          </div>
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>视频下载 & AI 总结</p>
        </div>
      </div>

      <nav className="flex items-center gap-2">
        {/* FAQ 和教程入口 */}
        <button
          onClick={() => navigate('/tutorial')}
          className="text-sm px-4 py-2 rounded-lg transition-all duration-200 hidden sm:flex items-center gap-2 hover:bg-primary/10 hover:text-primary group cursor-pointer"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          <span className="group-hover:scale-110 transition-transform">📖</span>
          教程
        </button>
        <button
          onClick={() => navigate('/faq')}
          className="text-sm px-4 py-2 rounded-lg transition-all duration-200 hidden sm:flex items-center gap-2 hover:bg-primary/10 hover:text-primary group cursor-pointer"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          <span className="group-hover:scale-110 transition-transform">❓</span>
          帮助
        </button>
        
        {!isHome && (
          <button
            onClick={() => navigate('/')}
            className="btn-secondary text-sm flex items-center gap-2 group"
          >
            <svg className="w-4 h-4 group-hover:rotate-90 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            新建任务
          </button>
        )}
      </nav>
    </header>
  );
}
