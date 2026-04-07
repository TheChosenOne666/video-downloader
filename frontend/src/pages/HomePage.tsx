import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import Header from '../components/Header';
import URLInput from '../components/URLInput';
import FormatSelector from '../components/FormatSelector';
import VideoPreview from '../components/VideoPreview';
import DownloadModeSelector from '../components/DownloadModeSelector';
import SEO from '../components/SEO';
import { seoConfig } from '../config/seo';
import ParticleBackground from '../components/ParticleBackground';
import AnimatedNumber from '../components/AnimatedNumber';
import SupportedPlatforms from '../components/SupportedPlatforms';
import HowToUse from '../components/HowToUse';
import AdvancedFeatures from '../components/AdvancedFeatures';
import Testimonials from '../components/Testimonials';
import { checkDownloadLimit } from '../services/membership';
import { getProfile } from '../services/api';
import { useEffect } from 'react';

export default function HomePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { urls, checkUrls, startDownloading, checkingUrls, videoInfos, loading, goToSummarize, downloadMode, isLoggedIn, userInfo, downloadLimit, setDownloadLimitCtx, setUser } = useApp();

  // isVip 直接从 context 的 userInfo 派生，不再维护独立 state
  const isVip = userInfo?.role === 'vip' || userInfo?.role === 'admin';

  // 调试日志
  useEffect(() => {
    console.log('[HomePage] Debug:', { isLoggedIn, isVip, userInfoRole: userInfo?.role, downloadLimit });
  }, [isLoggedIn, isVip, userInfo, downloadLimit]);

  // 登录时初始化次数和用户角色（从服务器获取最新状态）
  useEffect(() => {
    if (isLoggedIn) {
      // 获取最新的用户信息（确保VIP状态正确）
      const token = localStorage.getItem('auth_token');
      if (token) {
        getProfile().then(profile => {
          // 更新用户信息（包含最新role）
          setUser(token, {
            username: profile.username,
            email: profile.email,
            role: profile.role,
          });
        }).catch(() => {});
      }
      // 获取下载次数限制
      checkDownloadLimit().then(setDownloadLimitCtx).catch(() => {});
    } else {
      setDownloadLimitCtx(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn, location.pathname]); // 添加 location.pathname，页面切换时刷新

  // 检查是否解析完成（有视频信息）
  const hasVideoInfo = videoInfos.length > 0;

  // 解析视频 - 直接读取输入框内容
  const handleParse = async () => {
    if (!isLoggedIn) {
      navigate('/auth');
      return;
    }
    await checkUrls();
  };

  // 开始下载 - 先导航再调用下载逻辑
  const handleStartDownload = async () => {
    if (!isLoggedIn) {
      navigate('/auth');
      return;
    }
    
    // 检查下载限制
    if (downloadLimit && !downloadLimit.can_download) {
      // 超过限制，提示升级
      if (confirm('今日下载次数已用完，是否开通VIP会员享受无限下载？')) {
        navigate('/pricing');
      }
      return;
    }
    
    // 先导航到进度页面
    navigate('/progress');
    // 然后启动下载
    await startDownloading();
    
    // 下载成功后刷新限制
    checkDownloadLimit().then(setDownloadLimitCtx);
  };

  // AI 总结 - 先导航再更新状态
  const handleGoToSummarize = () => {
    if (!isLoggedIn) {
      navigate('/auth');
      return;
    }
    navigate('/summarize');
    goToSummarize();
  };

  return (
    <div className="min-h-screen flex flex-col relative">
      {/* 粒子背景 */}
      <ParticleBackground />
      
      <SEO config={seoConfig['/']} />
      <Header />

      <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl relative z-10">
        {/* Hero Section */}
        <div className="text-center mb-10 animate-slide-up">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 leading-tight">
            <span className="text-gradient">无法下载？</span>
            <br />
            <span style={{ color: 'var(--color-text-primary)' }}>画质受限？</span>
          </h1>
          <p className="text-lg max-w-xl mx-auto leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
            一键解析全网视频，支持 YouTube、B站、抖音等平台
            <br />
            <span className="font-medium" style={{ color: 'var(--color-primary)' }}>高清无水印下载</span>
          </p>
        </div>

        {/* 数据统计展示 - 动态数字 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12 animate-slide-up">
          <div className="glass-card p-5 text-center group hover:scale-105 transition-transform">
            <div className="text-2xl md:text-3xl font-bold" style={{ color: 'var(--color-primary)' }}>
              <AnimatedNumber target={100000} suffix="+" useChineseUnit />
            </div>
            <div className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>用户使用</div>
          </div>
          <div className="glass-card p-5 text-center group hover:scale-105 transition-transform">
            <div className="text-2xl md:text-3xl font-bold" style={{ color: 'var(--color-primary)' }}>
              <AnimatedNumber target={1000} suffix="+" />
            </div>
            <div className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>支持平台</div>
          </div>
          <div className="glass-card p-5 text-center group hover:scale-105 transition-transform">
            <div className="text-2xl md:text-3xl font-bold" style={{ color: 'var(--color-primary)' }}>
              <AnimatedNumber target={1000000} suffix="+" useChineseUnit />
            </div>
            <div className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>累计下载</div>
          </div>
          <div className="glass-card p-5 text-center group hover:scale-105 transition-transform">
            <div className="text-2xl md:text-3xl font-bold" style={{ color: 'var(--color-primary)' }}>
              4.8<span className="text-lg">分</span>
            </div>
            <div className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>用户评分</div>
          </div>
        </div>

        {/* Main Card - 带光晕效果 */}
        <div className="relative animate-slide-up">
          {/* 光晕背景 */}
          <div 
            className="absolute -inset-1 rounded-2xl opacity-30 blur-xl"
            style={{ background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-purple) 100%)' }}
          />
          
          <div className="glass-card p-6 md:p-8 relative">
            {/* 未登录提示 */}
            {!isLoggedIn && (
              <div className="mb-6 p-4 rounded-xl animate-slide-up flex items-start gap-4" 
                   style={{ backgroundColor: 'rgba(251, 191, 36, 0.1)', border: '1px solid rgba(251, 191, 36, 0.3)' }}>
                <span className="text-2xl flex-shrink-0">🔒</span>
                <div className="flex-1">
                  <p className="text-sm font-medium" style={{ color: '#d97706' }}>
                    请先登录后再使用功能
                  </p>
                  <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                    登录后可解锁视频解析、下载、AI总结等功能
                  </p>
                  <button
                    onClick={() => navigate('/auth')}
                    className="mt-3 px-4 py-2 rounded-lg text-sm font-medium transition-all hover:scale-105"
                    style={{ backgroundColor: 'var(--color-primary)', color: '#fff' }}
                  >
                    立即登录
                  </button>
                </div>
              </div>
            )}

            {/* 登录后显示下载次数提示 - 环形进度 + 文字 */}
            {isLoggedIn && downloadLimit && !isVip && (
              <div className="mb-6 p-4 rounded-2xl animate-slide-up flex items-center gap-5"
                   style={{ background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.08) 0%, rgba(168, 85, 247, 0.08) 100%)', border: '1px solid rgba(168, 85, 247, 0.2)' }}>
                {/* 环形进度 */}
                <div className="relative flex-shrink-0">
                  <svg width="56" height="56" viewBox="0 0 56 56">
                    <circle cx="28" cy="28" r="24" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="4" />
                    <circle
                      cx="28" cy="28" r="24"
                      fill="none"
                      stroke={downloadLimit.daily_used >= downloadLimit.daily_limit ? '#ef4444' : 'var(--color-primary)'}
                      strokeWidth="4"
                      strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 24}`}
                      strokeDashoffset={`${2 * Math.PI * 24 * (1 - Math.min(1, downloadLimit.daily_used / downloadLimit.daily_limit))}`}
                      transform="rotate(-90 28 28)"
                      style={{ transition: 'stroke-dashoffset 0.6s ease, stroke 0.3s ease' }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-sm font-bold" style={{ color: downloadLimit.daily_used >= downloadLimit.daily_limit ? '#ef4444' : 'var(--color-primary)' }}>
                      {downloadLimit.daily_limit - downloadLimit.daily_used <= 0 ? '0' : downloadLimit.daily_limit - downloadLimit.daily_used}
                    </span>
                  </div>
                </div>

                {/* 文字区域 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                      今日免费下载次数
                    </p>
                    <span className="px-1.5 py-0.5 rounded text-xs font-medium" style={{ backgroundColor: 'rgba(168, 85, 247, 0.15)', color: '#a855f7' }}>
                      剩余 {(downloadLimit.daily_limit - downloadLimit.daily_used <= 0 ? '0' : downloadLimit.daily_limit - downloadLimit.daily_used).toString().padStart(2, '0')} 次
                    </span>
                  </div>
                  <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    普通用户每日免费 {downloadLimit.daily_limit} 次，开通VIP享受无限下载
                  </p>
                </div>

                {/* 开通按钮 */}
                <button
                  onClick={() => navigate('/pricing')}
                  className="px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:scale-105 flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-purple) 100%)', color: '#fff', boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)' }}
                >
                  开通VIP会员
                </button>
              </div>
            )}

            {/* VIP用户提示 */}
            {isLoggedIn && isVip && (
              <div className="mb-6 p-4 rounded-xl animate-slide-up flex items-center gap-4" 
                   style={{ backgroundColor: 'rgba(168, 85, 247, 0.1)', border: '1px solid rgba(168, 85, 247, 0.3)' }}>
                <span className="text-2xl flex-shrink-0">👑</span>
                <div className="flex-1">
                  <p className="text-sm font-medium" style={{ color: '#a855f7' }}>
                    VIP会员特权
                  </p>
                  <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                    无限次下载 + AI视频总结 + 思维导图 + 智能问答
                  </p>
                </div>
              </div>
            )}
            
            <URLInput />
            
            {/* Video Preview - Shows after parsing */}
            <VideoPreview />
            
            {/* Format Selector - Shows after parsing */}
            {videoInfos.length > 0 && (
              <div className="mt-6 pt-6 space-y-6" style={{ borderTop: '1px solid var(--color-surface-dark)' }}>
                <FormatSelector />
                <DownloadModeSelector />
              </div>
            )}

            {/* 按钮区域 - 根据解析状态显示不同按钮 */}
            <div className="mt-8 flex flex-col sm:flex-row gap-4">
              {/* 解析前：只显示「解析视频」按钮 */}
              {!hasVideoInfo && (
                <button
                  onClick={handleParse}
                  disabled={urls.length === 0 || checkingUrls}
                  className="btn-primary flex-1 flex items-center justify-center gap-2"
                >
                  {checkingUrls ? (
                    <>
                      <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      解析中...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      解析视频
                    </>
                  )}
                </button>
              )}

              {/* 解析后：显示「开始下载」按钮 */}
              {hasVideoInfo && (
                <button
                  onClick={handleStartDownload}
                  disabled={loading}
                  className="btn-primary flex-1 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      开始下载...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      开始下载 ({urls.length}){downloadMode === 'subtitled' ? ' (带字幕)' : ''}
                    </>
                  )}
                </button>
              )}
            </div>

            {/* AI Summary Button - Only enabled after parsing */}
            {hasVideoInfo && (
              <div className="mt-4">
                {isVip ? (
                  <button
                    onClick={handleGoToSummarize}
                    disabled={!hasVideoInfo || checkingUrls}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed group"
                    style={{ 
                      background: 'linear-gradient(135deg, var(--color-purple) 0%, #c084fc 100%)',
                      color: '#ffffff'
                    }}
                  >
                    <svg className="w-5 h-5 group-hover:rotate-12 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    AI 视频总结
                  </button>
                ) : (
                  <button
                    onClick={() => navigate('/pricing')}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg transition-all duration-200 font-medium relative overflow-hidden"
                    style={{ 
                      background: 'linear-gradient(135deg, var(--color-purple) 0%, #c084fc 100%)',
                      color: '#ffffff'
                    }}
                  >
                    {/* VIP badge */}
                    <span className="absolute top-1 right-1 px-1.5 py-0.5 rounded text-xs font-bold" style={{ backgroundColor: 'rgba(255,255,255,0.3)' }}>
                      VIP
                    </span>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    AI 视频总结（仅VIP）
                  </button>
                )}
                <p className="text-xs text-center mt-2" style={{ color: 'var(--color-text-muted)' }}>
                  {isVip 
                    ? '基于 AI 分析视频内容，生成摘要、字幕、思维导图和智能问答'
                    : 'AI视频总结功能仅对VIP会员开放，升级后即可使用'
                  }
                </p>
              </div>
            )}

            {videoInfos.length > 0 && (
              <div className="mt-6 p-4 rounded-xl flex items-center gap-3" style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
                <svg className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--color-success)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm" style={{ color: 'var(--color-success)' }}>
                  已识别 {videoInfos.length} 个视频，点击「开始下载」即可
                </p>
              </div>
            )}
          </div>
        </div>

        {/* VIP会员特权对比 */}
        <div className="mt-12 animate-slide-up">
          <h2 className="text-2xl font-bold text-center mb-8" style={{ color: 'var(--color-text-primary)' }}>
            <span className="text-gradient">会员特权</span>对比
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            {/* 免费用户 */}
            <div className="glass-card p-6 relative overflow-hidden" style={{ border: '2px solid var(--color-surface-dark)' }}>
              <div className="absolute top-0 right-0 w-20 h-20 opacity-10">
                <svg viewBox="0 0 100 100" fill="currentColor" style={{ color: 'var(--color-text-muted)' }}>
                  <circle cx="50" cy="50" r="50" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-4" style={{ color: 'var(--color-text-secondary)' }}>免费用户</h3>
              <ul className="space-y-3">
                <li className="flex items-center gap-3">
                  <span className="text-green-500">✓</span>
                  <span style={{ color: 'var(--color-text-secondary)' }}>每日3次视频下载</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="text-green-500">✓</span>
                  <span style={{ color: 'var(--color-text-secondary)' }}>基础视频解析</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="text-green-500">✓</span>
                  <span style={{ color: 'var(--color-text-secondary)' }}>480P视频质量</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="text-red-500">✗</span>
                  <span style={{ color: 'var(--color-text-muted)' }}>AI视频总结</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="text-red-500">✗</span>
                  <span style={{ color: 'var(--color-text-muted)' }}>思维导图生成</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="text-red-500">✗</span>
                  <span style={{ color: 'var(--color-text-muted)' }}>AI智能问答</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="text-red-500">✗</span>
                  <span style={{ color: 'var(--color-text-muted)' }}>高清画质下载</span>
                </li>
              </ul>
              <div className="mt-6 text-center">
                <span className="text-2xl font-bold" style={{ color: 'var(--color-text-muted)' }}>免费</span>
              </div>
            </div>

            {/* VIP会员 */}
            <div className="glass-card p-6 relative overflow-hidden" style={{ border: '2px solid var(--color-primary)' }}>
              {/* VIP 标签 */}
              <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 px-4 py-1 rounded-b-lg text-xs font-bold text-white" style={{ backgroundColor: 'var(--color-primary)' }}>
                推荐
              </div>
              <div className="absolute top-0 right-0 w-20 h-20 opacity-10">
                <svg viewBox="0 0 100 100" fill="currentColor" style={{ color: 'var(--color-primary)' }}>
                  <circle cx="50" cy="50" r="50" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-4" style={{ color: 'var(--color-primary)' }}>👑 VIP会员</h3>
              <ul className="space-y-3">
                <li className="flex items-center gap-3">
                  <span className="text-green-500">✓</span>
                  <span style={{ color: 'var(--color-text-primary)' }}>无限次视频下载</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="text-green-500">✓</span>
                  <span style={{ color: 'var(--color-text-primary)' }}>完整视频解析</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="text-green-500">✓</span>
                  <span style={{ color: 'var(--color-text-primary)' }}>4K超清画质</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="text-green-500">✓</span>
                  <span style={{ color: 'var(--color-text-primary)' }}>AI视频总结</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="text-green-500">✓</span>
                  <span style={{ color: 'var(--color-text-primary)' }}>思维导图生成</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="text-green-500">✓</span>
                  <span style={{ color: 'var(--color-text-primary)' }}>AI智能问答</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="text-green-500">✓</span>
                  <span style={{ color: 'var(--color-text-primary)' }}>字幕生成导出</span>
                </li>
              </ul>
              <div className="mt-6 text-center">
                <button
                  onClick={() => navigate('/pricing')}
                  className="w-full py-3 rounded-lg font-bold text-white transition-all hover:scale-105"
                  style={{ background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-purple) 100%)' }}
                >
                  立即开通 ¥29.9/月
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 使用步骤 */}
        <HowToUse />

        {/* 支持平台 */}
        <SupportedPlatforms />

        {/* 高级功能 */}
        <AdvancedFeatures />

        {/* 用户评价 */}
        <Testimonials />

        {/* Pain Points */}
        <div className="mt-12 grid md:grid-cols-2 gap-6 animate-slide-up">
          <div className="glass-card p-6 relative overflow-hidden group">
            {/* 装饰 */}
            <div className="absolute top-0 right-0 w-20 h-20 opacity-10">
              <svg viewBox="0 0 100 100" fill="currentColor" style={{ color: 'var(--color-error)' }}>
                <circle cx="50" cy="50" r="50" />
              </svg>
            </div>
            
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
              <span className="text-xl">😤</span> 还在忍受这些？
            </h2>
            <ul className="space-y-3 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              <li className="flex items-center gap-3 group-hover:translate-x-1 transition-transform">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: 'var(--color-error)' }} />
                需要安装各种插件和软件
              </li>
              <li className="flex items-center gap-3 group-hover:translate-x-1 transition-transform">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: 'var(--color-error)' }} />
                下载的视频有水印或画质差
              </li>
              <li className="flex items-center gap-3 group-hover:translate-x-1 transition-transform">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: 'var(--color-error)' }} />
                批量下载需要反复操作
              </li>
              <li className="flex items-center gap-3 group-hover:translate-x-1 transition-transform">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: 'var(--color-error)' }} />
                下载速度慢还经常失败
              </li>
            </ul>
          </div>

          <div className="glass-card p-6 relative overflow-hidden group">
            {/* 装饰 */}
            <div className="absolute top-0 right-0 w-20 h-20 opacity-10">
              <svg viewBox="0 0 100 100" fill="currentColor" style={{ color: 'var(--color-success)' }}>
                <circle cx="50" cy="50" r="50" />
              </svg>
            </div>
            
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
              <span className="text-xl">🎉</span> 万能视频下载帮你解决
            </h2>
            <ul className="space-y-3 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              <li className="flex items-center gap-3 group-hover:translate-x-1 transition-transform">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: 'var(--color-success)' }} />
                浏览器直接使用，无需安装
              </li>
              <li className="flex items-center gap-3 group-hover:translate-x-1 transition-transform">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: 'var(--color-success)' }} />
                原始画质，无水印无压缩
              </li>
              <li className="flex items-center gap-3 group-hover:translate-x-1 transition-transform">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: 'var(--color-success)' }} />
                批量添加，一键同时下载
              </li>
              <li className="flex items-center gap-3 group-hover:translate-x-1 transition-transform">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: 'var(--color-success)' }} />
                多线程加速，稳定高速
              </li>
            </ul>
          </div>
        </div>
      </main>

      <footer className="py-8 text-center relative z-10">
        <div className="container mx-auto px-4">
          <div className="glass-card inline-block px-8 py-4">
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
              万能视频下载 © 2026 · 本地处理，保护隐私
            </p>
            <div className="flex items-center justify-center gap-4 mt-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>
              <span>🔒 隐私安全</span>
              <span>⚡ 极速下载</span>
              <span>🌐 多平台支持</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
