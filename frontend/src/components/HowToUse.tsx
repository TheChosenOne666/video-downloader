const steps = [
  {
    step: 1,
    title: '粘贴链接',
    desc: '复制视频链接，粘贴到输入框',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ),
  },
  {
    step: 2,
    title: '解析视频',
    desc: '自动获取视频信息与画质选项',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    ),
  },
  {
    step: 3,
    title: '一键下载',
    desc: '选择画质，点击下载即可',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
      </svg>
    ),
  },
];

export default function HowToUse() {
  return (
    <div className="mt-16 mb-12">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--color-text-primary)' }}>
          三步搞定
        </h2>
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          简单、快速、无门槛
        </p>
      </div>
      
      <div className="grid md:grid-cols-3 gap-6">
        {steps.map((item, index) => (
          <div 
            key={index} 
            className="relative glass-card p-6 group hover:scale-[1.02] transition-transform"
          >
            {/* 步骤序号 */}
            <div 
              className="absolute -top-3 -left-3 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white"
              style={{ 
                background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-light) 100%)',
                boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
              }}
            >
              {item.step}
            </div>
            
            {/* 图标 */}
            <div 
              className="w-14 h-14 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"
              style={{ 
                color: 'var(--color-primary)',
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(59, 130, 246, 0.05) 100%)'
              }}
            >
              {item.icon}
            </div>
            
            <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>
              {item.title}
            </h3>
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
              {item.desc}
            </p>
            
            {/* 箭头 (非最后一项) */}
            {index < steps.length - 1 && (
              <div 
                className="hidden md:block absolute top-1/2 -right-3 transform -translate-y-1/2"
                style={{ color: 'var(--color-primary)' }}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
