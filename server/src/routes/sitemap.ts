import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

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

let listingsSitemapCache: SitemapCache | null = null;
let browseSitemapCache: SitemapCache | null = null;
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

export function invalidateSitemapCache() {
  listingsSitemapCache = null;
  browseSitemapCache = null;
}

// Sitemap index — includes lastmod from latest listing
router.get('/sitemap.xml', async (_req: Request, res: Response) => {
  try {
    const latest = await prisma.listing.findFirst({
      where: { isActive: true },
      orderBy: { updatedAt: 'desc' },
      select: { updatedAt: true },
    });
    const lastmod = latest ? toDate(latest.updatedAt) : toDate(new Date());

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>https://api.persianpages.com/api/sitemap-listings.xml</loc>
    <lastmod>${lastmod}</lastmod>
  </sitemap>
  <sitemap>
    <loc>https://api.persianpages.com/api/sitemap-browse.xml</loc>
    <lastmod>${lastmod}</lastmod>
  </sitemap>
</sitemapindex>`;

    res.set('Content-Type', 'application/xml');
    res.send(xml);
  } catch {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>https://api.persianpages.com/api/sitemap-listings.xml</loc>
  </sitemap>
  <sitemap>
    <loc>https://api.persianpages.com/api/sitemap-browse.xml</loc>
  </sitemap>
</sitemapindex>`;
    res.set('Content-Type', 'application/xml');
    res.send(xml);
  }
});

// Listings sitemap
router.get('/sitemap-listings.xml', async (_req: Request, res: Response) => {
  try {
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
    <lastmod>${toDate(listing.updatedAt)}</lastmod>
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

// Browse pages sitemap — with lastmod from latest listing per country
router.get('/sitemap-browse.xml', async (_req: Request, res: Response) => {
  try {
    if (browseSitemapCache && Date.now() - browseSitemapCache.timestamp < CACHE_TTL) {
      res.set('Content-Type', 'application/xml');
      return res.send(browseSitemapCache.xml);
    }

    const categories = await prisma.category.findMany({ select: { slug: true } });

    // Get latest updatedAt per country (Persian name) in one query
    const countryLastMods = await prisma.listing.groupBy({
      by: ['country'],
      where: { isActive: true },
      _max: { updatedAt: true },
    });
    const countryLastModMap = new Map(
      countryLastMods.map(r => [r.country, r._max.updatedAt])
    );

    const today = toDate(new Date());
    const urls: string[] = [];

    for (const country of BROWSE_COUNTRIES) {
      const persianName = COUNTRY_NAMES[country.code];
      const lastUpdated = countryLastModMap.get(persianName);
      const lastmod = lastUpdated ? toDate(lastUpdated) : today;

      // Country page
      urls.push(`  <url>
    <loc>${SITE_URL}/browse/${country.code}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`);

      // Country + category pages
      for (const cat of categories) {
        urls.push(`  <url>
    <loc>${SITE_URL}/browse/${country.code}/category/${cat.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>`);
      }
    }

    // City pages
    for (const city of BROWSE_CITIES) {
      const slug = toSlug(city.nameEn);
      const persianName = COUNTRY_NAMES[city.country];
      const lastUpdated = countryLastModMap.get(persianName);
      const lastmod = lastUpdated ? toDate(lastUpdated) : today;

      urls.push(`  <url>
    <loc>${SITE_URL}/browse/${city.country}/${slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>`);
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`;

    browseSitemapCache = { xml, timestamp: Date.now() };

    res.set('Content-Type', 'application/xml');
    res.send(xml);
  } catch (error) {
    console.error('Browse sitemap generation error:', error);
    res.status(500).send('Error generating sitemap');
  }
});

export default router;
