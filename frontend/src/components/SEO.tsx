import { Helmet } from 'react-helmet-async';
import type { SEOConfig } from '../config/seo';
import { SITE_URL, SITE_NAME } from '../config/seo';

interface SEOProps {
  config: SEOConfig;
}

export default function SEO({ config }: SEOProps) {
  const fullTitle = config.title;
  const ogImage = config.ogImage || `${SITE_URL}/og-cover.png`;
  const canonicalUrl = config.canonical || `${SITE_URL}${typeof window !== 'undefined' ? window.location.pathname : '/'}`;

  // JSON-LD 结构化数据 - 只为首页生成
  const jsonLd = config.noindex ? null : (() => {
    if (canonicalUrl === SITE_URL || canonicalUrl === `${SITE_URL}/`) {
      return {
        '@context': 'https://schema.org',
        '@type': 'WebApplication',
        name: SITE_NAME,
        url: SITE_URL,
        description: config.description,
        applicationCategory: 'MultimediaApplication',
        operatingSystem: 'Any',
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'CNY',
        },
        featureList: [
          '抖音/B站/YouTube等1000+平台支持',
          '高清无水印视频下载',
          '批量视频下载',
          'AI视频总结与智能问答',
          'AI字幕自动生成',
        ],
      };
    }
    return null;
  })();

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

      {/* Schema.org 结构化数据 */}
      {jsonLd && (
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      )}
    </Helmet>
  );
}
