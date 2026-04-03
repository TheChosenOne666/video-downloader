import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isLoggedIn, userInfo, logout } = useApp();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const avatarRef = useRef<HTMLButtonElement>(null);
  const isHome = location.pathname === '/';

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        !avatarRef.current?.contains(event.target as Node) &&
        !document.getElementById('user-dropdown')?.contains(event.target as Node)
      ) {
        setShowUserMenu(false);
      }
    };
    if (showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showUserMenu]);

  const handleLogout = () => {
    logout();
    setShowUserMenu(false);
    navigate('/auth');
  };

  const roleLabel = userInfo?.role === 'admin' ? '管理员' : userInfo?.role === 'vip' ? 'VIP' : '普通用户';

  return (
    <>
      <header className="glass-card px-6 py-4 flex items-center justify-between mb-6 relative z-10">
        {/* Logo */}
        <div className="flex items-center gap-3 cursor-pointer group" onClick={() => !isHome && navigate('/')}>
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center relative overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-light) 100%)',
              boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
            }}
          >
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

        {/* Navigation */}
        <nav className="flex items-center gap-2">
          {/* Tutorial */}
          <button
            onClick={() => navigate('/tutorial')}
            className="text-sm px-4 py-2 rounded-lg transition-all duration-200 hidden sm:flex items-center gap-2 hover:bg-primary/10 group"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            <span className="group-hover:scale-110 transition-transform">📖</span>
            教程
          </button>

          {/* FAQ */}
          <button
            onClick={() => navigate('/faq')}
            className="text-sm px-4 py-2 rounded-lg transition-all duration-200 hidden sm:flex items-center gap-2 hover:bg-primary/10 group"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            <span className="group-hover:scale-110 transition-transform">❓</span>
            帮助
          </button>

          {/* User Menu or Login */}
          {isLoggedIn ? (
            <>
              <button
                ref={avatarRef}
                onClick={() => setShowUserMenu(v => !v)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-200 hover:bg-primary/10"
                style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)' }}
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                  style={{ background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-light) 100%)', color: '#fff' }}
                >
                  {userInfo?.username?.charAt(0).toUpperCase() || 'U'}
                </div>
                <span className="text-sm font-medium hidden sm:block" style={{ color: 'var(--color-text-primary)' }}>
                  {userInfo?.username}
                </span>
                <svg
                  className={`w-4 h-4 transition-transform ${showUserMenu ? 'rotate-180' : ''}`}
                  style={{ color: 'var(--color-text-muted)' }}
                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Dropdown via Portal */}
              {showUserMenu && createPortal(
                <div
                  id="user-dropdown"
                  className="fixed w-56 rounded-xl shadow-2xl overflow-hidden animate-slide-up z-[9999]"
                  style={{
                    backgroundColor: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    top: avatarRef.current
                      ? avatarRef.current.getBoundingClientRect().bottom + 8
                      : 80,
                    right: 24,
                    minWidth: 200,
                  }}
                >
                  {/* User Info */}
                  <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--color-surface-dark)' }}>
                    <p className="font-medium text-sm" style={{ color: 'var(--color-text-primary)' }}>
                      {userInfo?.username}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                      {userInfo?.email}
                    </p>
                    <span
                      className="inline-block mt-2 px-2 py-0.5 text-xs rounded-full"
                      style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', color: 'var(--color-primary)' }}
                    >
                      {roleLabel}
                    </span>
                  </div>

                  {/* Menu Items */}
                  <div className="py-2">
                    <button
                      onClick={() => { navigate('/profile'); setShowUserMenu(false); }}
                      className="w-full px-4 py-2.5 text-left text-sm flex items-center gap-3 hover:bg-blue-50 transition-colors"
                      style={{ color: 'var(--color-text-secondary)' }}
                    >
                      <span>👤</span>
                      个人信息
                    </button>
                    <button
                      onClick={() => { navigate('/'); setShowUserMenu(false); }}
                      className="w-full px-4 py-2.5 text-left text-sm flex items-center gap-3 hover:bg-blue-50 transition-colors"
                      style={{ color: 'var(--color-text-secondary)' }}
                    >
                      <span>🏠</span>
                      首页
                    </button>
                    <button
                      onClick={() => { navigate('/tutorial'); setShowUserMenu(false); }}
                      className="w-full px-4 py-2.5 text-left text-sm flex items-center gap-3 hover:bg-blue-50 transition-colors"
                      style={{ color: 'var(--color-text-secondary)' }}
                    >
                      <span>📖</span>
                      使用教程
                    </button>
                  </div>

                  {/* Divider */}
                  <div className="border-t" style={{ borderColor: 'var(--color-surface-dark)' }} />

                  {/* Logout */}
                  <div className="py-2">
                    <button
                      onClick={handleLogout}
                      className="w-full px-4 py-2.5 text-left text-sm flex items-center gap-3 hover:bg-red-50 transition-colors"
                      style={{ color: 'var(--color-error)' }}
                    >
                      <span>🚪</span>
                      退出登录
                    </button>
                  </div>
                </div>,
                document.body
              )}
            </>
          ) : (
            <button
              onClick={() => navigate('/auth')}
              className="btn-primary text-sm flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
              </svg>
              登录
            </button>
          )}

          {/* New Task Button (when not on home) */}
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
    </>
  );
}
