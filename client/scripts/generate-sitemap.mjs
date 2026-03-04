import { writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SITE_URL = 'https://persianpages.com';
const API_URL = process.env.API_URL || process.env.VITE_API_URL;

if (!API_URL) {
  console.error('Error: API_URL or VITE_API_URL environment variable is required');
  process.exit(1);
}

async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
  return res.json();
}

function escapeXml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function urlEntry({ loc, lastmod, changefreq, priority }) {
  let xml = `  <url>\n    <loc>${escapeXml(loc)}</loc>`;
  if (lastmod) xml += `\n    <lastmod>${lastmod}</lastmod>`;
  if (changefreq) xml += `\n    <changefreq>${changefreq}</changefreq>`;
  if (priority != null) xml += `\n    <priority>${priority}</priority>`;
  xml += '\n  </url>';
  return xml;
}

// Countries and cities (mirrors client/src/i18n/locations.ts)
const COUNTRIES = [
  'us', 'ca', 'de', 'ae', 'tr', 'gb', 'se', 'au', 'fr', 'nl',
  'at', 'it', 'es', 'no', 'dk', 'be', 'ch', 'nz', 'jp', 'my',
];

const CITIES = [
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

function toSlug(nameEn) {
  return nameEn.toLowerCase().replace(/\s+/g, '-');
}

async function main() {
  console.log(`Fetching data from ${API_URL}...`);

  const [listingsData, categories] = await Promise.all([
    fetchJSON(`${API_URL}/listings?limit=10000`),
    fetchJSON(`${API_URL}/categories`),
  ]);

  const listings = listingsData.listings || listingsData;

  console.log(`Fetched ${Array.isArray(listings) ? listings.length : 0} listings, ${categories.length} categories`);

  const urls = [];

  // Static pages
  urls.push(urlEntry({ loc: SITE_URL + '/', priority: 1.0, changefreq: 'daily' }));
  urls.push(urlEntry({ loc: SITE_URL + '/select-country', priority: 0.5, changefreq: 'monthly' }));
  urls.push(urlEntry({ loc: SITE_URL + '/privacy', priority: 0.3, changefreq: 'yearly' }));
  urls.push(urlEntry({ loc: SITE_URL + '/terms', priority: 0.3, changefreq: 'yearly' }));

  // Browse: country pages
  for (const code of COUNTRIES) {
    urls.push(urlEntry({
      loc: `${SITE_URL}/browse/${code}`,
      priority: 0.7,
      changefreq: 'weekly',
    }));

    // Browse: country + category pages
    for (const cat of categories) {
      if (cat.slug) {
        urls.push(urlEntry({
          loc: `${SITE_URL}/browse/${code}/category/${cat.slug}`,
          priority: 0.6,
          changefreq: 'weekly',
        }));
      }
    }
  }

  // Browse: city pages
  for (const city of CITIES) {
    urls.push(urlEntry({
      loc: `${SITE_URL}/browse/${city.country}/${toSlug(city.nameEn)}`,
      priority: 0.6,
      changefreq: 'weekly',
    }));
  }

  // Listing pages
  for (const listing of listings) {
    if (!listing.slug) continue;
    const lastmod = listing.updatedAt
      ? new Date(listing.updatedAt).toISOString().split('T')[0]
      : undefined;
    urls.push(urlEntry({
      loc: `${SITE_URL}/listing/${encodeURIComponent(listing.slug)}`,
      priority: 0.8,
      changefreq: 'weekly',
      lastmod,
    }));
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>
`;

  const distDir = join(__dirname, '..', 'dist');
  mkdirSync(distDir, { recursive: true });
  const outPath = join(distDir, 'sitemap.xml');
  writeFileSync(outPath, xml, 'utf-8');
  console.log(`Sitemap written to ${outPath} (${urls.length} URLs)`);
}

main().catch((err) => {
  console.error('Sitemap generation failed:', err);
  process.exit(1);
});
