import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import {
  isSeoEligibleBrowseSource,
  selectCanonicalListings,
} from '../utils/seo.js';
import { citySlugFromFa, countryCodeFromFa } from './meta.js';

const router = Router();
const prisma = new PrismaClient();
const SITE_URL = 'https://persianpages.com';

// Country/city data for browse sitemap (mirrors client locations.ts)
const BROWSE_COUNTRIES = [
  { code: 'us', nameEn: 'United States' },
  { code: 'ca', nameEn: 'Canada' },
  { code: 'de', nameEn: 'Germany' },
  { code: 'ae', nameEn: 'UAE' },
  { code: 'tr', nameEn: 'Turkey' },
  { code: 'gb', nameEn: 'United Kingdom' },
  { code: 'se', nameEn: 'Sweden' },
  { code: 'au', nameEn: 'Australia' },
  { code: 'fr', nameEn: 'France' },
  { code: 'nl', nameEn: 'Netherlands' },
  { code: 'at', nameEn: 'Austria' },
  { code: 'it', nameEn: 'Italy' },
  { code: 'es', nameEn: 'Spain' },
  { code: 'no', nameEn: 'Norway' },
  { code: 'dk', nameEn: 'Denmark' },
  { code: 'be', nameEn: 'Belgium' },
  { code: 'ch', nameEn: 'Switzerland' },
  { code: 'nz', nameEn: 'New Zealand' },
  { code: 'jp', nameEn: 'Japan' },
  { code: 'my', nameEn: 'Malaysia' },
];

// Persian country names used in DB
const COUNTRY_NAMES: Record<string, string> = {
  us: 'آمریکا', ca: 'کانادا', de: 'آلمان', ae: 'امارات', tr: 'ترکیه',
  gb: 'انگلستان', se: 'سوئد', au: 'استرالیا', fr: 'فرانسه', nl: 'هلند',
  at: 'اتریش', it: 'ایتالیا', es: 'اسپانیا', no: 'نروژ', dk: 'دانمارک',
  be: 'بلژیک', ch: 'سوئیس', nz: 'نیوزیلند', jp: 'ژاپن', my: 'مالزی',
};

const BROWSE_CITIES: { nameEn: string; country: string }[] = [
  { nameEn: 'Los Angeles', country: 'us' }, { nameEn: 'Beverly Hills', country: 'us' },
  { nameEn: 'Irvine', country: 'us' }, { nameEn: 'New York', country: 'us' },
  { nameEn: 'Washington DC', country: 'us' }, { nameEn: 'Houston', country: 'us' },
  { nameEn: 'San Francisco', country: 'us' }, { nameEn: 'San Diego', country: 'us' },
  { nameEn: 'Chicago', country: 'us' }, { nameEn: 'Seattle', country: 'us' },
  { nameEn: 'Dallas', country: 'us' }, { nameEn: 'Miami', country: 'us' },
  { nameEn: 'Atlanta', country: 'us' }, { nameEn: 'Boston', country: 'us' },
  { nameEn: 'Las Vegas', country: 'us' }, { nameEn: 'Phoenix', country: 'us' },
  { nameEn: 'Denver', country: 'us' }, { nameEn: 'Portland', country: 'us' },
  { nameEn: 'San Jose', country: 'us' }, { nameEn: 'Glendale', country: 'us' },
  { nameEn: 'Encino', country: 'us' }, { nameEn: 'Santa Monica', country: 'us' },
  { nameEn: 'Woodland Hills', country: 'us' }, { nameEn: 'Palo Alto', country: 'us' },
  { nameEn: 'Sacramento', country: 'us' }, { nameEn: 'Fresno', country: 'us' },
  { nameEn: 'Austin', country: 'us' }, { nameEn: 'San Antonio', country: 'us' },
  { nameEn: 'Great Neck', country: 'us' }, { nameEn: 'Philadelphia', country: 'us' },
  { nameEn: 'Baltimore', country: 'us' }, { nameEn: 'Minneapolis', country: 'us' },
  { nameEn: 'Salt Lake City', country: 'us' },
  { nameEn: 'Toronto', country: 'ca' }, { nameEn: 'Vancouver', country: 'ca' },
  { nameEn: 'Montreal', country: 'ca' }, { nameEn: 'Calgary', country: 'ca' },
  { nameEn: 'Ottawa', country: 'ca' }, { nameEn: 'Edmonton', country: 'ca' },
  { nameEn: 'Winnipeg', country: 'ca' }, { nameEn: 'Richmond Hill', country: 'ca' },
  { nameEn: 'North York', country: 'ca' }, { nameEn: 'Markham', country: 'ca' },
  { nameEn: 'Berlin', country: 'de' }, { nameEn: 'Munich', country: 'de' },
  { nameEn: 'Frankfurt', country: 'de' }, { nameEn: 'Hamburg', country: 'de' },
  { nameEn: 'Cologne', country: 'de' }, { nameEn: 'Dusseldorf', country: 'de' },
  { nameEn: 'Stuttgart', country: 'de' }, { nameEn: 'Hannover', country: 'de' },
  { nameEn: 'Bonn', country: 'de' }, { nameEn: 'Nuremberg', country: 'de' },
  { nameEn: 'Dubai', country: 'ae' }, { nameEn: 'Abu Dhabi', country: 'ae' },
  { nameEn: 'Sharjah', country: 'ae' }, { nameEn: 'Ajman', country: 'ae' },
  { nameEn: 'Istanbul', country: 'tr' }, { nameEn: 'Ankara', country: 'tr' },
  { nameEn: 'Izmir', country: 'tr' }, { nameEn: 'Antalya', country: 'tr' },
  { nameEn: 'Bursa', country: 'tr' }, { nameEn: 'Van', country: 'tr' },
  { nameEn: 'London', country: 'gb' }, { nameEn: 'Manchester', country: 'gb' },
  { nameEn: 'Birmingham', country: 'gb' }, { nameEn: 'Leeds', country: 'gb' },
  { nameEn: 'Glasgow', country: 'gb' }, { nameEn: 'Bristol', country: 'gb' },
  { nameEn: 'Liverpool', country: 'gb' }, { nameEn: 'Newcastle', country: 'gb' },
  { nameEn: 'Stockholm', country: 'se' }, { nameEn: 'Gothenburg', country: 'se' },
  { nameEn: 'Uppsala', country: 'se' }, { nameEn: 'Malmo', country: 'se' },
  { nameEn: 'Linkoping', country: 'se' },
  { nameEn: 'Sydney', country: 'au' }, { nameEn: 'Melbourne', country: 'au' },
  { nameEn: 'Brisbane', country: 'au' }, { nameEn: 'Perth', country: 'au' },
  { nameEn: 'Adelaide', country: 'au' }, { nameEn: 'Canberra', country: 'au' },
  { nameEn: 'Paris', country: 'fr' }, { nameEn: 'Lyon', country: 'fr' },
  { nameEn: 'Marseille', country: 'fr' }, { nameEn: 'Toulouse', country: 'fr' },
  { nameEn: 'Nice', country: 'fr' },
  { nameEn: 'Amsterdam', country: 'nl' }, { nameEn: 'Rotterdam', country: 'nl' },
  { nameEn: 'The Hague', country: 'nl' }, { nameEn: 'Utrecht', country: 'nl' },
  { nameEn: 'Eindhoven', country: 'nl' },
  { nameEn: 'Vienna', country: 'at' }, { nameEn: 'Salzburg', country: 'at' },
  { nameEn: 'Graz', country: 'at' }, { nameEn: 'Linz', country: 'at' },
  { nameEn: 'Milan', country: 'it' }, { nameEn: 'Rome', country: 'it' },
  { nameEn: 'Turin', country: 'it' }, { nameEn: 'Bologna', country: 'it' },
  { nameEn: 'Madrid', country: 'es' }, { nameEn: 'Barcelona', country: 'es' },
  { nameEn: 'Valencia', country: 'es' },
  { nameEn: 'Oslo', country: 'no' }, { nameEn: 'Bergen', country: 'no' },
  { nameEn: 'Trondheim', country: 'no' },
  { nameEn: 'Copenhagen', country: 'dk' }, { nameEn: 'Aarhus', country: 'dk' },
  { nameEn: 'Odense', country: 'dk' },
  { nameEn: 'Brussels', country: 'be' }, { nameEn: 'Antwerp', country: 'be' },
  { nameEn: 'Ghent', country: 'be' },
  { nameEn: 'Zurich', country: 'ch' }, { nameEn: 'Geneva', country: 'ch' },
  { nameEn: 'Bern', country: 'ch' }, { nameEn: 'Basel', country: 'ch' },
  { nameEn: 'Auckland', country: 'nz' }, { nameEn: 'Wellington', country: 'nz' },
  { nameEn: 'Christchurch', country: 'nz' },
  { nameEn: 'Tokyo', country: 'jp' }, { nameEn: 'Osaka', country: 'jp' },
  { nameEn: 'Yokohama', country: 'jp' },
  { nameEn: 'Kuala Lumpur', country: 'my' }, { nameEn: 'Penang', country: 'my' },
];

function toSlug(nameEn: string): string {
  return nameEn.toLowerCase().replace(/\s+/g, '-');
}

function toDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

// --- Cache with invalidation ---
interface SitemapCache {
  xml: string;
  timestamp: number;
}

type SitemapUrl = {
  loc: string;
  lastmod?: Date;
};

let listingsSitemapCache: SitemapCache | null = null;
let browseSitemapCache: SitemapCache | null = null;
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

export function invalidateSitemapCache() {
  listingsSitemapCache = null;
  browseSitemapCache = null;
}

function renderUrlset(urls: SitemapUrl[]): string {
  const entries = urls
    .map(({ loc, lastmod }) => {
      const lastmodTag = lastmod
        ? `\n    <lastmod>${toDate(lastmod)}</lastmod>`
        : '';

      return `  <url>
    <loc>${loc}</loc>${lastmodTag}
  </url>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</urlset>`;
}

function getStaticSitemapUrls(): SitemapUrl[] {
  return [
    { loc: `${SITE_URL}/` },
    { loc: `${SITE_URL}/select-country` },
  ];
}

async function getListingSitemapUrls(): Promise<SitemapUrl[]> {
  const listings = await prisma.listing.findMany({
    where: { isActive: true },
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      address: true,
      city: true,
      country: true,
      phone: true,
      website: true,
      placeId: true,
      photos: true,
      isActive: true,
      isClaimed: true,
      phoneVerified: true,
      source: true,
      updatedAt: true,
    },
    orderBy: { updatedAt: 'desc' },
  });

  return selectCanonicalListings(listings).map((listing) => ({
    loc: `${SITE_URL}/listing/${listing.slug || listing.id}`,
    lastmod: listing.updatedAt,
  }));
}

async function getBrowseSitemapUrls(): Promise<SitemapUrl[]> {
  const listings = await prisma.listing.findMany({
    where: { isActive: true },
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      address: true,
      city: true,
      country: true,
      phone: true,
      website: true,
      placeId: true,
      photos: true,
      isActive: true,
      isClaimed: true,
      phoneVerified: true,
      source: true,
      updatedAt: true,
      category: { select: { slug: true } },
    },
  });
  const canonicalListings = selectCanonicalListings(
    listings,
    isSeoEligibleBrowseSource
  );
  type PageStats = { count: number; updatedAt: Date };
  const countryPages = new Map<string, PageStats>();
  const countryCategoryPages = new Map<string, PageStats>();
  const cityPages = new Map<string, PageStats>();
  const cityCategoryPages = new Map<string, PageStats>();

  const addPage = (map: Map<string, PageStats>, key: string, updatedAt: Date) => {
    const previous = map.get(key);
    map.set(key, {
      count: (previous?.count || 0) + 1,
      updatedAt: !previous || updatedAt > previous.updatedAt
        ? updatedAt
        : previous.updatedAt,
    });
  };

  for (const listing of canonicalListings) {
    const countryCode = countryCodeFromFa(listing.country);
    const citySlug = citySlugFromFa(listing.city);
    if (!countryCode) continue;

    addPage(countryPages, countryCode, listing.updatedAt);
    addPage(
      countryCategoryPages,
      `${countryCode}|${listing.category.slug}`,
      listing.updatedAt
    );

    if (!citySlug) continue;
    addPage(cityPages, `${countryCode}|${citySlug}`, listing.updatedAt);
    addPage(
      cityCategoryPages,
      `${countryCode}|${citySlug}|${listing.category.slug}`,
      listing.updatedAt
    );
  }

  const urls: SitemapUrl[] = [];

  for (const [countryCode, stats] of countryPages) {
    urls.push({
      loc: `${SITE_URL}/browse/${countryCode}`,
      lastmod: stats.updatedAt,
    });
  }

  for (const [key, stats] of countryCategoryPages) {
    if (stats.count < 3) continue;
    const [countryCode, categorySlug] = key.split('|');
    urls.push({
      loc: `${SITE_URL}/browse/${countryCode}/category/${categorySlug}`,
      lastmod: stats.updatedAt,
    });
  }

  for (const [key, stats] of cityPages) {
    if (stats.count < 3) continue;
    const [countryCode, citySlug] = key.split('|');
    urls.push({
      loc: `${SITE_URL}/browse/${countryCode}/${citySlug}`,
      lastmod: stats.updatedAt,
    });
  }

  for (const [key, stats] of cityCategoryPages) {
    if (stats.count < 3) continue;
    const [countryCode, citySlug, categorySlug] = key.split('|');
    urls.push({
      loc: `${SITE_URL}/browse/${countryCode}/${citySlug}/${categorySlug}`,
      lastmod: stats.updatedAt,
    });
  }

  return urls;
}

// Root sitemap — a normal URL sitemap so Search Console reports discovered
// pages directly. The split sitemaps below remain available for inspection and
// future growth, but the catalog is currently small enough for one sitemap.
router.get('/sitemap.xml', async (_req: Request, res: Response) => {
  try {
    const [listingUrls, browseUrls] = await Promise.all([
      getListingSitemapUrls(),
      getBrowseSitemapUrls(),
    ]);
    const xml = renderUrlset([
      ...getStaticSitemapUrls(),
      ...listingUrls,
      ...browseUrls,
    ]);
    res.set('Content-Type', 'application/xml');
    res.send(xml);
  } catch (error) {
    console.error('Root sitemap generation error:', error);
    res.set('Content-Type', 'application/xml');
    res.send(renderUrlset(getStaticSitemapUrls()));
  }
});

// Static pages sitemap — homepage + select-country
router.get('/sitemap-static.xml', (_req: Request, res: Response) => {
  const xml = renderUrlset(getStaticSitemapUrls());

  res.set('Content-Type', 'application/xml');
  res.send(xml);
});

// Listings sitemap
router.get('/sitemap-listings.xml', async (_req: Request, res: Response) => {
  try {
    if (listingsSitemapCache && Date.now() - listingsSitemapCache.timestamp < CACHE_TTL) {
      res.set('Content-Type', 'application/xml');
      return res.send(listingsSitemapCache.xml);
    }

    const xml = renderUrlset(await getListingSitemapUrls());

    listingsSitemapCache = { xml, timestamp: Date.now() };

    res.set('Content-Type', 'application/xml');
    res.send(xml);
  } catch (error) {
    console.error('Sitemap generation error:', error);
    res.status(500).send('Error generating sitemap');
  }
});

// Browse pages sitemap — with lastmod from latest listing per country
router.get('/sitemap-browse.xml', async (_req: Request, res: Response) => {
  try {
    if (browseSitemapCache && Date.now() - browseSitemapCache.timestamp < CACHE_TTL) {
      res.set('Content-Type', 'application/xml');
      return res.send(browseSitemapCache.xml);
    }

    const xml = renderUrlset(await getBrowseSitemapUrls());

    browseSitemapCache = { xml, timestamp: Date.now() };

    res.set('Content-Type', 'application/xml');
    res.send(xml);
  } catch (error) {
    console.error('Browse sitemap generation error:', error);
    res.status(500).send('Error generating sitemap');
  }
});

export default router;
