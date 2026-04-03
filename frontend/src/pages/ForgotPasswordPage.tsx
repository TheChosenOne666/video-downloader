import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SEO from '../components/SEO';

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [step, setStep] = useState<'input' | 'sent' | 'error'>('input');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // 模拟发送重置邮件
    // TODO: 接入后端 API 发送重置邮件
    await new Promise(resolve => setTimeout(resolve, 1500));

    if (email && email.includes('@')) {
      setStep('sent');
    } else {
      setError('请输入有效的邮箱地址');
    }
    setLoading(false);
  };

  if (step === 'sent') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 50%, #f0f9ff 100%)' }}>
        <div className="w-full max-w-md">
          <div className="glass-card p-8 text-center">
            <div 
              className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
              style={{ background: 'linear-gradient(135deg, var(--color-success) 0%, #34d399 100%)' }}
            >
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold mb-4" style={{ color: 'var(--color-text-primary)' }}>
              邮件已发送！
            </h1>
            <p className="text-sm mb-6" style={{ color: 'var(--color-text-secondary)' }}>
              我们已向 <span className="font-medium" style={{ color: 'var(--color-primary)' }}>{email}</span> 发送了一封重置密码的邮件。
            </p>
            <p className="text-xs mb-6" style={{ color: 'var(--color-text-muted)' }}>
              请查收邮件并按照指引重置密码。如果没有收到邮件，请检查垃圾邮件文件夹。
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => { setStep('input'); setEmail(''); }}
                className="flex-1 btn-secondary"
              >
                重新输入
              </button>
              <button
                onClick={() => navigate('/auth')}
                className="flex-1 btn-primary"
              >
                返回登录
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 50%, #f0f9ff 100%)' }}>
      <SEO config={{ title: '忘记密码', description: '重置密码', keywords: '' }} />
      
      <div className="w-full max-w-md">
        {/* Glow effect */}
        <div 
          className="absolute -inset-1 rounded-3xl opacity-30 blur-xl"
          style={{ background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-purple) 100%)' }}
        />
        
        <div className="glass-card p-8 relative">
          {/* Back button */}
          <button
            onClick={() => navigate('/auth')}
            className="absolute top-4 left-4 p-2 rounded-lg transition-colors hover:bg-primary/10"
            style={{ color: 'var(--color-text-muted)' }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* Header */}
          <div className="text-center mb-8">
            <div 
              className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-light) 100%)' }}
            >
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
              忘记密码？
            </h1>
            <p className="text-sm mt-2" style={{ color: 'var(--color-text-muted)' }}>
              输入您的注册邮箱，我们会发送重置链接
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 p-3 rounded-lg text-sm animate-slide-up" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--color-error)' }}>
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>
                邮箱地址
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg opacity-50">📧</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-glow pl-12"
                  placeholder="your@email.com"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-4 mt-6"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  发送中...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  发送重置链接
                </span>
              )}
            </button>
          </form>

          {/* Tips */}
          <div className="mt-6 p-4 rounded-xl" style={{ backgroundColor: 'var(--color-surface-lighter)' }}>
            <p className="text-xs font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
              💡 温馨提示
            </p>
            <ul className="text-xs space-y-1" style={{ color: 'var(--color-text-muted)' }}>
              <li>• 重置链接将在 24 小时后过期</li>
              <li>• 请检查邮箱的垃圾邮件文件夹</li>
              <li>• 如果邮箱未注册，系统不会发送任何邮件</li>
            </ul>
          </div>

          {/* Back to login */}
          <p className="mt-6 text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>
            想起密码了？
            <button
              onClick={() => navigate('/auth')}
              className="ml-1 font-medium hover:underline"
              style={{ color: 'var(--color-primary)' }}
            >
              返回登录
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
