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
    gradient: 'from-yellow-400 to-orange-500',
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
    gradient: 'from-purple-400 to-pink-500',
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
    gradient: 'from-blue-400 to-cyan-500',
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
    gradient: 'from-green-400 to-teal-500',
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
          className="feature-card group text-left relative overflow-hidden"
          style={{ animationDelay: `${index * 100}ms` }}
        >
          {/* 背景光效 */}
          <div 
            className={`absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-300 bg-gradient-to-br ${feature.gradient}`}
          />
          
          <div 
            className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-4 transition-transform group-hover:scale-110 group-hover:rotate-3`}
            style={{ color: '#ffffff', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
          >
            {feature.icon}
          </div>
          <h3 className="font-semibold mb-1 group-hover:text-primary transition-colors" style={{ color: 'var(--color-text-primary)' }}>
            {feature.title}
          </h3>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{feature.desc}</p>
          
          {/* 箭头指示 */}
          <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-2 group-hover:translate-x-0">
            <svg className="w-5 h-5" style={{ color: 'var(--color-primary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </button>
      ))}
    </div>
  );
}
