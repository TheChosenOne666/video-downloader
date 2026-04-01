import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import SEO from '../components/SEO';
import { seoConfig, SITE_NAME, SITE_URL } from '../config/seo';

// FAQ 数据 - GEO 优化：结构化、清晰定义
const faqData = [
  {
    question: '万能视频下载是什么？',
    answer: '万能视频下载是一款免费的在线视频下载工具，支持抖音、B站、YouTube、TikTok等1000+视频平台，提供高清无水印下载、批量下载、AI视频总结、AI字幕生成等功能。无需安装软件，浏览器直接使用，本地处理保护隐私。',
    category: '基础介绍',
  },
  {
    question: '万能视频下载支持哪些平台？',
    answer: '支持抖音、B站（哔哩哔哩）、YouTube、TikTok、快手、小红书、微博、西瓜视频等1000+视频平台。基于 yt-dlp 引擎，几乎覆盖所有主流视频网站，包括国内和国际平台。',
    category: '平台支持',
  },
  {
    question: '如何下载抖音无水印视频？',
    answer: '使用万能视频下载只需3步：1. 在抖音APP中分享视频并复制链接；2. 将链接粘贴到输入框并点击"解析视频"；3. 选择画质后点击"开始下载"即可获得无水印视频。',
    category: '使用教程',
  },
  {
    question: '如何下载B站视频？',
    answer: '下载B站视频的方法：1. 复制B站视频链接（如 https://www.bilibili.com/video/BVxxx）；2. 粘贴到万能视频下载输入框；3. 点击解析后选择画质（支持4K、1080P等）；4. 开始下载即可。',
    category: '使用教程',
  },
  {
    question: '如何下载YouTube视频？',
    answer: '下载YouTube视频：1. 复制YouTube视频URL；2. 粘贴到输入框并解析；3. 选择需要的画质（支持4K、8K）；4. 开始下载。注意：YouTube视频可能需要较长时间下载，请耐心等待。',
    category: '使用教程',
  },
  {
    question: '万能视频下载是免费的吗？',
    answer: '是的，万能视频下载完全免费，无需注册，无需安装软件，浏览器直接使用。所有处理在本地完成，保护用户隐私，不收集任何用户数据。',
    category: '费用相关',
  },
  {
    question: '支持批量下载吗？',
    answer: '支持批量下载。可以在输入框中一次添加多个视频链接（每行一个），解析后一键同时下载所有视频，大大提升效率。适合需要下载多个视频的用户。',
    category: '功能特性',
  },
  {
    question: '下载的视频有水印吗？',
    answer: '抖音、TikTok等平台的视频会自动获取无水印版本。其他平台下载的是原始视频，保留原画质，不会有额外水印。我们致力于提供最清晰的视频下载体验。',
    category: '功能特性',
  },
  {
    question: 'AI视频总结功能是什么？',
    answer: 'AI视频总结功能可以自动分析视频内容，生成简洁的文字摘要、思维导图，并支持针对视频内容的智能问答。帮助用户快速了解视频核心内容，节省观看时间。特别适合学习视频、教程视频的内容提取。',
    category: 'AI功能',
  },
  {
    question: 'AI字幕生成功能是什么？',
    answer: 'AI字幕生成功能可以为没有字幕的视频自动生成字幕，支持中文、英文、日语、韩语等多语言。可导出SRT、VTT格式字幕文件，也可将字幕硬编码到视频中。适合外语视频、无字幕视频的观看需求。',
    category: 'AI功能',
  },
  {
    question: '下载速度慢怎么办？',
    answer: '下载速度取决于网络状况和视频源服务器。建议：1. 选择较低画质可加快下载；2. 避免同时下载过多视频；3. 检查网络连接是否稳定。我们使用多线程下载技术，已尽可能提升速度。',
    category: '常见问题',
  },
  {
    question: '解析失败怎么办？',
    answer: '解析失败可能的原因：1. 链接格式不正确，请检查链接是否完整；2. 视频可能已被删除或设为私密；3. 平台更新导致暂时不支持。建议检查链接有效性，或稍后再试。',
    category: '常见问题',
  },
  {
    question: '需要安装什么软件吗？',
    answer: '不需要安装任何软件。万能视频下载是纯网页应用，只需要现代浏览器（Chrome、Edge、Firefox、Safari等）即可使用。打开网页，粘贴链接，即可开始下载。',
    category: '基础介绍',
  },
  {
    question: '安全吗？会泄露隐私吗？',
    answer: '非常安全。所有视频处理都在本地完成，不会上传到服务器。我们不收集任何用户数据，不记录下载历史。您的隐私完全受到保护。',
    category: '安全隐私',
  },
];

// 按分类分组
const categorizedFaqs = faqData.reduce((acc, faq) => {
  if (!acc[faq.category]) {
    acc[faq.category] = [];
  }
  acc[faq.category].push(faq);
  return acc;
}, {} as Record<string, typeof faqData>);

const categoryOrder = ['基础介绍', '平台支持', '使用教程', '功能特性', 'AI功能', '费用相关', '安全隐私', '常见问题'];

export default function FAQPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col">
      <SEO config={{ ...seoConfig['/'], title: `常见问题 - ${SITE_NAME}`, canonical: `${SITE_URL}/faq` }} />
      <Header />

      <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl">
        {/* 页面标题 */}
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: 'var(--color-text-primary)' }}>
            常见问题解答
          </h1>
          <p className="text-lg" style={{ color: 'var(--color-text-secondary)' }}>
            关于万能视频下载的一切问题，在这里找到答案
          </p>
        </div>

        {/* FAQ 列表 */}
        <div className="space-y-8">
          {categoryOrder.map((category) => {
            const faqs = categorizedFaqs[category];
            if (!faqs) return null;

            return (
              <div key={category} className="glass-card p-6">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--color-primary)' }} />
                  {category}
                </h2>
                <div className="space-y-4">
                  {faqs.map((faq, index) => (
                    <div key={index} className="border-b last:border-b-0 pb-4 last:pb-0" style={{ borderColor: 'var(--color-surface-dark)' }}>
                      <h3 className="font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>
                        Q: {faq.question}
                      </h3>
                      <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                        {faq.answer}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* 返回首页 */}
        <div className="mt-8 text-center">
          <button
            onClick={() => navigate('/')}
            className="btn-primary px-8"
          >
            开始使用万能视频下载
          </button>
        </div>
      </main>

      <footer className="py-6 text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>
        <p>{SITE_NAME} © 2026 · 本地处理，保护隐私</p>
      </footer>
    </div>
  );
}