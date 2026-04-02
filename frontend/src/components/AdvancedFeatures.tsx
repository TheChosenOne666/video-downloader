const features = [
  {
    icon: '⚡',
    title: '极速下载',
    desc: '多线程并发技术，下载速度提升 10 倍',
    gradient: 'from-yellow-400 to-orange-500',
  },
  {
    icon: '🎬',
    title: '高清画质',
    desc: '支持 4K/8K 超清画质，无水印无压缩',
    gradient: 'from-blue-400 to-cyan-500',
  },
  {
    icon: '📝',
    title: 'AI 字幕',
    desc: '自动识别语音，生成精准字幕文件',
    gradient: 'from-purple-400 to-pink-500',
  },
  {
    icon: '📊',
    title: 'AI 总结',
    desc: '智能分析视频内容，生成摘要与思维导图',
    gradient: 'from-green-400 to-teal-500',
  },
  {
    icon: '🔒',
    title: '隐私保护',
    desc: '本地处理，数据不上传服务器',
    gradient: 'from-slate-400 to-gray-600',
  },
  {
    icon: '📦',
    title: '批量处理',
    desc: '一次添加多个链接，自动排队下载',
    gradient: 'from-indigo-400 to-blue-500',
  },
];

export default function AdvancedFeatures() {
  return (
    <div className="mt-16 mb-12">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--color-text-primary)' }}>
          强大功能，一应俱全
        </h2>
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          不只是下载，更是你的视频助手
        </p>
      </div>
      
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {features.map((feature, index) => (
          <div
            key={index}
            className="glass-card p-5 group hover:scale-[1.02] transition-all duration-300 cursor-default"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div className="flex items-start gap-4">
              {/* 图标容器 */}
              <div 
                className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center text-xl flex-shrink-0 group-hover:scale-110 transition-transform`}
                style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
              >
                {feature.icon}
              </div>
              
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold mb-1" style={{ color: 'var(--color-text-primary)' }}>
                  {feature.title}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
                  {feature.desc}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
