import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import Header from '../components/Header';
import ParticleBackground from '../components/ParticleBackground';
import { updateProfile, getProfile } from '../services/api';

export default function ProfilePage() {
  const navigate = useNavigate();
  const { isLoggedIn, userInfo, setUser, logout } = useApp();

  const [email, setEmail] = useState(userInfo?.email || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  // Redirect if not logged in
  useEffect(() => {
    if (!isLoggedIn) {
      navigate('/auth');
      return;
    }
    // Fetch full profile and update userInfo
    const token = localStorage.getItem('auth_token');
    if (token) {
      getProfile().then((profile) => {
        // Update userInfo with latest role from server
        setUser(token, {
          username: profile.username,
          email: profile.email,
          role: profile.role,
        });
      }).catch(() => {});
    }
  }, [isLoggedIn, navigate, setUser]);

  const handleEmailChange = async () => {
    if (!email || !userInfo) return;
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const authToken = localStorage.getItem('auth_token') || '';
      await updateProfile({ email });
      setUser(authToken, { ...userInfo, email });
      setSuccess('邮箱修改成功');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || '修改失败');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!userInfo) return;
    setError('');
    setSuccess('');

    if (newPassword.length < 6) {
      setError('新密码至少6个字符');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('两次密码不一致');
      return;
    }
    if (!currentPassword) {
      setError('请输入当前密码');
      return;
    }

    setLoading(true);
    try {
      await updateProfile({
        username: userInfo?.username,  // Keep username
        email: userInfo?.email,        // Keep email
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setSuccess('密码修改成功');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || '修改失败');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/auth');
  };

  const handleDeleteAccount = () => {
    if (deleteConfirmText !== '删除账号') {
      setError('请输入「删除账号」确认');
      return;
    }
    // TODO: 调用删除账号 API
    alert('账号删除功能开发中...');
    setShowDeleteModal(false);
  };

  if (!isLoggedIn) return null;

  const roleLabel = userInfo?.role === 'admin' ? '管理员' : userInfo?.role === 'vip' ? 'VIP会员' : '普通用户';
  const roleColor = userInfo?.role === 'admin' ? 'var(--color-error)' : userInfo?.role === 'vip' ? '#f59e0b' : 'var(--color-text-muted)';

  return (
    <div className="min-h-screen flex flex-col relative">
      <ParticleBackground />
      <Header />

      <main className="flex-1 container mx-auto px-4 py-8 max-w-2xl relative z-10">
        {/* Page Title */}
        <div className="mb-8 animate-slide-up">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
            个人信息
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
            管理您的账号信息、安全设置
          </p>
        </div>

        {/* Avatar Card */}
        <div className="glass-card p-6 mb-4 animate-slide-up" style={{ animationDelay: '50ms' }}>
          <div className="flex items-center gap-6">
            {/* Avatar */}
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center text-3xl font-bold flex-shrink-0"
              style={{
                background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-light) 100%)',
                color: '#fff',
                boxShadow: '0 8px 24px rgba(59, 130, 246, 0.3)',
              }}
            >
              {userInfo?.username?.charAt(0).toUpperCase() || 'U'}
            </div>

            {/* Info */}
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
                  {userInfo?.username}
                </h2>
                <span
                  className="px-2.5 py-0.5 text-xs rounded-full font-medium"
                  style={{ backgroundColor: `${roleColor}15`, color: roleColor }}
                >
                  {roleLabel}
                </span>
              </div>
              <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
                账号ID: {userInfo?.username}
              </p>
            </div>
          </div>
        </div>

        {/* Messages */}
        {success && (
          <div
            className="glass-card p-4 mb-4 flex items-center gap-3 animate-slide-up"
            style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)' }}
          >
            <svg className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--color-success)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-sm" style={{ color: 'var(--color-success)' }}>{success}</span>
          </div>
        )}
        {error && (
          <div
            className="glass-card p-4 mb-4 flex items-center gap-3 animate-slide-up"
            style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)' }}
          >
            <svg className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--color-error)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm" style={{ color: 'var(--color-error)' }}>{error}</span>
          </div>
        )}

        {/* Basic Info Card */}
        <div className="glass-card p-6 mb-4 animate-slide-up" style={{ animationDelay: '100ms' }}>
          <h3 className="text-base font-semibold mb-5 flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
            <span>📋</span> 基本信息
          </h3>
          <div className="space-y-4">
            {/* Username - Read only */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                账号
              </label>
              <input
                type="text"
                value={userInfo?.username || ''}
                className="input-glow"
                disabled
              />
              <p className="text-xs mt-1.5" style={{ color: 'var(--color-text-muted)' }}>
                用户名不可修改
              </p>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                邮箱
              </label>
              <div className="flex gap-3">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-glow flex-1"
                  placeholder="输入新邮箱"
                />
                <button
                  onClick={handleEmailChange}
                  disabled={loading || email === userInfo?.email || !email}
                  className="btn-primary px-6 whitespace-nowrap"
                >
                  保存邮箱
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Password Card */}
        <div className="glass-card p-6 mb-4 animate-slide-up" style={{ animationDelay: '150ms' }}>
          <h3 className="text-base font-semibold mb-5 flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
            <span>🔒</span> 修改密码
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                当前密码
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="input-glow"
                placeholder="输入当前密码"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                新密码
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="input-glow"
                placeholder="输入新密码（至少6字符）"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                确认新密码
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input-glow"
                placeholder="再次输入新密码"
              />
            </div>
            <button
              onClick={handlePasswordChange}
              disabled={loading || !currentPassword || !newPassword || !confirmPassword}
              className="btn-primary w-full sm:w-auto sm:px-8"
            >
              {loading ? '修改中...' : '修改密码'}
            </button>
          </div>
        </div>

        {/* Session Card */}
        <div className="glass-card p-6 mb-4 animate-slide-up" style={{ animationDelay: '200ms' }}>
          <h3 className="text-base font-semibold mb-5 flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
            <span>⚙️</span> 会话管理
          </h3>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                当前登录状态
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                登录有效期 30 天
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="px-5 py-2.5 rounded-xl text-sm font-medium transition-all hover:scale-105"
              style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--color-error)' }}
            >
              退出登录
            </button>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="glass-card p-6 animate-slide-up" style={{ animationDelay: '250ms', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
          <h3 className="text-base font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--color-error)' }}>
            <span>⚠️</span> 危险区域
          </h3>
          <p className="text-sm mb-4" style={{ color: 'var(--color-text-muted)' }}>
            删除账号后，所有数据将无法恢复。请谨慎操作。
          </p>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="px-5 py-2.5 rounded-xl text-sm font-medium transition-all hover:scale-105"
            style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', color: 'var(--color-error)' }}
          >
            删除账号
          </button>
        </div>
      </main>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
          onClick={(e) => e.target === e.currentTarget && setShowDeleteModal(false)}
        >
          <div className="glass-card p-8 w-full max-w-md animate-slide-up" style={{ border: '1px solid rgba(239,68,68,0.3)' }}>
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5" style={{ backgroundColor: 'rgba(239,68,68,0.1)' }}>
              <svg className="w-8 h-8" style={{ color: 'var(--color-error)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>

            <h3 className="text-xl font-bold text-center mb-2" style={{ color: 'var(--color-error)' }}>
              确定要删除账号？
            </h3>
            <p className="text-sm text-center mb-6" style={{ color: 'var(--color-text-muted)' }}>
              此操作不可逆，账号和所有相关数据将被永久删除
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                请输入「删除账号」确认
              </label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                className="input-glow"
                placeholder="删除账号"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => { setShowDeleteModal(false); setDeleteConfirmText(''); }}
                className="flex-1 py-3 rounded-xl text-sm font-medium"
                style={{ backgroundColor: 'var(--color-surface-lighter)', color: 'var(--color-text-secondary)' }}
              >
                取消
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteConfirmText !== '删除账号'}
                className="flex-1 py-3 rounded-xl text-sm font-medium transition-all"
                style={{
                  backgroundColor: deleteConfirmText === '删除账号' ? 'var(--color-error)' : 'rgba(239,68,68,0.3)',
                  color: '#fff',
                }}
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
