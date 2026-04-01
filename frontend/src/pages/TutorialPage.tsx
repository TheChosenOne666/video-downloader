import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import SEO from '../components/SEO';
import { seoConfig, SITE_NAME, SITE_URL } from '../config/seo';

// 教程步骤数据
const tutorials = [
  {
    title: '如何下载抖音视频',
    platform: '抖音',
    icon: '📱',
    steps: [
      { step: 1, title: '复制链接', desc: '打开抖音APP，找到要下载的视频，点击分享按钮，选择"复制链接"' },
      { step: 2, title: '粘贴链接', desc: '打开万能视频下载网站，将链接粘贴到输入框中' },
      { step: 3, title: '解析视频', desc: '点击"解析视频"按钮，等待系统获取视频信息' },
      { step: 4, title: '选择画质', desc: '解析成功后，选择需要的画质（推荐高清）' },
      { step: 5, title: '开始下载', desc: '点击"开始下载"，等待完成后保存到本地' },
    ],
    tips: '抖音视频会自动获取无水印版本，画质清晰无损失。',
  },
  {
    title: '如何下载B站视频',
    platform: 'B站',
    icon: '📺',
    steps: [
      { step: 1, title: '复制链接', desc: '打开B站视频页面，复制浏览器地址栏的URL' },
      { step: 2, title: '粘贴解析', desc: '将链接粘贴到万能视频下载输入框，点击解析' },
      { step: 3, title: '选择画质', desc: 'B站支持多种画质，根据需要选择（4K/1080P/720P）' },
      { step: 4, title: '开始下载', desc: '点击开始下载，等待完成后保存文件' },
    ],
    tips: 'B站高清视频可能需要会员权限，建议登录后再复制链接。',
  },
  {
    title: '如何下载YouTube视频',
    platform: 'YouTube',
    icon: '🎬',
    steps: [
      { step: 1, title: '复制URL', desc: '打开YouTube视频页面，复制完整URL地址' },
      { step: 2, title: '粘贴解析', desc: '粘贴到输入框，点击解析视频' },
      { step: 3, title: '选择格式', desc: 'YouTube支持多种画质和格式，按需选择' },
      { step: 4, title: '下载保存', desc: '开始下载，等待完成后保存到本地' },
    ],
    tips: 'YouTube 4K/8K视频文件较大，下载时间较长，请确保网络稳定。',
  },
  {
    title: '如何批量下载视频',
    platform: '批量',
    icon: '📦',
    steps: [
      { step: 1, title: '添加多个链接', desc: '在输入框中粘贴多个视频链接，每行一个' },
      { step: 2, title: '解析全部', desc: '点击解析视频，系统会依次解析所有链接' },
      { step: 3, title: '统一设置', desc: '选择统一的画质和下载模式' },
      { step: 4, title: '一键下载', desc: '点击开始下载，所有视频将同时下载' },
    ],
    tips: '批量下载建议控制在10个以内，避免占用过多带宽。',
  },
  {
    title: '如何使用AI视频总结',
    platform: 'AI',
    icon: '🤖',
    steps: [
      { step: 1, title: '解析视频', desc: '先按正常流程解析视频链接' },
      { step: 2, title: '进入AI总结', desc: '点击"AI视频总结"按钮进入总结页面' },
      { step: 3, title: '生成摘要', desc: '点击"生成摘要"获取视频内容总结' },
      { step: 4, title: '查看思维导图', desc: '切换到思维导图标签，可视化查看内容结构' },
      { step: 5, title: 'AI问答', desc: '在问答标签中提问，获取针对视频内容的回答' },
    ],
    tips: 'AI总结功能适合学习视频、教程视频，帮助快速提取核心内容。',
  },
];

export default function TutorialPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col">
      <SEO config={{ ...seoConfig['/'], title: `使用教程 - ${SITE_NAME}`, canonical: `${SITE_URL}/tutorial` }} />
      <Header />

      <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl">
        {/* 页面标题 */}
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: 'var(--color-text-primary)' }}>
            使用教程
          </h1>
          <p className="text-lg" style={{ color: 'var(--color-text-secondary)' }}>
            详细步骤指南，助你轻松掌握万能视频下载
          </p>
        </div>

        {/* 快速入门 */}
        <div className="glass-card p-6 mb-8">
          <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--color-text-primary)' }}>
            ⚡ 快速入门（3步上手）
          </h2>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--color-surface-light)' }}>
              <div className="text-2xl font-bold mb-2" style={{ color: 'var(--color-primary)' }}>1</div>
              <div className="font-medium mb-1" style={{ color: 'var(--color-text-primary)' }}>复制链接</div>
              <div className="text-sm" style={{ color: 'var(--color-text-muted)' }}>从视频平台复制分享链接</div>
            </div>
            <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--color-surface-light)' }}>
              <div className="text-2xl font-bold mb-2" style={{ color: 'var(--color-primary)' }}>2</div>
              <div className="font-medium mb-1" style={{ color: 'var(--color-text-primary)' }}>粘贴解析</div>
              <div className="text-sm" style={{ color: 'var(--color-text-muted)' }}>粘贴到输入框并点击解析</div>
            </div>
            <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--color-surface-light)' }}>
              <div className="text-2xl font-bold mb-2" style={{ color: 'var(--color-primary)' }}>3</div>
              <div className="font-medium mb-1" style={{ color: 'var(--color-text-primary)' }}>下载保存</div>
              <div className="text-sm" style={{ color: 'var(--color-text-muted)' }}>选择画质并下载到本地</div>
            </div>
          </div>
        </div>

        {/* 详细教程 */}
        <div className="space-y-8">
          {tutorials.map((tutorial, index) => (
            <div key={index} className="glass-card p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
                <span className="text-2xl">{tutorial.icon}</span>
                {tutorial.title}
              </h2>

              {/* 步骤 */}
              <div className="space-y-3 mb-4">
                {tutorial.steps.map((step) => (
                  <div key={step.step} className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold" style={{ backgroundColor: 'var(--color-primary)', color: '#fff' }}>
                      {step.step}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium" style={{ color: 'var(--color-text-primary)' }}>{step.title}</div>
                      <div className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{step.desc}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* 小贴士 */}
              <div className="p-3 rounded-lg" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)' }}>
                <span className="font-medium" style={{ color: 'var(--color-primary)' }}>💡 小贴士：</span>
                <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{tutorial.tips}</span>
              </div>
            </div>
          ))}
        </div>

        {/* 返回首页 */}
        <div className="mt-8 text-center">
          <button
            onClick={() => navigate('/')}
            className="btn-primary px-8"
          >
            立即开始使用
          </button>
        </div>
      </main>

      <footer className="py-6 text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>
        <p>{SITE_NAME} © 2026 · 本地处理，保护隐私</p>
      </footer>
    </div>
  );
}