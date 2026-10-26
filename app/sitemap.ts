import type { MetadataRoute } from 'next';
import { serverFetch } from '@/lib/server-api';
import { getCenterData } from '@/lib/center';

export const dynamic = 'force-dynamic';

interface SitemapApiResponse {
  batches: Array<{
    slug: string;
    updatedAt?: string;
  }>;
  blogPosts: Array<{
    slug: string;
    updatedAt?: string;
  }>;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '');
  const center = await getCenterData();

  // If public site is disabled, return only privacy & terms
  if (center.features?.publicSite === false) {
    return [
      {
        url: `${baseUrl}/privacy`,
        lastModified: new Date(),
        changeFrequency: 'monthly',
        priority: 0.3,
      },
      {
        url: `${baseUrl}/terms`,
        lastModified: new Date(),
        changeFrequency: 'monthly',
        priority: 0.3,
      },
    ];
  }

  // Core public static routes
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/explore`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/faq`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.3,
    },
  ];

  if (center.features?.blog !== false) {
    staticRoutes.push({
      url: `${baseUrl}/blog`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    });
  }

  // Dynamic routes from backend sitemap feed
  try {
    const sitemapRes = await serverFetch<SitemapApiResponse>('/api/public/sitemap');
    if (sitemapRes.ok && sitemapRes.data) {
      const { batches = [], blogPosts = [] } = sitemapRes.data;

      const dynamicBatches: MetadataRoute.Sitemap = batches.map((b) => ({
        url: `${baseUrl}/explore/${b.slug}`,
        lastModified: b.updatedAt ? new Date(b.updatedAt) : new Date(),
        changeFrequency: 'weekly',
        priority: 0.8,
      }));

      const dynamicBlog: MetadataRoute.Sitemap =
        center.features?.blog !== false
          ? blogPosts.map((p) => ({
              url: `${baseUrl}/blog/${p.slug}`,
              lastModified: p.updatedAt ? new Date(p.updatedAt) : new Date(),
              changeFrequency: 'monthly',
              priority: 0.7,
            }))
          : [];

      return [...staticRoutes, ...dynamicBatches, ...dynamicBlog];
    }
  } catch {
    // Fail gracefully to static routes if backend is unavailable
  }

  return staticRoutes;
}
