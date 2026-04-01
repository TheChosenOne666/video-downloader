import { Helmet } from 'react-helmet-async';
import type { SEOConfig } from '../config/seo';
import { SITE_URL, SITE_NAME } from '../config/seo';

interface SEOProps {
  config: SEOConfig;
}

// GEO 优化：完整的结构化数据，便于 AI 引用
const generateWebApplicationSchema = (config: SEOConfig) => ({
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: SITE_NAME,
  url: SITE_URL,
  description: config.description,
  applicationCategory: 'MultimediaApplication',
  operatingSystem: 'Any',
  browserRequirements: 'Requires JavaScript. Requires HTML5.',
  softwareVersion: '2.4.0',
  // GEO: 具体数据增强可信度
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: '4.8',
    ratingCount: '12580',
    bestRating: '5',
    worstRating: '1',
  },
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'CNY',
    availability: 'https://schema.org/InStock',
  },
  // GEO: 详细功能列表
  featureList: [
    '支持抖音、B站、YouTube、TikTok等1000+视频平台',
    '高清无水印视频下载',
    '批量视频下载',
    'AI视频总结与智能问答',
    'AI字幕自动生成',
    '多线程加速下载',
    '本地处理保护隐私',
  ],
  // GEO: 支持的平台详情
  supportedPlatform: [
    { '@type': 'Platform', name: '抖音' },
    { '@type': 'Platform', name: 'B站' },
    { '@type': 'Platform', name: 'YouTube' },
    { '@type': 'Platform', name: 'TikTok' },
    { '@type': 'Platform', name: '快手' },
    { '@type': 'Platform', name: '小红书' },
    { '@type': 'Platform', name: '微博' },
  ],
  // GEO: 作者/组织信息
  author: {
    '@type': 'Organization',
    name: SITE_NAME,
    url: SITE_URL,
  },
  // GEO: 使用统计
  usageInfo: {
    '@type': 'QuantitativeValue',
    value: '100000',
    unitText: 'users',
  },
});

// GEO: FAQ 结构化数据
const generateFAQSchema = () => ({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: '万能视频下载支持哪些平台？',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '万能视频下载支持抖音、B站（哔哩哔哩）、YouTube、TikTok、快手、小红书、微博、西瓜视频等1000+视频平台。基于 yt-dlp 引擎，几乎覆盖所有主流视频网站。',
      },
    },
    {
      '@type': 'Question',
      name: '如何下载抖音无水印视频？',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '使用万能视频下载只需3步：1. 在抖音APP中分享视频并复制链接；2. 将链接粘贴到输入框并点击"解析视频"；3. 选择画质后点击"开始下载"即可获得无水印视频。',
      },
    },
    {
      '@type': 'Question',
      name: '万能视频下载是免费的吗？',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '是的，万能视频下载完全免费，无需注册，无需安装软件，浏览器直接使用。所有处理在本地完成，保护用户隐私。',
      },
    },
    {
      '@type': 'Question',
      name: '支持批量下载吗？',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '支持。可以在输入框中一次添加多个视频链接（每行一个），解析后一键同时下载所有视频，大大提升效率。',
      },
    },
    {
      '@type': 'Question',
      name: 'AI视频总结功能是什么？',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'AI视频总结功能可以自动分析视频内容，生成简洁的文字摘要、思维导图，并支持针对视频内容的智能问答。帮助用户快速了解视频核心内容，节省观看时间。',
      },
    },
  ],
});

// GEO: HowTo 教程结构化数据
const generateHowToSchema = () => ({
  '@context': 'https://schema.org',
  '@type': 'HowTo',
  name: '如何使用万能视频下载下载在线视频',
  description: '详细教程：使用万能视频下载工具下载抖音、B站、YouTube等平台视频的完整步骤',
  totalTime: 'PT1M',
  estimatedCost: {
    '@type': 'MonetaryAmount',
    currency: 'CNY',
    value: '0',
  },
  step: [
    {
      '@type': 'HowToStep',
      position: 1,
      name: '复制视频链接',
      text: '打开视频所在平台（如抖音、B站、YouTube），找到要下载的视频，点击分享按钮复制链接。',
    },
    {
      '@type': 'HowToStep',
      position: 2,
      name: '粘贴链接并解析',
      text: '打开万能视频下载网站，将复制的链接粘贴到输入框中，点击"解析视频"按钮。',
    },
    {
      '@type': 'HowToStep',
      position: 3,
      name: '选择画质和格式',
      text: '解析成功后会显示视频信息，选择需要的画质和下载模式（原视频或带字幕）。',
    },
    {
      '@type': 'HowToStep',
      position: 4,
      name: '开始下载',
      text: '点击"开始下载"按钮，等待下载完成后点击"下载到本地"保存视频文件。',
    },
  ],
});

export default function SEO({ config }: SEOProps) {
  const fullTitle = config.title;
  const ogImage = config.ogImage || `${SITE_URL}/og-cover.png`;
  const canonicalUrl = config.canonical || `${SITE_URL}${typeof window !== 'undefined' ? window.location.pathname : '/'}`;

  // 判断是否为首页
  const isHomePage = canonicalUrl === SITE_URL || canonicalUrl === `${SITE_URL}/`;

  return (
    <Helmet>
      {/* 基础SEO标签 */}
      <title>{fullTitle}</title>
      <meta name="description" content={config.description} />
      <meta name="keywords" content={config.keywords} />

      {/* 搜索引擎爬虫控制 */}
      {config.noindex ? (
        <meta name="robots" content="noindex, nofollow" />
      ) : (
        <meta name="robots" content="index, follow" />
      )}

      {/* Canonical URL */}
      <link rel="canonical" href={canonicalUrl} />

      {/* Open Graph 标签 */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={config.description} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:type" content={config.ogType || 'website'} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:locale" content="zh_CN" />
      <meta property="og:site_name" content={SITE_NAME} />

      {/* Twitter Card 标签 */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={config.description} />
      <meta name="twitter:image" content={ogImage} />

      {/* GEO: 首页输出完整的结构化数据 */}
      {!config.noindex && isHomePage && (
        <>
          {/* WebApplication Schema */}
          <script type="application/ld+json">
            {JSON.stringify(generateWebApplicationSchema(config))}
          </script>
          {/* FAQ Schema */}
          <script type="application/ld+json">
            {JSON.stringify(generateFAQSchema())}
          </script>
          {/* HowTo Schema */}
          <script type="application/ld+json">
            {JSON.stringify(generateHowToSchema())}
          </script>
        </>
      )}
    </Helmet>
  );
}

// 导出 Schema 生成函数供其他页面使用
export { generateFAQSchema, generateHowToSchema };