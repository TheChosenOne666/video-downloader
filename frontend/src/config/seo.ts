const SITE_URL = 'https://xiaolou.video';
const SITE_NAME = '万能视频下载';

export interface SEOConfig {
  title: string;
  description: string;
  keywords: string;
  ogType?: string;
  ogImage?: string;
  noindex?: boolean;
  canonical?: string;
}

export const seoConfig: Record<string, SEOConfig> = {
  '/': {
    title: '万能视频下载 - 抖音/B站/YouTube高清无水印下载工具 | 万能视频下载',
    description: '万能视频下载是一款免费的在线视频下载工具，支持抖音、B站、YouTube、TikTok、快手等1000+平台，提供高清无水印下载、批量下载、AI视频总结、字幕生成等功能。无需安装软件，浏览器直接使用，本地处理保护隐私。',
    keywords: '万能视频下载,视频下载器,视频下载工具,抖音视频下载,B站视频下载,YouTube下载,无水印视频下载,批量视频下载,AI视频总结,视频字幕提取',
    ogType: 'website',
    ogImage: `${SITE_URL}/og-cover.png`,
    canonical: SITE_URL,
  },
  '/progress': {
    title: '下载进度 - 万能视频下载',
    description: '视频下载进度追踪页面，实时查看下载状态和速度。',
    keywords: '视频下载进度,下载状态',
    noindex: true,
  },
  '/complete': {
    title: '下载完成 - 万能视频下载',
    description: '视频下载完成，点击下载到本地保存文件。',
    keywords: '下载完成,视频保存',
    noindex: true,
  },
  '/summarize': {
    title: 'AI视频总结 - 智能摘要与思维导图 | 万能视频下载',
    description: '基于AI技术自动分析视频内容，生成智能摘要、思维导图和知识问答，快速了解视频核心内容。',
    keywords: 'AI视频总结,视频摘要,思维导图,视频内容分析,AI问答',
    ogType: 'article',
  },
  '/subtitle': {
    title: 'AI字幕生成 - 视频自动添加字幕 | 万能视频下载',
    description: '为没有字幕的视频自动生成字幕，支持中文、英文、日语、韩语等多语言，可导出SRT/VTT格式或硬编码到视频中。',
    keywords: 'AI字幕生成,视频字幕,自动字幕,字幕提取,SRT字幕',
    ogType: 'article',
  },
  '/faq': {
    title: '常见问题解答 - 万能视频下载使用帮助',
    description: '万能视频下载常见问题解答，包括支持平台、使用教程、功能介绍等。帮助你快速上手视频下载工具。',
    keywords: '万能视频下载帮助,视频下载教程,常见问题,使用指南',
    ogType: 'article',
  },
  '/tutorial': {
    title: '使用教程 - 万能视频下载详细步骤指南',
    description: '万能视频下载详细使用教程，包括抖音、B站、YouTube等平台的下载步骤，批量下载教程，AI功能使用指南。',
    keywords: '万能视频下载教程,抖音下载教程,B站下载教程,YouTube下载教程,批量下载',
    ogType: 'article',
  },
};

export const defaultSEO: SEOConfig = {
  title: SITE_NAME,
  description: '万能视频下载 - 一键解析全网视频，支持抖音、B站、YouTube等平台，高清无水印下载，AI智能总结。',
  keywords: '万能视频下载,视频下载器,视频下载工具',
};

export { SITE_URL, SITE_NAME };
