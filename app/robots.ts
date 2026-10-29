import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '');

  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          '/explore',
          '/explore/*',
          '/contact',
          '/faq',
          '/blog',
          '/blog/*',
          '/about',
          '/privacy',
          '/terms',
        ],
        disallow: [
          '/dashboard',
          '/dashboard/*',
          '/batches',
          '/batches/*',
          '/assignments',
          '/assignments/*',
          '/attendance',
          '/attendance/*',
          '/fees',
          '/fees/*',
          '/my-fees',
          '/settings',
          '/settings/*',
          '/users',
          '/users/*',
          '/super-admin',
          '/super-admin/*',
          '/change-password',
          '/reset-password',
          '/forgot-password',
          '/login',
          '/api/',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
