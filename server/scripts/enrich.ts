/**
 * PersianPages Listing Enrichment v2
 *
 * Comprehensive enrichment pipeline:
 * 1. Google Places API — refresh name, website, phone, hours, photos
 * 2. Website scraping — content, images, social links (Instagram, WhatsApp, etc.)
 * 3. LLM — correct Farsi title spelling, generate rich Farsi description
 * 4. Photo download — up to 5 photos from Google Places + website
 *
 * Works on ALL listings (not just ones with websites).
 *
 * Usage (from server/):
 *   npx tsx scripts/enrich.ts                     # enrich all eligible listings
 *   npx tsx scripts/enrich.ts --limit 20          # enrich up to 20 listings
 *   npx tsx scripts/enrich.ts --city "لندن"        # only listings in a city
 *   npx tsx scripts/enrich.ts --dry-run            # preview without writing
 *   npx tsx scripts/enrich.ts --id clu1abc123      # enrich a single listing
 *   npx tsx scripts/enrich.ts --force              # re-enrich already-enriched listings
 */

import { PrismaClient } from '@prisma/client';
import { existsSync, readFileSync, mkdirSync, writeFileSync } from 'fs';
import { resolve, join } from 'path';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { JSDOM } from 'jsdom';
import { callLLM, validateLLMConfig } from './llm';

// ── Load .env (for local CLI use only) ─────────────────────────────────

function loadEnvIfLocal() {
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

// ── Types ─────────────────────────────────────────────────────────────

interface GooglePlaceDetails {
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
  photos?: Array<{
    name: string;
    authorAttributions?: Array<{ displayName?: string; uri?: string }>;
  }>;
}

interface ScrapedSite {
  title: string | null;
  description: string | null;
  bodyText: string;
  imageUrls: string[];
  socialLinks: Record<string, string>;
  ogImage: string | null;
}

interface LLMEnrichResult {
  titleFa: string;
  description: string;
}

// ── Country Mismatch Detection ───────────────────────────────────────

const COUNTRY_KEYWORDS: Record<string, string[]> = {
  'آمریکا': ['united states', 'usa', ', us', ', ca ', ', ny ', ', tx ', ', fl ', ', wa ', ', il '],
  'کانادا': ['canada'],
  'انگلستان': ['united kingdom', ', uk', 'england', 'scotland', 'wales'],
  'آلمان': ['germany', 'deutschland'],
  'فرانسه': ['france'],
  'استرالیا': ['australia'],
  'سوئد': ['sweden'],
  'هلند': ['netherlands', 'holland'],
  'ترکیه': ['turkey', 'türkiye'],
  'امارات': ['united arab emirates', 'uae', 'dubai', 'abu dhabi', 'sharjah'],
  'اتریش': ['austria'],
  'دانمارک': ['denmark'],
  'نروژ': ['norway'],
  'بلژیک': ['belgium'],
  'ایتالیا': ['italy', 'italia'],
  'اسپانیا': ['spain', 'españa'],
  'سوئیس': ['switzerland', 'schweiz', 'suisse'],
  'نیوزیلند': ['new zealand'],
};

function detectCountryMismatch(listingCountry: string, googleAddress: string): boolean {
  const keywords = COUNTRY_KEYWORDS[listingCountry];
  if (!keywords) return false; // unknown country, can't validate
  const addr = googleAddress.toLowerCase();
  return !keywords.some(kw => addr.includes(kw));
}

// ── Google Places API ────────────────────────────────────────────────

const PLACES_DETAIL_FIELDS = [
  'id', 'displayName', 'formattedAddress', 'internationalPhoneNumber',
  'websiteUri', 'location', 'regularOpeningHours', 'photos',
].join(',');

async function fetchPlaceDetails(placeId: string, apiKey: string): Promise<GooglePlaceDetails | null> {
  try {
    const res = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
      headers: {
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': PLACES_DETAIL_FIELDS,
      },
    });
    if (!res.ok) {
      console.error(`    Places API error (${res.status}) for ${placeId}`);
      return null;
    }
    return await res.json();
  } catch (err) {
    console.error(`    Places API failed for ${placeId}: ${err}`);
    return null;
  }
}

async function searchPlace(name: string, city: string, apiKey: string): Promise<GooglePlaceDetails | null> {
  try {
    const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': `places.${PLACES_DETAIL_FIELDS.split(',').join(',places.')}`,
      },
      body: JSON.stringify({ textQuery: `${name} ${city}` }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.places?.[0] || null;
  } catch {
    return null;
  }
}

// ── Photo Download & Upload ────────────────────────────────────────────

async function downloadGooglePhoto(
  photoRef: { name: string; authorAttributions?: Array<{ displayName?: string }> },
  apiKey: string,
): Promise<{ buffer: Buffer; contentType: string; attribution: string } | null> {
  try {
    const isDirectUrl = photoRef.name.startsWith('http');
    const mediaUrl = isDirectUrl
      ? photoRef.name
      : `https://places.googleapis.com/v1/${photoRef.name}/media?maxHeightPx=800&key=${apiKey}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const res = await fetch(mediaUrl, { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) return null;
    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length < 5000) return null; // skip tiny
    if (buffer.length > 10 * 1024 * 1024) return null; // skip huge

    const attribution = isDirectUrl
      ? 'Website'
      : (photoRef.authorAttributions?.[0]?.displayName || 'Google');

    return { buffer, contentType: 'image/jpeg', attribution };
  } catch {
    return null;
  }
}

async function downloadWebImage(url: string): Promise<{ buffer: Buffer; contentType: string } | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      redirect: 'follow',
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) return null;
    const contentType = res.headers.get('content-type') || 'image/jpeg';
    if (!contentType.startsWith('image/')) return null;

    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length < 5000 || buffer.length > 10 * 1024 * 1024) return null;
    return { buffer, contentType };
  } catch {
    return null;
  }
}

async function uploadPhoto(buffer: Buffer, contentType: string, key: string): Promise<string> {
  const S3_BUCKET = process.env.S3_UPLOADS_BUCKET;
  const S3_REGION = process.env.S3_UPLOADS_REGION || 'us-east-1';

  if (S3_BUCKET) {
    const s3 = new S3Client({ region: S3_REGION });
    await s3.send(new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    }));
    return `https://${S3_BUCKET}.s3.${S3_REGION}.amazonaws.com/${key}`;
  } else {
    const localDir = join(process.cwd(), 'uploads', 'enriched');
    if (!existsSync(localDir)) mkdirSync(localDir, { recursive: true });
    const localPath = join(localDir, key.replace(/\//g, '-'));
    writeFileSync(localPath, buffer);
    return `/uploads/enriched/${key.replace(/\//g, '-')}`;
  }
}

// ── Website Scraping ───────────────────────────────────────────────────

const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function scrapeWebsite(url: string): Promise<ScrapedSite | null> {
  try {
    if (!url.startsWith('http')) url = `https://${url}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const res = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9,fa;q=0.8',
      },
      redirect: 'follow',
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) return null;
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('text/html')) return null;

    const html = await res.text();
    const dom = new JSDOM(html, { url });
    const doc = dom.window.document;

    // Meta info
    const title = doc.querySelector('title')?.textContent?.trim() || null;
    const metaDesc = doc.querySelector('meta[name="description"]')?.getAttribute('content')?.trim()
      || doc.querySelector('meta[property="og:description"]')?.getAttribute('content')?.trim()
      || null;
    const ogImage = doc.querySelector('meta[property="og:image"]')?.getAttribute('content')?.trim() || null;

    // Body text
    const unwanted = doc.querySelectorAll('script, style, nav, footer, header, noscript, iframe');
    unwanted.forEach(el => el.remove());
    const bodyText = doc.body?.textContent?.replace(/\s+/g, ' ').trim().slice(0, 5000) || '';

    // Images
    const imageUrls: string[] = [];
    const seen = new Set<string>();

    if (ogImage) {
      const abs = toAbsoluteUrl(ogImage, url);
      if (abs && !seen.has(abs)) { seen.add(abs); imageUrls.push(abs); }
    }

    const imgs = doc.querySelectorAll('img[src]');
    for (const img of imgs) {
      if (imageUrls.length >= 8) break;
      const src = img.getAttribute('src') || '';
      const width = parseInt(img.getAttribute('width') || '0', 10);
      const height = parseInt(img.getAttribute('height') || '0', 10);

      if (width > 0 && width < 100) continue;
      if (height > 0 && height < 100) continue;
      if (src.includes('logo') || src.includes('icon') || src.includes('favicon')) continue;
      if (src.includes('pixel') || src.includes('tracking') || src.includes('1x1')) continue;
      if (src.startsWith('data:')) continue;

      const abs = toAbsoluteUrl(src, url);
      if (abs && !seen.has(abs) && isImageUrl(abs)) {
        seen.add(abs);
        imageUrls.push(abs);
      }
    }

    // Social links (expanded to include WhatsApp)
    const socialLinks: Record<string, string> = {};
    const links = doc.querySelectorAll('a[href]');
    for (const link of links) {
      const href = link.getAttribute('href') || '';
      if (href.includes('instagram.com/')) {
        const match = href.match(/instagram\.com\/([^/?#]+)/);
        if (match && match[1] !== 'p' && match[1] !== 'reel' && match[1] !== 'explore') {
          socialLinks.instagram = href.split('?')[0];
        }
      } else if (href.includes('facebook.com/')) {
        socialLinks.facebook = href.split('?')[0];
      } else if (href.includes('twitter.com/') || href.includes('x.com/')) {
        socialLinks.twitter = href.split('?')[0];
      } else if (href.includes('tiktok.com/')) {
        socialLinks.tiktok = href.split('?')[0];
      } else if (href.includes('linkedin.com/')) {
        socialLinks.linkedin = href.split('?')[0];
      } else if (href.includes('youtube.com/') || href.includes('youtu.be/')) {
        socialLinks.youtube = href.split('?')[0];
      } else if (href.includes('t.me/') || href.includes('telegram.me/')) {
        socialLinks.telegram = href.split('?')[0];
      } else if (href.includes('wa.me/') || href.includes('whatsapp.com') || href.includes('api.whatsapp.com')) {
        socialLinks.whatsapp = href;
      } else if (href.includes('yelp.com/biz/')) {
        socialLinks.yelp = href.split('?')[0];
      }
    }

    // Also check for WhatsApp in onclick or tel: links with WhatsApp indicators
    const allElements = doc.querySelectorAll('[onclick*="whatsapp"], [href*="whatsapp"]');
    for (const el of allElements) {
      const onclick = el.getAttribute('onclick') || '';
      const href = el.getAttribute('href') || '';
      const waMatch = (onclick + href).match(/wa\.me\/(\+?\d+)/);
      if (waMatch && !socialLinks.whatsapp) {
        socialLinks.whatsapp = `https://wa.me/${waMatch[1]}`;
      }
    }

    return { title, description: metaDesc, bodyText, imageUrls, socialLinks, ogImage };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!msg.includes('abort')) {
      console.error(`    Scrape failed for ${url}: ${msg}`);
    } else {
      console.error(`    Timeout scraping ${url}`);
    }
    return null;
  }
}

function toAbsoluteUrl(src: string, base: string): string | null {
  try { return new URL(src, base).href; } catch { return null; }
}

function isImageUrl(url: string): boolean {
  const lower = url.toLowerCase();
  return /\.(jpg|jpeg|png|webp|avif)(\?|$)/.test(lower)
    || lower.includes('/image')
    || lower.includes('/photo')
    || lower.includes('/upload');
}

// ── LLM Enrichment ────────────────────────────────────────────────────

async function llmEnrich(
  listing: { title: string; description: string; city: string; country: string; categorySlug: string },
  englishName: string | null,
  siteData: ScrapedSite | null,
): Promise<LLMEnrichResult | null> {
  const websiteInfo = siteData
    ? `
Website info:
- Site title: ${siteData.title || 'N/A'}
- Meta description: ${siteData.description || 'N/A'}
- Page content (excerpt): ${siteData.bodyText.slice(0, 3000)}`
    : 'No website data available.';

  const prompt = `You are a native Persian (Farsi) editor for PersianPages, a directory of Iranian/Persian businesses worldwide.

Your job: Fix the Farsi name and write a proper Farsi description for this business.

BUSINESS INFO:
- Current Farsi title: ${listing.title}
- English name (from Google): ${englishName || 'N/A'}
- City: ${listing.city}, ${listing.country}
- Category: ${listing.categorySlug}
- Current description: ${listing.description}
${websiteInfo}

INSTRUCTIONS:

1. **titleFa**: Fix the Farsi spelling/transliteration of the business name. BE AGGRESSIVE — most titles need fixing.
   - Use the English name from Google as the PRIMARY reference for correct transliteration
   - Sound out the English name and transliterate it properly into Farsi script
   - Common mistakes to fix: wrong initial letter (e.g. ع instead of آ for "A"), missing vowels, wrong consonants
   - Example: "Alounak" → "آلونک" (NOT "علونک"), "Hafez" → "حافظ" (NOT "هفز")
   - Replace Arabic words with their Farsi equivalents: مخبز→نانوایی, حلويات→شیرینی‌فروشی, مطعم→رستوران, صالون→سالن
   - For brand names, transliterate the English name phonetically — don't guess a Farsi meaning
   - For person names (doctors, lawyers), use standard Farsi spelling: دکتر before name, proper name order
   - Remove redundant words: "کباب کباب غذای ایرانی" → "کباب ایرانی"
   - Don't add extra words like city name or category — just the business name, clean and correct
   - If you're unsure, transliterate the English name fresh rather than keeping a bad existing title

2. **description**: Write a rich, natural Farsi description (3-5 sentences).
   - Use details from the website content — mention specific services, specialties, menu items, areas of expertise
   - Write naturally as a knowledgeable local would describe the business to a friend
   - Include practical details: what they're known for, what makes them special
   - Don't be promotional or use superlatives — be informative
   - Don't start with the business name — jump straight into what they do
   - Must be in fluent, natural Farsi — not awkward machine-translated text

RESPOND ONLY with valid JSON (no markdown, no backticks):
{"titleFa": "...", "description": "..."}`;

  try {
    const content = await callLLM(prompt, { maxTokens: 800, model: 'gpt-4o' });
    if (!content) return null;

    // Parse JSON — handle possible markdown wrapping
    const cleaned = content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const parsed = JSON.parse(cleaned);

    if (!parsed.titleFa || !parsed.description) return null;
    return parsed;
  } catch (err) {
    console.error(`    LLM parse error: ${err}`);
    return null;
  }
}

// ── Main Enrichment ────────────────────────────────────────────────────

export interface EnrichOptions {
  limit?: number;
  city?: string;
  dryRun?: boolean;
  id?: string;
  force?: boolean;
}

export interface EnrichStats {
  total: number;
  scraped: number;
  descriptionsUpdated: number;
  titlesFixed: number;
  photosAdded: number;
  socialLinksAdded: number;
  websitesDiscovered: number;
  phonesUpdated: number;
  hoursUpdated: number;
  deactivated: number;
  failed: number;
  details: string[];
}

async function enrichListings(prisma: PrismaClient, options: EnrichOptions = {}): Promise<EnrichStats> {
  const { limit = 50, city, dryRun = false, id, force = false } = options;
  validateLLMConfig();

  const googleApiKey = process.env.GOOGLE_PLACES_API_KEY;

  const stats: EnrichStats = {
    total: 0, scraped: 0, descriptionsUpdated: 0, titlesFixed: 0,
    photosAdded: 0, socialLinksAdded: 0, websitesDiscovered: 0,
    phonesUpdated: 0, hoursUpdated: 0, deactivated: 0, failed: 0, details: [],
  };

  // Build query — all active scraped listings
  const where: any = {
    isActive: true,
    source: 'scraped',
  };
  if (city) where.city = city;
  if (id) {
    delete where.source;
    where.id = id;
  }

  const listings = await prisma.listing.findMany({
    where,
    include: { category: { select: { slug: true } } },
    orderBy: [
      { createdAt: 'desc' },
    ],
    take: limit,
  });

  stats.total = listings.length;
  console.log(`\nFound ${listings.length} listings to enrich${city ? ` in ${city}` : ''}${dryRun ? ' (DRY RUN)' : ''}${force ? ' (FORCE)' : ''}\n`);

  for (let i = 0; i < listings.length; i++) {
    const listing = listings[i];
    const num = `[${i + 1}/${listings.length}]`;
    console.log(`${num} ${listing.title}`);

    const updates: any = {};
    const updateDetails: string[] = [];

    // ── Step 1: Google Places refresh ──
    let placeData: GooglePlaceDetails | null = null;
    let englishName: string | null = null;

    if (googleApiKey) {
      if (listing.placeId) {
        placeData = await fetchPlaceDetails(listing.placeId, googleApiKey);
      } else {
        // Search by title + city to find the place
        console.log(`    Searching Google Places...`);
        placeData = await searchPlace(listing.title, listing.city, googleApiKey);
        if (placeData?.id) {
          updates.placeId = placeData.id;
          updateDetails.push(`+placeId`);
        }
      }

      if (placeData) {
        englishName = placeData.displayName?.text || null;
        console.log(`    Google: "${englishName}"`);

        // Update website if missing or was a Yelp URL
        if (!listing.website || listing.website.includes('yelp.com')) {
          if (placeData.websiteUri) {
            updates.website = placeData.websiteUri;
            stats.websitesDiscovered++;
            updateDetails.push(`+website`);
          }
        }

        // Update phone if missing
        if (!listing.phone && placeData.internationalPhoneNumber) {
          const phone = placeData.internationalPhoneNumber.replace(/[\s\-\(\)]/g, '');
          updates.phone = phone;
          stats.phonesUpdated++;
          updateDetails.push(`+phone`);
        }

        // Update business hours if missing
        if (!listing.businessHours && placeData.regularOpeningHours?.periods) {
          updates.businessHours = placeData.regularOpeningHours.periods;
          stats.hoursUpdated++;
          updateDetails.push(`+hours`);
        }

        // Update coordinates if missing
        if (!listing.latitude && placeData.location) {
          updates.latitude = placeData.location.latitude;
          updates.longitude = placeData.location.longitude;
          updateDetails.push(`+coords`);
        }

        // Check address/country mismatch — deactivate if Google address is in a different country
        if (placeData.formattedAddress) {
          const gAddr = placeData.formattedAddress.toLowerCase();
          const countryMismatch = detectCountryMismatch(listing.country, gAddr);
          if (countryMismatch) {
            console.log(`    ⚠ Country mismatch: listing says "${listing.country}" but Google says "${placeData.formattedAddress}"`);
            if (!dryRun) {
              await prisma.listing.update({
                where: { id: listing.id },
                data: { isActive: false },
              });
            }
            stats.deactivated++;
            stats.details.push(`DEACTIVATED: ${listing.title} — country mismatch (listed: ${listing.country}, Google: ${placeData.formattedAddress})`);
            continue; // skip rest of enrichment for this listing
          }
        }
      }

      await new Promise(r => setTimeout(r, 100)); // rate limit
    }

    // ── Step 2: Scrape website ──
    const websiteUrl = updates.website || listing.website;
    let siteData: ScrapedSite | null = null;

    if (websiteUrl && !websiteUrl.includes('yelp.com')) {
      siteData = await scrapeWebsite(websiteUrl);
      if (siteData) {
        stats.scraped++;

        // Social links
        if (Object.keys(siteData.socialLinks).length > 0) {
          const existing = (listing.socialLinks as Record<string, string>) || {};
          const merged = { ...existing, ...siteData.socialLinks };
          if (Object.keys(merged).length > Object.keys(existing).length) {
            updates.socialLinks = merged;
            stats.socialLinksAdded++;
            updateDetails.push(`+social: ${Object.keys(siteData.socialLinks).join(', ')}`);
          }
        }
      }
    }

    // ── Step 3: Download photos (up to 5 total) ──
    const currentPhotos = listing.photos || [];
    const currentAttributions = (listing.photoAttributions as Record<string, string>) || {};
    const newPhotos = [...currentPhotos];
    const newAttributions = { ...currentAttributions };
    const maxPhotos = 5;

    if (newPhotos.length < maxPhotos) {
      let added = 0;

      // Google Places photos first (higher quality)
      if (googleApiKey && placeData?.photos) {
        // Skip first photo if we already have a Google photo (it's usually the same)
        const startIdx = currentPhotos.some(p => p.includes('/scraped/')) ? 1 : 0;
        const candidates = placeData.photos.slice(startIdx, startIdx + (maxPhotos - newPhotos.length) + 2);

        for (const photoRef of candidates) {
          if (newPhotos.length >= maxPhotos) break;

          const img = await downloadGooglePhoto(photoRef, googleApiKey);
          if (!img) continue;

          const key = `uploads/enriched/${listing.id}-g${newPhotos.length}.jpg`;
          if (dryRun) {
            console.log(`    Would download Google photo`);
            added++;
            continue;
          }

          try {
            const uploadedUrl = await uploadPhoto(img.buffer, img.contentType, key);
            newPhotos.push(uploadedUrl);
            newAttributions[uploadedUrl] = img.attribution;
            added++;
            console.log(`    + Google photo (${img.attribution})`);
          } catch (err) {
            console.error(`    Photo upload failed: ${err}`);
          }

          await new Promise(r => setTimeout(r, 100));
        }
      }

      // Website photos to fill remaining slots
      if (siteData && newPhotos.length < maxPhotos) {
        for (const imgUrl of siteData.imageUrls) {
          if (newPhotos.length >= maxPhotos) break;
          // Skip if we already have this URL or similar
          if (newPhotos.some(p => p === imgUrl)) continue;

          const img = await downloadWebImage(imgUrl);
          if (!img) continue;

          const ext = img.contentType.includes('png') ? 'png'
            : img.contentType.includes('webp') ? 'webp' : 'jpg';
          const key = `uploads/enriched/${listing.id}-w${newPhotos.length}.${ext}`;

          if (dryRun) {
            console.log(`    Would download: ${imgUrl.slice(0, 80)}...`);
            added++;
            continue;
          }

          try {
            const uploadedUrl = await uploadPhoto(img.buffer, img.contentType, key);
            newPhotos.push(uploadedUrl);
            newAttributions[uploadedUrl] = websiteUrl || 'Website';
            added++;
            console.log(`    + Web photo: ${imgUrl.slice(0, 60)}...`);
          } catch (err) {
            console.error(`    Photo upload failed: ${err}`);
          }

          await new Promise(r => setTimeout(r, 100));
        }
      }

      if (added > 0) {
        updates.photos = newPhotos;
        updates.photoAttributions = newAttributions;
        stats.photosAdded += added;
        updateDetails.push(`+${added} photos`);
      }
    }

    // ── Step 4: LLM — fix title + generate description ──
    const result = await llmEnrich(
      {
        title: listing.title,
        description: listing.description,
        city: listing.city,
        country: listing.country,
        categorySlug: listing.category.slug,
      },
      englishName,
      siteData,
    );

    if (result) {
      // Update title if LLM changed it
      if (result.titleFa && result.titleFa !== listing.title) {
        updates.title = result.titleFa;
        stats.titlesFixed++;
        updateDetails.push(`title: "${listing.title}" → "${result.titleFa}"`);
      }

      // Update description if it's meaningfully different and longer
      if (result.description && result.description.length > 50) {
        updates.description = result.description;
        stats.descriptionsUpdated++;
        updateDetails.push(`description (${listing.description.length} → ${result.description.length} chars)`);
      }
    }

    // ── Step 5: Apply updates ──
    if (Object.keys(updates).length > 0 && !dryRun) {
      await prisma.listing.update({
        where: { id: listing.id },
        data: updates,
      });
      stats.details.push(`OK: ${listing.title} — ${updateDetails.join(', ')}`);
      console.log(`    ✓ Updated: ${updateDetails.join(', ')}`);
    } else if (Object.keys(updates).length > 0) {
      stats.details.push(`DRY: ${listing.title} — would update: ${updateDetails.join(', ')}`);
      console.log(`    [DRY] Would update: ${updateDetails.join(', ')}`);
    } else {
      stats.details.push(`NOOP: ${listing.title} — no improvements found`);
      console.log(`    — no improvements`);
      stats.failed++;
    }

    // Rate limit between listings
    await new Promise(r => setTimeout(r, 300));
  }

  return stats;
}

// ── CLI ────────────────────────────────────────────────────────────────

if (require.main === module) {
  loadEnvIfLocal();

  const args = process.argv.slice(2);
  let limit = 50;
  let city: string | undefined;
  let dryRun = false;
  let id: string | undefined;
  let force = false;

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--limit': limit = parseInt(args[++i], 10); break;
      case '--city': city = args[++i]; break;
      case '--dry-run': dryRun = true; break;
      case '--id': id = args[++i]; break;
      case '--force': force = true; break;
    }
  }

  const prisma = new PrismaClient();
  enrichListings(prisma, { limit, city, dryRun, id, force })
    .then(stats => {
      console.log('\n=== Enrichment Summary ===');
      console.log(`  Total: ${stats.total}, Scraped: ${stats.scraped}, Failed: ${stats.failed}`);
      console.log(`  Titles fixed: ${stats.titlesFixed}`);
      console.log(`  Descriptions updated: ${stats.descriptionsUpdated}`);
      console.log(`  Photos added: ${stats.photosAdded}`);
      console.log(`  Social links found: ${stats.socialLinksAdded}`);
      console.log(`  Websites discovered: ${stats.websitesDiscovered}`);
      console.log(`  Phones updated: ${stats.phonesUpdated}`);
      console.log(`  Hours updated: ${stats.hoursUpdated}`);
      console.log(`  Deactivated (country mismatch): ${stats.deactivated}`);
      console.log('');
      prisma.$disconnect();
    })
    .catch(err => {
      console.error('Fatal error:', err);
      prisma.$disconnect();
      process.exit(1);
    });
}

export { enrichListings, EnrichStats };
