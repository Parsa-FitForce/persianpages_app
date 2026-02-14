import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();
const SITE_URL = 'https://persianpages.com';

let listingsSitemapCache: { xml: string; timestamp: number } | null = null;
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

// Sitemap index
router.get('/sitemap.xml', (_req: Request, res: Response) => {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>${SITE_URL}/api/sitemap-listings.xml</loc>
  </sitemap>
</sitemapindex>`;

  res.set('Content-Type', 'application/xml');
  res.send(xml);
});

// Listings sitemap
router.get('/sitemap-listings.xml', async (_req: Request, res: Response) => {
  try {
    // Return cached version if still fresh
    if (listingsSitemapCache && Date.now() - listingsSitemapCache.timestamp < CACHE_TTL) {
      res.set('Content-Type', 'application/xml');
      return res.send(listingsSitemapCache.xml);
    }

    const listings = await prisma.listing.findMany({
      where: { isActive: true },
      select: { id: true, slug: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
    });

    const urls = listings
      .map(
        (listing) =>
          `  <url>
    <loc>${SITE_URL}/listing/${listing.slug || listing.id}</loc>
    <lastmod>${listing.updatedAt.toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`
      )
      .join('\n');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

    listingsSitemapCache = { xml, timestamp: Date.now() };

    res.set('Content-Type', 'application/xml');
    res.send(xml);
  } catch (error) {
    console.error('Sitemap generation error:', error);
    res.status(500).send('Error generating sitemap');
  }
});

export default router;
