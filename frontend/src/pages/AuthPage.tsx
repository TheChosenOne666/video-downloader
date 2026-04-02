import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { register, login } from '../services/api';
import SEO from '../components/SEO';

export default function AuthPage() {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let response;
      if (isLogin) {
        response = await login(username, password);
      } else {
        response = await register(username, email, password);
      }

      // 保存 token 到 localStorage
      localStorage.setItem('auth_token', response.token);
      localStorage.setItem('user_info', JSON.stringify({
        username: response.username,
        email: response.email,
      }));

      // 跳转到首页
      navigate('/');
      window.location.reload();
    } catch (err: any) {
      setError(err.message || '操作失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 50%, #f0f9ff 100%)' }}>
      <SEO config={{ title: isLogin ? '登录' : '注册', description: isLogin ? '登录账号' : '注册账号', keywords: '' }} />
      
      {/* 装饰背景 */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div 
          className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, var(--color-primary) 0%, transparent 70%)' }}
        />
        <div 
          className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, var(--color-purple) 0%, transparent 70%)' }}
        />
      </div>

      <div className="glass-card p-8 w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <div 
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-light) 100%)' }}
          >
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
            {isLogin ? '欢迎回来' : '创建账号'}
          </h1>
          <p className="text-sm mt-2" style={{ color: 'var(--color-text-muted)' }}>
            {isLogin ? '登录以继续使用视频下载服务' : '注册账号以使用视频下载服务'}
          </p>
        </div>

        {/* Tab Switch */}
        <div className="flex mb-6 rounded-xl p-1" style={{ backgroundColor: 'var(--color-surface-lighter)' }}>
          <button
            onClick={() => setIsLogin(true)}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
              isLogin ? 'bg-white shadow' : ''
            }`}
            style={{ color: isLogin ? 'var(--color-primary)' : 'var(--color-text-muted)' }}
          >
            登录
          </button>
          <button
            onClick={() => setIsLogin(false)}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
              !isLogin ? 'bg-white shadow' : ''
            }`}
            style={{ color: !isLogin ? 'var(--color-primary)' : 'var(--color-text-muted)' }}
          >
            注册
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 rounded-lg text-sm" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--color-error)' }}>
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>
              用户名
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="input-glow"
              placeholder="输入用户名"
              required
              minLength={3}
              maxLength={20}
            />
          </div>

          {!isLogin && (
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>
                邮箱
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-glow"
                placeholder="输入邮箱地址"
                required
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>
              密码
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-glow"
              placeholder="输入密码"
              required
              minLength={6}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                处理中...
              </>
            ) : (
              isLogin ? '登录' : '注册'
            )}
          </button>
        </form>

        {/* Login tips */}
        <div className="mt-6 text-center text-xs" style={{ color: 'var(--color-text-muted)' }}>
          {isLogin ? (
            <p>登录即表示同意我们的服务条款和隐私政策</p>
          ) : (
            <p>注册即表示同意我们的服务条款和隐私政策</p>
          )}
        </div>

        {/* Demo account */}
        {isLogin && (
          <div className="mt-4 p-4 rounded-xl" style={{ backgroundColor: 'var(--color-surface-lighter)' }}>
            <p className="text-xs font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
              演示账号（可直接登录）
            </p>
            <p className="text-xs font-mono" style={{ color: 'var(--color-text-muted)' }}>
              用户名: user1 &nbsp;|&nbsp; 密码: test123
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
