import { useApp } from '../context/AppContext';

const features = [
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    title: '极速下载',
    desc: '多线程并发下载，速度提升10倍',
    page: 'home' as const,
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    title: 'AI 字幕生成',
    desc: '为无字幕视频自动生成字幕',
    page: 'subtitle' as const,
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
      </svg>
    ),
    title: '批量下载',
    desc: '一次添加多个链接，同时处理',
    page: 'home' as const,
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
    title: '安全可靠',
    desc: '本地处理，数据不上传服务器',
    page: 'home' as const,
  },
];

export default function FeatureCards() {
  const { setPage } = useApp();

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
      {features.map((feature, index) => (
        <button
          key={index}
          onClick={() => setPage(feature.page)}
          className="feature-card group text-left"
        >
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gold/20 to-gold/5 flex items-center justify-center mb-4 text-gold group-hover:scale-110 transition-transform">
            {feature.icon}
          </div>
          <h3 className="font-semibold text-white mb-1">{feature.title}</h3>
          <p className="text-sm text-gray-500">{feature.desc}</p>
        </button>
      ))}
    </div>
  );
}
