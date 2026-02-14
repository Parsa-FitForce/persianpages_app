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

  // Category browse pages
  for (const cat of categories) {
    if (cat.slug) {
      urls.push(urlEntry({
        loc: `${SITE_URL}/search?category=${encodeURIComponent(cat.slug)}`,
        priority: 0.7,
        changefreq: 'daily',
      }));
    }
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
