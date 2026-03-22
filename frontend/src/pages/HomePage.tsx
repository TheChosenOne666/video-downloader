import { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import Header from '../components/Header';
import URLInput from '../components/URLInput';
import FormatSelector from '../components/FormatSelector';
import FeatureCards from '../components/FeatureCard';
import VideoPreview from '../components/VideoPreview';

export default function HomePage() {
  const { urls, checkUrls, startDownloading, checkingUrls, videoInfos, loading } = useApp();
  const [pendingDownload, setPendingDownload] = useState(false);

  useEffect(() => {
    if (pendingDownload && videoInfos.length > 0) {
      setPendingDownload(false);
      startDownloading();
    }
  }, [videoInfos, pendingDownload, startDownloading]);

  const handleStart = async () => {
    if (videoInfos.length > 0) {
      await startDownloading();
    } else {
      await checkUrls();
      setPendingDownload(true);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl">
        {/* Hero Section */}
        <div className="text-center mb-12 animate-slide-up">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="text-gradient">无法下载？</span>
            <br />
            <span className="text-white">画质受限？</span>
          </h2>
          <p className="text-gray-400 text-lg max-w-xl mx-auto">
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
            <div className="mt-6 pt-6 border-t border-surface-lighter">
              <FormatSelector />
            </div>
          )}

          <div className="mt-8 flex flex-col sm:flex-row gap-4">
            <button
              onClick={checkUrls}
              disabled={urls.length === 0 || checkingUrls}
              className="btn-secondary flex-1 flex items-center justify-center gap-2"
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
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  预览视频
                </>
              )}
            </button>

            <button
              onClick={handleStart}
              disabled={urls.length === 0 || loading}
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
                  开始下载 ({urls.length})
                </>
              )}
            </button>
          </div>

          {videoInfos.length > 0 && (
            <div className="mt-6 p-4 bg-gold/10 rounded-xl border border-gold/20">
              <p className="text-sm text-gold">
                ✓ 已识别 {videoInfos.length} 个视频，点击「开始下载」即可
              </p>
            </div>
          )}
        </div>

        <FeatureCards />

        {/* Pain Points */}
        <div className="mt-12 grid md:grid-cols-2 gap-6 animate-slide-up">
          <div className="glass-card p-6">
            <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
              <span className="text-red-400">✕</span> 还在忍受这些？
            </h3>
            <ul className="space-y-2 text-gray-400 text-sm">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                需要安装各种插件和软件
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                下载的视频有水印或画质差
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                批量下载需要反复操作
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                下载速度慢还经常失败
              </li>
            </ul>
          </div>

          <div className="glass-card p-6 border-gold/20">
            <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
              <span className="text-gold">✓</span> VideoGrab 帮你解决
            </h3>
            <ul className="space-y-2 text-gray-400 text-sm">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-gold" />
                浏览器直接使用，无需安装
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-gold" />
                原始画质，无水印无压缩
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-gold" />
                批量添加，一键同时下载
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-gold" />
                多线程加速，稳定高速
              </li>
            </ul>
          </div>
        </div>
      </main>

      <footer className="py-6 text-center text-gray-500 text-sm">
        <p>VideoGrab © 2026 · 本地处理，保护隐私</p>
      </footer>
    </div>
  );
}
