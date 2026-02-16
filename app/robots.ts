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
          // '/trades' removed so Google can index it (it's in the sitemap)
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}


