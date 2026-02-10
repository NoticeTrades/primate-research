import { MetadataRoute } from 'next';
import { researchArticles, generateSlug } from '../data/research';

export default function sitemap(): MetadataRoute.Sitemap {
  // Normalize baseUrl to remove trailing slash
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.primatetrading.com').replace(/\/$/, '');
  const currentDate = new Date();

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: currentDate,
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/research`,
      lastModified: currentDate,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/videos`,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
  ];

  // Research articles
  const articlePages: MetadataRoute.Sitemap = researchArticles.map((article) => {
    const slug = article.slug || generateSlug(article.title);
    const articleDate = article.date ? new Date(article.date) : currentDate;
    
    return {
      url: `${baseUrl}/research/${slug}`,
      lastModified: articleDate,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    };
  });

  // Crypto ticker pages (for supported cryptos)
  const supportedCryptos = ['BTC', 'ETH', 'SOL', 'ADA', 'DOT', 'MATIC', 'AVAX', 'LINK', 'UNI', 'ATOM', 'XRP', 'DOGE', 'SHIB', 'LTC', 'BCH', 'XLM', 'ALGO', 'NEAR', 'FTM', 'SAND', 'MANA', 'APE', 'ARB', 'OP', 'SUI', 'APT'];
  const tickerPages: MetadataRoute.Sitemap = supportedCryptos.map((symbol) => ({
    url: `${baseUrl}/ticker/${symbol}`,
    lastModified: currentDate,
    changeFrequency: 'daily' as const,
    priority: 0.7,
  }));

  return [...staticPages, ...articlePages, ...tickerPages];
}

