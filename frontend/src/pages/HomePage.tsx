import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import Header from '../components/Header';
import URLInput from '../components/URLInput';
import FormatSelector from '../components/FormatSelector';
import FeatureCards from '../components/FeatureCard';
import VideoPreview from '../components/VideoPreview';
import DownloadModeSelector from '../components/DownloadModeSelector';
import SEO from '../components/SEO';
import { seoConfig } from '../config/seo';

export default function HomePage() {
  const navigate = useNavigate();
  const { urls, checkUrls, startDownloading, checkingUrls, videoInfos, loading, goToSummarize, downloadMode } = useApp();

  // 检查是否解析完成（有视频信息）
  const hasVideoInfo = videoInfos.length > 0;

  // 解析视频 - 直接读取输入框内容
  const handleParse = async () => {
    await checkUrls();
  };

  // 开始下载 - 先导航再调用下载逻辑
  const handleStartDownload = async () => {
    // 先导航到进度页面
    navigate('/progress');
    // 然后启动下载
    await startDownloading();
  };

  // AI 总结 - 先导航再更新状态
  const handleGoToSummarize = () => {
    navigate('/summarize');
    goToSummarize();
  };

  return (
    <div className="min-h-screen flex flex-col">
      <SEO config={seoConfig['/']} />
      <Header />

      <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl">
        {/* Hero Section */}
        <div className="text-center mb-12 animate-slide-up">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="text-gradient">无法下载？</span>
            <br />
            <span style={{ color: 'var(--color-text-primary)' }}>画质受限？</span>
          </h1>
          <p className="text-lg max-w-xl mx-auto" style={{ color: 'var(--color-text-secondary)' }}>
            一键解析全网视频，支持 YouTube、B站、抖音等平台，高清无水印下载
          </p>
        </div>

        {/* Main Card */}
        <div className="glass-card p-6 md:p-8 animate-slide-up">
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
              <button
                onClick={handleGoToSummarize}
                disabled={!hasVideoInfo || checkingUrls}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ 
                  background: 'linear-gradient(135deg, var(--color-purple) 0%, #c084fc 100%)',
                  color: '#ffffff'
                }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                AI 视频总结
              </button>
              <p className="text-xs text-center mt-2" style={{ color: 'var(--color-text-muted)' }}>
                基于 AI 分析视频内容，生成摘要、字幕、思维导图和智能问答
              </p>
            </div>
          )}

          {videoInfos.length > 0 && (
            <div className="mt-6 p-4 rounded-xl" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
              <p className="text-sm" style={{ color: 'var(--color-primary)' }}>
                ✓ 已识别 {videoInfos.length} 个视频，点击「开始下载」即可
              </p>
            </div>
          )}
        </div>

        <FeatureCards />

        {/* Pain Points */}
        <div className="mt-12 grid md:grid-cols-2 gap-6 animate-slide-up">
          <div className="glass-card p-6">
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
              <span style={{ color: 'var(--color-error)' }}>✕</span> 还在忍受这些？
            </h2>
            <ul className="space-y-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'var(--color-error)' }} />
                需要安装各种插件和软件
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'var(--color-error)' }} />
                下载的视频有水印或画质差
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'var(--color-error)' }} />
                批量下载需要反复操作
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'var(--color-error)' }} />
                下载速度慢还经常失败
              </li>
            </ul>
          </div>

          <div className="glass-card p-6">
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
              <span style={{ color: 'var(--color-success)' }}>✓</span> 万能视频下载帮你解决
            </h2>
            <ul className="space-y-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'var(--color-success)' }} />
                浏览器直接使用，无需安装
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'var(--color-success)' }} />
                原始画质，无水印无压缩
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'var(--color-success)' }} />
                批量添加，一键同时下载
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'var(--color-success)' }} />
                多线程加速，稳定高速
              </li>
            </ul>
          </div>
        </div>
      </main>

      <footer className="py-6 text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>
        <p>万能视频下载 © 2026 · 本地处理，保护隐私</p>
      </footer>
    </div>
  );
}
