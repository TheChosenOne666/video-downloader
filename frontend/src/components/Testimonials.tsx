const testimonials = [
  {
    avatar: '👨‍💻',
    name: '程序员小张',
    content: '终于不用装各种软件了，浏览器直接搞定，太方便了！',
    rating: 5,
  },
  {
    avatar: '🎬',
    name: 'UP主阿文',
    content: '批量下载功能很实用，素材收集效率翻倍。AI 总结功能也很惊艳。',
    rating: 5,
  },
  {
    avatar: '👩‍🎓',
    name: '研究生小美',
    content: '论文需要的视频资料都能下载了，画质也很清晰，拯救了我的毕设！',
    rating: 5,
  },
];

export default function Testimonials() {
  return (
    <div className="mt-16 mb-12">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--color-text-primary)' }}>
          用户好评如潮
        </h2>
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          已服务 10 万+ 用户
        </p>
      </div>
      
      <div className="grid md:grid-cols-3 gap-6">
        {testimonials.map((item, index) => (
          <div
            key={index}
            className="glass-card p-6 relative group hover:scale-[1.02] transition-transform"
          >
            {/* 引号装饰 */}
            <div 
              className="absolute top-4 right-4 text-4xl opacity-20"
              style={{ color: 'var(--color-primary)' }}
            >
              "
            </div>
            
            {/* 评分 */}
            <div className="flex gap-1 mb-3">
              {Array.from({ length: item.rating }).map((_, i) => (
                <span key={i} className="text-yellow-400">⭐</span>
              ))}
            </div>
            
            {/* 内容 */}
            <p className="text-sm mb-4 leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
              {item.content}
            </p>
            
            {/* 用户信息 */}
            <div className="flex items-center gap-3">
              <div className="text-2xl">{item.avatar}</div>
              <div className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                {item.name}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
