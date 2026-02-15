/**
 * PersianPages Scraping Pipeline
 *
 * Searches Google Places for Iranian/Persian businesses, uses Claude Haiku
 * to filter and generate Persian content, then imports into the database.
 *
 * Usage (from server/):
 *   npx tsx scripts/scrape.ts --city "Los Angeles"
 *   npx tsx scripts/scrape.ts --city "Los Angeles" --dry-run
 *   npx tsx scripts/scrape.ts --city "Los Angeles" --limit 5
 *   npx tsx scripts/scrape.ts --city "Toronto" --country ca
 *   npx tsx scripts/scrape.ts   (picks oldest/never-run city automatically)
 *
 * Or via API:
 *   POST /api/scrape { city: "Los Angeles", limit: 10, dryRun: false }
 */

import { PrismaClient } from '@prisma/client';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

// ── Load .env (for local CLI use only) ─────────────────────────────────

function loadEnvIfLocal() {
  // In production, env vars come from ECS/Secrets Manager
  if (process.env.NODE_ENV === 'production') return;
  const envPath = resolve(__dirname, '../../.env');
  if (!existsSync(envPath)) return;
  const lines = readFileSync(envPath, 'utf-8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    if (key === 'DATABASE_URL') {
      val = val.replace(/@postgres:/, '@localhost:');
    }
    if (!process.env[key]) {
      process.env[key] = val;
    }
  }
}

// ── Types ──────────────────────────────────────────────────────────────

export interface CityConfig {
  nameEn: string;
  name: string;
  country: string;
  countryCode: string;
  priority: number;
}

interface ScrapeConfig {
  searchTerms: string[];
  cities: CityConfig[];
}

interface GooglePlace {
  id: string;
  displayName?: { text: string; languageCode?: string };
  formattedAddress?: string;
  internationalPhoneNumber?: string;
  websiteUri?: string;
  location?: { latitude: number; longitude: number };
  regularOpeningHours?: {
    periods?: Array<{
      open: { day: number; hour: number; minute: number };
      close: { day: number; hour: number; minute: number };
    }>;
  };
}

interface ClaudeResult {
  isPersian: boolean;
  confidence: number;
  categorySlug: string;
  title: string;
  description: string;
  reason: string;
}

export interface ScrapeOptions {
  city?: string;
  dryRun?: boolean;
  limit?: number;
  country?: string;
}

export interface ScrapeResult {
  city: string;
  googleResults: number;
  alreadyInDb: number;
  classified: number;
  persian: number;
  highConfidence: number;
  imported: number;
  filtered: number;
  listings: string[];
}

// ── Config ─────────────────────────────────────────────────────────────

const CATEGORY_SLUGS = [
  'restaurant', 'grocery', 'services', 'real-estate', 'legal',
  'medical', 'beauty', 'automotive', 'education', 'financial',
];

const SEARCH_PREFIXES = ['Iranian', 'Persian'];

const SEARCH_TERMS = [
  'restaurant', 'grocery', 'market', 'doctor', 'dentist', 'lawyer',
  'realtor', 'beauty salon', 'mechanic', 'bakery', 'accounting', 'insurance',
];

const CITIES: CityConfig[] = [
  { nameEn: 'Los Angeles', name: 'لس‌آنجلس', country: 'آمریکا', countryCode: 'us', priority: 1 },
  { nameEn: 'New York', name: 'نیویورک', country: 'آمریکا', countryCode: 'us', priority: 1 },
  { nameEn: 'Washington DC', name: 'واشنگتن', country: 'آمریکا', countryCode: 'us', priority: 1 },
  { nameEn: 'Toronto', name: 'تورنتو', country: 'کانادا', countryCode: 'ca', priority: 1 },
  { nameEn: 'Vancouver', name: 'ونکوور', country: 'کانادا', countryCode: 'ca', priority: 1 },
  { nameEn: 'Beverly Hills', name: 'بورلی‌هیلز', country: 'آمریکا', countryCode: 'us', priority: 2 },
  { nameEn: 'Irvine', name: 'ارواین', country: 'آمریکا', countryCode: 'us', priority: 2 },
  { nameEn: 'Glendale', name: 'گلندیل', country: 'آمریکا', countryCode: 'us', priority: 2 },
  { nameEn: 'San Diego', name: 'سن‌دیگو', country: 'آمریکا', countryCode: 'us', priority: 2 },
  { nameEn: 'San Francisco', name: 'سانفرانسیسکو', country: 'آمریکا', countryCode: 'us', priority: 2 },
  { nameEn: 'San Jose', name: 'سن‌خوزه', country: 'آمریکا', countryCode: 'us', priority: 2 },
  { nameEn: 'Houston', name: 'هیوستون', country: 'آمریکا', countryCode: 'us', priority: 2 },
  { nameEn: 'Dallas', name: 'دالاس', country: 'آمریکا', countryCode: 'us', priority: 2 },
  { nameEn: 'Great Neck', name: 'گریت‌نک', country: 'آمریکا', countryCode: 'us', priority: 2 },
  { nameEn: 'Chicago', name: 'شیکاگو', country: 'آمریکا', countryCode: 'us', priority: 2 },
  { nameEn: 'Seattle', name: 'سیاتل', country: 'آمریکا', countryCode: 'us', priority: 2 },
  { nameEn: 'Boston', name: 'بوستون', country: 'آمریکا', countryCode: 'us', priority: 2 },
  { nameEn: 'Miami', name: 'مایامی', country: 'آمریکا', countryCode: 'us', priority: 2 },
  { nameEn: 'Atlanta', name: 'آتلانتا', country: 'آمریکا', countryCode: 'us', priority: 2 },
  { nameEn: 'Las Vegas', name: 'لاس‌وگاس', country: 'آمریکا', countryCode: 'us', priority: 2 },
  { nameEn: 'Philadelphia', name: 'فیلادلفیا', country: 'آمریکا', countryCode: 'us', priority: 2 },
  { nameEn: 'Montreal', name: 'مونترال', country: 'کانادا', countryCode: 'ca', priority: 2 },
  { nameEn: 'Calgary', name: 'کلگری', country: 'کانادا', countryCode: 'ca', priority: 2 },
  { nameEn: 'Edmonton', name: 'ادمونتون', country: 'کانادا', countryCode: 'ca', priority: 2 },
  { nameEn: 'Richmond Hill', name: 'ریچموند‌هیل', country: 'کانادا', countryCode: 'ca', priority: 2 },
  { nameEn: 'North York', name: 'نورث‌یورک', country: 'کانادا', countryCode: 'ca', priority: 2 },
  { nameEn: 'London', name: 'لندن', country: 'انگلستان', countryCode: 'gb', priority: 2 },
  { nameEn: 'Berlin', name: 'برلین', country: 'آلمان', countryCode: 'de', priority: 2 },
  { nameEn: 'Munich', name: 'مونیخ', country: 'آلمان', countryCode: 'de', priority: 2 },
  { nameEn: 'Frankfurt', name: 'فرانکفورت', country: 'آلمان', countryCode: 'de', priority: 2 },
  { nameEn: 'Hamburg', name: 'هامبورگ', country: 'آلمان', countryCode: 'de', priority: 2 },
  { nameEn: 'Dubai', name: 'دبی', country: 'امارات', countryCode: 'ae', priority: 2 },
  { nameEn: 'Abu Dhabi', name: 'ابوظبی', country: 'امارات', countryCode: 'ae', priority: 2 },
  { nameEn: 'Istanbul', name: 'استانبول', country: 'ترکیه', countryCode: 'tr', priority: 2 },
  { nameEn: 'Stockholm', name: 'استکهلم', country: 'سوئد', countryCode: 'se', priority: 2 },
  { nameEn: 'Sydney', name: 'سیدنی', country: 'استرالیا', countryCode: 'au', priority: 2 },
  { nameEn: 'Melbourne', name: 'ملبورن', country: 'استرالیا', countryCode: 'au', priority: 2 },
  { nameEn: 'Paris', name: 'پاریس', country: 'فرانسه', countryCode: 'fr', priority: 2 },
  { nameEn: 'Amsterdam', name: 'آمستردام', country: 'هلند', countryCode: 'nl', priority: 2 },
  { nameEn: 'Vienna', name: 'وین', country: 'اتریش', countryCode: 'at', priority: 2 },
  { nameEn: 'Santa Monica', name: 'سانتا مونیکا', country: 'آمریکا', countryCode: 'us', priority: 3 },
  { nameEn: 'Encino', name: 'انسینو', country: 'آمریکا', countryCode: 'us', priority: 3 },
  { nameEn: 'Woodland Hills', name: 'وودلند هیلز', country: 'آمریکا', countryCode: 'us', priority: 3 },
  { nameEn: 'Palo Alto', name: 'پالو آلتو', country: 'آمریکا', countryCode: 'us', priority: 3 },
  { nameEn: 'Sacramento', name: 'ساکرامنتو', country: 'آمریکا', countryCode: 'us', priority: 3 },
  { nameEn: 'Fresno', name: 'فرزنو', country: 'آمریکا', countryCode: 'us', priority: 3 },
  { nameEn: 'Austin', name: 'آستین', country: 'آمریکا', countryCode: 'us', priority: 3 },
  { nameEn: 'San Antonio', name: 'سن‌آنتونیو', country: 'آمریکا', countryCode: 'us', priority: 3 },
  { nameEn: 'Phoenix', name: 'فینیکس', country: 'آمریکا', countryCode: 'us', priority: 3 },
  { nameEn: 'Denver', name: 'دنور', country: 'آمریکا', countryCode: 'us', priority: 3 },
  { nameEn: 'Portland', name: 'پورتلند', country: 'آمریکا', countryCode: 'us', priority: 3 },
  { nameEn: 'Baltimore', name: 'بالتیمور', country: 'آمریکا', countryCode: 'us', priority: 3 },
  { nameEn: 'Minneapolis', name: 'مینیاپولیس', country: 'آمریکا', countryCode: 'us', priority: 3 },
  { nameEn: 'Salt Lake City', name: 'سالت‌لیک‌سیتی', country: 'آمریکا', countryCode: 'us', priority: 3 },
  { nameEn: 'Ottawa', name: 'اتاوا', country: 'کانادا', countryCode: 'ca', priority: 3 },
  { nameEn: 'Winnipeg', name: 'وینیپگ', country: 'کانادا', countryCode: 'ca', priority: 3 },
  { nameEn: 'Markham', name: 'مارکهام', country: 'کانادا', countryCode: 'ca', priority: 3 },
  { nameEn: 'Cologne', name: 'کلن', country: 'آلمان', countryCode: 'de', priority: 3 },
  { nameEn: 'Dusseldorf', name: 'دوسلدورف', country: 'آلمان', countryCode: 'de', priority: 3 },
  { nameEn: 'Stuttgart', name: 'اشتوتگارت', country: 'آلمان', countryCode: 'de', priority: 3 },
  { nameEn: 'Hannover', name: 'هانوفر', country: 'آلمان', countryCode: 'de', priority: 3 },
  { nameEn: 'Bonn', name: 'بن', country: 'آلمان', countryCode: 'de', priority: 3 },
  { nameEn: 'Nuremberg', name: 'نورنبرگ', country: 'آلمان', countryCode: 'de', priority: 3 },
  { nameEn: 'Sharjah', name: 'شارجه', country: 'امارات', countryCode: 'ae', priority: 3 },
  { nameEn: 'Ajman', name: 'عجمان', country: 'امارات', countryCode: 'ae', priority: 3 },
  { nameEn: 'Ankara', name: 'آنکارا', country: 'ترکیه', countryCode: 'tr', priority: 3 },
  { nameEn: 'Izmir', name: 'ازمیر', country: 'ترکیه', countryCode: 'tr', priority: 3 },
  { nameEn: 'Antalya', name: 'آنتالیا', country: 'ترکیه', countryCode: 'tr', priority: 3 },
  { nameEn: 'Bursa', name: 'بورسا', country: 'ترکیه', countryCode: 'tr', priority: 3 },
  { nameEn: 'Van', name: 'وان', country: 'ترکیه', countryCode: 'tr', priority: 3 },
  { nameEn: 'Manchester', name: 'منچستر', country: 'انگلستان', countryCode: 'gb', priority: 3 },
  { nameEn: 'Birmingham', name: 'بیرمنگام', country: 'انگلستان', countryCode: 'gb', priority: 3 },
  { nameEn: 'Gothenburg', name: 'گوتنبرگ', country: 'سوئد', countryCode: 'se', priority: 3 },
  { nameEn: 'Malmo', name: 'مالمو', country: 'سوئد', countryCode: 'se', priority: 3 },
  { nameEn: 'Brisbane', name: 'بریزبن', country: 'استرالیا', countryCode: 'au', priority: 3 },
  { nameEn: 'Perth', name: 'پرث', country: 'استرالیا', countryCode: 'au', priority: 3 },
  { nameEn: 'Lyon', name: 'لیون', country: 'فرانسه', countryCode: 'fr', priority: 3 },
  { nameEn: 'Rotterdam', name: 'روتردام', country: 'هلند', countryCode: 'nl', priority: 3 },
  { nameEn: 'The Hague', name: 'لاهه', country: 'هلند', countryCode: 'nl', priority: 3 },
  { nameEn: 'Salzburg', name: 'سالزبورگ', country: 'اتریش', countryCode: 'at', priority: 3 },
  { nameEn: 'Milan', name: 'میلان', country: 'ایتالیا', countryCode: 'it', priority: 3 },
  { nameEn: 'Madrid', name: 'مادرید', country: 'اسپانیا', countryCode: 'es', priority: 3 },
  { nameEn: 'Barcelona', name: 'بارسلونا', country: 'اسپانیا', countryCode: 'es', priority: 3 },
  { nameEn: 'Oslo', name: 'اسلو', country: 'نروژ', countryCode: 'no', priority: 3 },
  { nameEn: 'Copenhagen', name: 'کپنهاگ', country: 'دانمارک', countryCode: 'dk', priority: 3 },
  { nameEn: 'Brussels', name: 'بروکسل', country: 'بلژیک', countryCode: 'be', priority: 3 },
  { nameEn: 'Zurich', name: 'زوریخ', country: 'سوئیس', countryCode: 'ch', priority: 3 },
  { nameEn: 'Geneva', name: 'ژنو', country: 'سوئیس', countryCode: 'ch', priority: 3 },
  { nameEn: 'Auckland', name: 'اوکلند', country: 'نیوزیلند', countryCode: 'nz', priority: 3 },
  { nameEn: 'Tokyo', name: 'توکیو', country: 'ژاپن', countryCode: 'jp', priority: 3 },
  { nameEn: 'Kuala Lumpur', name: 'کوالالامپور', country: 'مالزی', countryCode: 'my', priority: 3 },
];

// ── Helpers ────────────────────────────────────────────────────────────

function makeSlugBase(titleEn: string): string {
  return titleEn
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

function findCity(name: string): CityConfig | null {
  return CITIES.find(c => c.nameEn.toLowerCase() === name.toLowerCase()) || null;
}

function pickCity(country?: string): CityConfig | null {
  let candidates = [...CITIES];
  if (country) {
    candidates = candidates.filter(c => c.countryCode === country);
  }
  // Sort by priority (lower = higher)
  candidates.sort((a, b) => a.priority - b.priority);
  return candidates[0] || null;
}

// ── Google Places API ──────────────────────────────────────────────────

async function searchGooglePlaces(query: string, apiKey: string): Promise<GooglePlace[]> {
  const fieldMask = [
    'places.id',
    'places.displayName',
    'places.formattedAddress',
    'places.internationalPhoneNumber',
    'places.websiteUri',
    'places.location',
    'places.regularOpeningHours',
  ].join(',');

  const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': fieldMask,
    },
    body: JSON.stringify({ textQuery: query }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`  Google Places API error (${res.status}): ${text}`);
    return [];
  }

  const data = await res.json();
  return data.places || [];
}

async function fetchAllPlaces(city: string, apiKey: string): Promise<GooglePlace[]> {
  const seen = new Map<string, GooglePlace>();

  for (const term of SEARCH_TERMS) {
    for (const prefix of SEARCH_PREFIXES) {
      const query = `${prefix} ${term} in ${city}`;
      console.log(`  Searching: "${query}"`);
      const places = await searchGooglePlaces(query, apiKey);
      for (const place of places) {
        if (!seen.has(place.id)) {
          seen.set(place.id, place);
        }
      }
      await new Promise(r => setTimeout(r, 200));
    }
  }

  return Array.from(seen.values());
}

// ── Dedup against DB ───────────────────────────────────────────────────

async function dedup(places: GooglePlace[], prisma: PrismaClient): Promise<GooglePlace[]> {
  if (places.length === 0) return [];

  const placeIds = places.map(p => p.id);
  const existing = await prisma.listing.findMany({
    where: { placeId: { in: placeIds } },
    select: { placeId: true },
  });

  const existingIds = new Set(existing.map(e => e.placeId));
  const fresh = places.filter(p => !existingIds.has(p.id));

  console.log(`  Dedup: ${places.length} total, ${existing.length} already in DB, ${fresh.length} new`);
  return fresh;
}

// ── Claude Haiku Filtering ─────────────────────────────────────────────

async function classifyBatch(places: GooglePlace[], apiKey: string): Promise<Map<string, ClaudeResult>> {
  const results = new Map<string, ClaudeResult>();

  for (let i = 0; i < places.length; i += 8) {
    const batch = places.slice(i, i + 8);
    const businessList = batch.map((p, idx) => ({
      index: idx,
      placeId: p.id,
      name: p.displayName?.text || 'Unknown',
      address: p.formattedAddress || '',
      phone: p.nationalPhoneNumber || '',
      website: p.websiteUri || '',
    }));

    const prompt = `You are an expert at identifying Iranian/Persian businesses in diaspora communities.

Analyze each business below and determine:
1. Is this an Iranian/Persian-owned business? (isPersian: true/false)
2. How confident are you? (confidence: 1-5, where 5 = definitely Persian)
3. What category does it belong to? (categorySlug: one of ${CATEGORY_SLUGS.join(', ')})
4. Write a Persian title for the business (title: in Farsi script)
5. Write a 1-2 sentence Persian description (description: in Farsi script, describing what the business offers)
6. Brief English reason for your classification (reason: string)

Businesses:
${JSON.stringify(businessList, null, 2)}

Respond with ONLY a JSON array of objects, one per business, in the same order. Each object must have these exact fields:
{ "placeId": string, "isPersian": boolean, "confidence": number, "categorySlug": string, "title": string, "description": string, "reason": string }`;

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 4096,
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error(`  Claude API error (${res.status}): ${text}`);
        continue;
      }

      const data = await res.json();
      const content = data.content?.[0]?.text || '';

      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        console.error('  Failed to parse Claude response as JSON array');
        continue;
      }

      const parsed: ClaudeResult[] = JSON.parse(jsonMatch[0]);
      for (const item of parsed) {
        const placeId = (item as any).placeId;
        if (placeId) {
          if (!CATEGORY_SLUGS.includes(item.categorySlug)) {
            item.categorySlug = 'services';
          }
          results.set(placeId, item);
        }
      }
    } catch (err) {
      console.error(`  Error classifying batch: ${err}`);
    }

    if (i + 8 < places.length) {
      await new Promise(r => setTimeout(r, 500));
    }
  }

  return results;
}

// ── Import to DB ───────────────────────────────────────────────────────

async function importListings(
  places: GooglePlace[],
  classifications: Map<string, ClaudeResult>,
  cityConfig: CityConfig,
  prisma: PrismaClient,
  limit: number,
): Promise<{ imported: number; filtered: number; listings: string[] }> {
  const categories = await prisma.category.findMany();
  const categoryMap: Record<string, string> = {};
  for (const cat of categories) {
    categoryMap[cat.slug] = cat.id;
  }

  const existingSlugs = await prisma.listing.findMany({
    select: { slug: true },
    where: { slug: { not: null } },
  });
  const usedSlugs = new Set(existingSlugs.map(l => l.slug));

  let imported = 0;
  let filtered = 0;
  const listings: string[] = [];

  for (const place of places) {
    if (imported >= limit) break;

    const cls = classifications.get(place.id);
    if (!cls || !cls.isPersian || cls.confidence < 4) {
      filtered++;
      continue;
    }

    const categoryId = categoryMap[cls.categorySlug];
    if (!categoryId) {
      console.error(`  Unknown category slug: ${cls.categorySlug}, skipping`);
      filtered++;
      continue;
    }

    const englishName = place.displayName?.text || 'Unknown Business';
    let slug = makeSlugBase(englishName);
    let suffix = 2;
    while (usedSlugs.has(slug)) {
      slug = `${makeSlugBase(englishName)}-${suffix}`;
      suffix++;
    }
    usedSlugs.add(slug);

    let businessHours: any = null;
    if (place.regularOpeningHours?.periods) {
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      businessHours = {};
      for (const period of place.regularOpeningHours.periods) {
        if (!period.open || !period.close) continue;
        const day = dayNames[period.open.day];
        const openTime = `${String(period.open.hour).padStart(2, '0')}:${String(period.open.minute).padStart(2, '0')}`;
        const closeTime = `${String(period.close.hour).padStart(2, '0')}:${String(period.close.minute).padStart(2, '0')}`;
        businessHours[day] = { open: openTime, close: closeTime };
      }
    }

    await prisma.listing.create({
      data: {
        title: cls.title,
        description: cls.description,
        slug,
        phone: place.internationalPhoneNumber
          ? place.internationalPhoneNumber.replace(/[\s\-\(\)]/g, '')
          : null,
        address: place.formattedAddress || '',
        city: cityConfig.name,
        country: cityConfig.country,
        latitude: place.location?.latitude || null,
        longitude: place.location?.longitude || null,
        placeId: place.id,
        website: place.websiteUri || null,
        businessHours,
        photos: [],
        source: 'scraped',
        isClaimed: false,
        claimedAt: null,
        categoryId,
      },
    });

    const line = `${englishName} → ${cls.title} (${cls.categorySlug})`;
    console.log(`  + ${line}`);
    listings.push(line);
    imported++;
  }

  return { imported, filtered, listings };
}

// ── Public API ─────────────────────────────────────────────────────────

export async function runScrape(
  prisma: PrismaClient,
  options: ScrapeOptions = {},
): Promise<ScrapeResult> {
  const { city: cityName, dryRun = false, limit = 10, country } = options;

  const googleApiKey = process.env.GOOGLE_PLACES_API_KEY;
  const anthropicApiKey = process.env.ANTHROPIC_API_KEY;

  if (!googleApiKey) throw new Error('Missing GOOGLE_PLACES_API_KEY');
  if (!anthropicApiKey) throw new Error('Missing ANTHROPIC_API_KEY');

  // Resolve city
  let cityConfig: CityConfig | null = null;
  if (cityName) {
    cityConfig = findCity(cityName);
    if (!cityConfig) throw new Error(`City "${cityName}" not found`);
  } else {
    cityConfig = pickCity(country);
    if (!cityConfig) throw new Error('No cities available');
  }

  console.log(`\n=== Scraping: ${cityConfig.nameEn} (${cityConfig.name}), ${cityConfig.country} ===`);
  console.log(`  Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}, Limit: ${limit}\n`);

  // Step 1: Search Google Places
  console.log('Step 1: Searching Google Places...');
  const allPlaces = await fetchAllPlaces(cityConfig.nameEn, googleApiKey);
  console.log(`  Found ${allPlaces.length} unique places\n`);

  if (allPlaces.length === 0) {
    return {
      city: cityConfig.nameEn, googleResults: 0, alreadyInDb: 0,
      classified: 0, persian: 0, highConfidence: 0, imported: 0, filtered: 0, listings: [],
    };
  }

  // Step 2: Dedup
  console.log('Step 2: Deduplicating against database...');
  const newPlaces = await dedup(allPlaces, prisma);

  if (newPlaces.length === 0) {
    return {
      city: cityConfig.nameEn, googleResults: allPlaces.length,
      alreadyInDb: allPlaces.length, classified: 0, persian: 0,
      highConfidence: 0, imported: 0, filtered: 0, listings: [],
    };
  }

  // Step 3: Classify
  console.log('\nStep 3: Classifying with Claude Haiku...');
  const classifications = await classifyBatch(newPlaces, anthropicApiKey);
  console.log(`  Classified ${classifications.size} businesses\n`);

  let persianCount = 0;
  let highConfidence = 0;
  for (const [, cls] of classifications) {
    if (cls.isPersian) persianCount++;
    if (cls.isPersian && cls.confidence >= 4) highConfidence++;
  }

  if (dryRun) {
    console.log('=== DRY RUN — no imports ===');
    return {
      city: cityConfig.nameEn, googleResults: allPlaces.length,
      alreadyInDb: allPlaces.length - newPlaces.length, classified: classifications.size,
      persian: persianCount, highConfidence, imported: 0, filtered: 0, listings: [],
    };
  }

  // Step 4: Import
  console.log('Step 4: Importing into database...');
  const { imported, filtered, listings } = await importListings(
    newPlaces, classifications, cityConfig, prisma, limit,
  );

  const result: ScrapeResult = {
    city: cityConfig.nameEn,
    googleResults: allPlaces.length,
    alreadyInDb: allPlaces.length - newPlaces.length,
    classified: classifications.size,
    persian: persianCount,
    highConfidence,
    imported,
    filtered,
    listings,
  };

  console.log(`\n=== Summary: ${cityConfig.nameEn} ===`);
  console.log(`  Google results: ${result.googleResults}, Already in DB: ${result.alreadyInDb}`);
  console.log(`  Classified: ${result.classified}, Persian: ${result.persian}, High confidence: ${result.highConfidence}`);
  console.log(`  Imported: ${result.imported}, Filtered: ${result.filtered}`);

  return result;
}

// ── CLI entrypoint ─────────────────────────────────────────────────────

if (require.main === module) {
  loadEnvIfLocal();

  const args = process.argv.slice(2);
  let city: string | undefined;
  let dryRun = false;
  let limit = 30;
  let country: string | undefined;

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--city': city = args[++i]; break;
      case '--dry-run': dryRun = true; break;
      case '--limit': limit = parseInt(args[++i], 10); break;
      case '--country': country = args[++i]; break;
    }
  }

  const prisma = new PrismaClient();
  runScrape(prisma, { city, dryRun, limit, country })
    .then(() => prisma.$disconnect())
    .catch(err => {
      console.error('Fatal error:', err);
      prisma.$disconnect();
      process.exit(1);
    });
}
