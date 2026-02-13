import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.primatetrading.com';
  
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/admin/',
          '/signup',
          '/signin',
          '/trades',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}


