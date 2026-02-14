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
 * Or via npm script:
 *   npm run scrape -- --city "Los Angeles"
 */

import { PrismaClient } from '@prisma/client';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

// ── Load .env from project root ────────────────────────────────────────

function loadEnv() {
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
    // When running outside Docker, rewrite DB host from container name to localhost
    if (key === 'DATABASE_URL') {
      val = val.replace(/@postgres:/, '@localhost:');
    }
    if (!process.env[key]) {
      process.env[key] = val;
    }
  }
}
loadEnv();

// ── Types ──────────────────────────────────────────────────────────────

interface CityConfig {
  nameEn: string;
  name: string;
  country: string;
  countryCode: string;
  priority: number;
}

interface ScrapeConfig {
  searchTerms: string[];
  cities: CityConfig[];
  lastRun: Record<string, string>;
}

interface GooglePlace {
  id: string;
  displayName?: { text: string; languageCode?: string };
  formattedAddress?: string;
  nationalPhoneNumber?: string;
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

// ── Config ─────────────────────────────────────────────────────────────

const CONFIG_PATH = resolve(__dirname, 'scrape-config.json');

const CATEGORY_SLUGS = [
  'restaurant', 'grocery', 'services', 'real-estate', 'legal',
  'medical', 'beauty', 'automotive', 'education', 'financial',
];

const SEARCH_PREFIXES = ['Iranian', 'Persian'];

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

function parseArgs(): { city?: string; dryRun: boolean; limit: number; country?: string } {
  const args = process.argv.slice(2);
  let city: string | undefined;
  let dryRun = false;
  let limit = 30;
  let country: string | undefined;

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--city':
        city = args[++i];
        break;
      case '--dry-run':
        dryRun = true;
        break;
      case '--limit':
        limit = parseInt(args[++i], 10);
        break;
      case '--country':
        country = args[++i];
        break;
    }
  }

  return { city, dryRun, limit, country };
}

function loadConfig(): ScrapeConfig {
  return JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'));
}

function saveConfig(config: ScrapeConfig): void {
  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2) + '\n');
}

function pickCity(config: ScrapeConfig, country?: string): CityConfig | null {
  let candidates = config.cities;
  if (country) {
    candidates = candidates.filter(c => c.countryCode === country);
  }

  // Sort by: never-run first, then oldest run, then highest priority
  candidates.sort((a, b) => {
    const aRun = config.lastRun[a.nameEn];
    const bRun = config.lastRun[b.nameEn];

    // Never-run cities first
    if (!aRun && bRun) return -1;
    if (aRun && !bRun) return 1;

    // Both never-run: sort by priority (lower = higher priority)
    if (!aRun && !bRun) return a.priority - b.priority;

    // Both have run: oldest first, then by priority
    if (aRun < bRun) return -1;
    if (aRun > bRun) return 1;
    return a.priority - b.priority;
  });

  return candidates[0] || null;
}

// ── Google Places API ──────────────────────────────────────────────────

async function searchGooglePlaces(query: string, apiKey: string): Promise<GooglePlace[]> {
  const fieldMask = [
    'places.id',
    'places.displayName',
    'places.formattedAddress',
    'places.nationalPhoneNumber',
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

async function fetchAllPlaces(city: string, searchTerms: string[], apiKey: string): Promise<GooglePlace[]> {
  const seen = new Map<string, GooglePlace>();

  for (const term of searchTerms) {
    for (const prefix of SEARCH_PREFIXES) {
      const query = `${prefix} ${term} in ${city}`;
      console.log(`  Searching: "${query}"`);
      const places = await searchGooglePlaces(query, apiKey);
      for (const place of places) {
        if (!seen.has(place.id)) {
          seen.set(place.id, place);
        }
      }
      // Small delay to avoid rate limits
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

  // Process in batches of 8
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
          messages: [{
            role: 'user',
            content: prompt,
          }],
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error(`  Claude API error (${res.status}): ${text}`);
        continue;
      }

      const data = await res.json();
      const content = data.content?.[0]?.text || '';

      // Extract JSON array from response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        console.error('  Failed to parse Claude response as JSON array');
        continue;
      }

      const parsed: ClaudeResult[] = JSON.parse(jsonMatch[0]);
      for (const item of parsed) {
        const placeId = (item as any).placeId;
        if (placeId) {
          // Validate categorySlug
          if (!CATEGORY_SLUGS.includes(item.categorySlug)) {
            item.categorySlug = 'services'; // fallback
          }
          results.set(placeId, item);
        }
      }
    } catch (err) {
      console.error(`  Error classifying batch: ${err}`);
    }

    // Delay between batches
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
): Promise<{ imported: number; filtered: number }> {
  // Load category map
  const categories = await prisma.category.findMany();
  const categoryMap: Record<string, string> = {};
  for (const cat of categories) {
    categoryMap[cat.slug] = cat.id;
  }

  // Collect existing slugs to avoid collisions
  const existingSlugs = await prisma.listing.findMany({
    select: { slug: true },
    where: { slug: { not: null } },
  });
  const usedSlugs = new Set(existingSlugs.map(l => l.slug));

  let imported = 0;
  let filtered = 0;

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

    // Convert Google opening hours to our format
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
        phone: place.nationalPhoneNumber || null,
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

    console.log(`  + ${englishName} → ${cls.title} (${cls.categorySlug}, confidence: ${cls.confidence})`);
    imported++;
  }

  return { imported, filtered };
}

// ── Main ───────────────────────────────────────────────────────────────

async function main() {
  const args = parseArgs();
  const config = loadConfig();

  // Validate env vars
  const googleApiKey = process.env.GOOGLE_PLACES_API_KEY;
  const anthropicApiKey = process.env.ANTHROPIC_API_KEY;

  if (!googleApiKey) {
    console.error('Missing GOOGLE_PLACES_API_KEY in environment');
    process.exit(1);
  }
  if (!anthropicApiKey) {
    console.error('Missing ANTHROPIC_API_KEY in environment');
    process.exit(1);
  }

  // Resolve city
  let cityConfig: CityConfig | null = null;
  if (args.city) {
    cityConfig = config.cities.find(c =>
      c.nameEn.toLowerCase() === args.city!.toLowerCase()
    ) || null;
    if (!cityConfig) {
      console.error(`City "${args.city}" not found in config. Available cities:`);
      const byCountry = new Map<string, string[]>();
      for (const c of config.cities) {
        const list = byCountry.get(c.country) || [];
        list.push(c.nameEn);
        byCountry.set(c.country, list);
      }
      for (const [country, cities] of byCountry) {
        console.error(`  ${country}: ${cities.join(', ')}`);
      }
      process.exit(1);
    }
  } else {
    cityConfig = pickCity(config, args.country);
    if (!cityConfig) {
      console.error('No cities available to scrape');
      process.exit(1);
    }
  }

  console.log(`\n=== Scraping: ${cityConfig.nameEn} (${cityConfig.name}), ${cityConfig.country} ===`);
  console.log(`  Mode: ${args.dryRun ? 'DRY RUN' : 'LIVE'}, Limit: ${args.limit}\n`);

  // Step 1: Search Google Places
  console.log('Step 1: Searching Google Places...');
  const allPlaces = await fetchAllPlaces(cityConfig.nameEn, config.searchTerms, googleApiKey);
  console.log(`  Found ${allPlaces.length} unique places\n`);

  if (allPlaces.length === 0) {
    console.log('No results found. Done.');
    return;
  }

  // Step 2: Dedup against DB
  const prisma = new PrismaClient();
  try {
    console.log('Step 2: Deduplicating against database...');
    const newPlaces = await dedup(allPlaces, prisma);
    console.log();

    if (newPlaces.length === 0) {
      console.log('All places already in database. Done.');
      return;
    }

    // Step 3: Classify with Claude
    console.log('Step 3: Classifying with Claude Haiku...');
    const classifications = await classifyBatch(newPlaces, anthropicApiKey);
    console.log(`  Classified ${classifications.size} businesses\n`);

    // Print classification summary
    let persianCount = 0;
    let highConfidence = 0;
    for (const [, cls] of classifications) {
      if (cls.isPersian) persianCount++;
      if (cls.isPersian && cls.confidence >= 4) highConfidence++;
    }
    console.log(`  Persian: ${persianCount}, High confidence (>=4): ${highConfidence}\n`);

    if (args.dryRun) {
      console.log('=== DRY RUN — Preview ===\n');
      for (const place of newPlaces) {
        const cls = classifications.get(place.id);
        const name = place.displayName?.text || 'Unknown';
        if (cls) {
          const status = cls.isPersian && cls.confidence >= 4 ? 'IMPORT' : 'SKIP';
          console.log(`  [${status}] ${name}`);
          console.log(`    → ${cls.title} | ${cls.categorySlug} | confidence: ${cls.confidence}`);
          console.log(`    → ${cls.reason}`);
          console.log(`    → ${cls.description}\n`);
        } else {
          console.log(`  [SKIP] ${name} (no classification)\n`);
        }
      }
      console.log('Dry run complete. No changes made.');
      return;
    }

    // Step 4: Import
    console.log('Step 4: Importing into database...');
    const { imported, filtered } = await importListings(
      newPlaces, classifications, cityConfig, prisma, args.limit
    );

    // Step 5: Summary
    console.log(`\n=== Summary ===`);
    console.log(`  Google Places results: ${allPlaces.length}`);
    console.log(`  Already in DB: ${allPlaces.length - newPlaces.length}`);
    console.log(`  Classified: ${classifications.size}`);
    console.log(`  Imported: ${imported}`);
    console.log(`  Filtered out: ${filtered}`);

    // Update lastRun
    config.lastRun[cityConfig.nameEn] = new Date().toISOString().split('T')[0];
    saveConfig(config);
    console.log(`\n  Updated lastRun for ${cityConfig.nameEn}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
