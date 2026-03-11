/**
 * PersianPages Listing Enrichment
 *
 * Visits business websites to scrape content, downloads images, and uses
 * an LLM (OpenAI by default, Anthropic fallback) to generate richer
 * Persian descriptions. ~$0.01 per listing.
 *
 * Usage (from server/):
 *   npx tsx scripts/enrich.ts                     # enrich all eligible listings
 *   npx tsx scripts/enrich.ts --limit 20          # enrich up to 20 listings
 *   npx tsx scripts/enrich.ts --city "لندن"        # only listings in a city
 *   npx tsx scripts/enrich.ts --dry-run            # preview without writing
 *   npx tsx scripts/enrich.ts --id clu1abc123      # enrich a single listing
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

// ── Website Scraping ───────────────────────────────────────────────────

interface ScrapedSite {
  title: string | null;
  description: string | null;
  bodyText: string;
  imageUrls: string[];
  socialLinks: Record<string, string>;
  ogImage: string | null;
}

const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function scrapeWebsite(url: string): Promise<ScrapedSite | null> {
  try {
    // Normalize URL
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

    // Extract meta info
    const title = doc.querySelector('title')?.textContent?.trim() || null;
    const metaDesc = doc.querySelector('meta[name="description"]')?.getAttribute('content')?.trim()
      || doc.querySelector('meta[property="og:description"]')?.getAttribute('content')?.trim()
      || null;
    const ogImage = doc.querySelector('meta[property="og:image"]')?.getAttribute('content')?.trim() || null;

    // Extract body text (stripped of scripts/styles)
    const unwanted = doc.querySelectorAll('script, style, nav, footer, header, noscript, iframe');
    unwanted.forEach(el => el.remove());
    const bodyText = doc.body?.textContent?.replace(/\s+/g, ' ').trim().slice(0, 5000) || '';

    // Extract images — prioritize large, content images
    const imageUrls: string[] = [];
    const seen = new Set<string>();

    // OG image first
    if (ogImage) {
      const abs = toAbsoluteUrl(ogImage, url);
      if (abs && !seen.has(abs)) { seen.add(abs); imageUrls.push(abs); }
    }

    // Content images
    const imgs = doc.querySelectorAll('img[src]');
    for (const img of imgs) {
      if (imageUrls.length >= 6) break;
      const src = img.getAttribute('src') || '';
      const alt = img.getAttribute('alt') || '';
      const width = parseInt(img.getAttribute('width') || '0', 10);
      const height = parseInt(img.getAttribute('height') || '0', 10);

      // Skip tiny images (icons, trackers, etc.)
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

    // Extract social links
    const socialLinks: Record<string, string> = {};
    const links = doc.querySelectorAll('a[href]');
    for (const link of links) {
      const href = link.getAttribute('href') || '';
      if (href.includes('instagram.com/')) {
        const match = href.match(/instagram\.com\/([^/?#]+)/);
        if (match && match[1] !== 'p' && match[1] !== 'reel') socialLinks.instagram = href;
      } else if (href.includes('facebook.com/')) {
        socialLinks.facebook = href;
      } else if (href.includes('twitter.com/') || href.includes('x.com/')) {
        socialLinks.twitter = href;
      } else if (href.includes('tiktok.com/')) {
        socialLinks.tiktok = href;
      } else if (href.includes('linkedin.com/')) {
        socialLinks.linkedin = href;
      } else if (href.includes('youtube.com/') || href.includes('youtu.be/')) {
        socialLinks.youtube = href;
      } else if (href.includes('t.me/') || href.includes('telegram.me/')) {
        socialLinks.telegram = href;
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
  try {
    return new URL(src, base).href;
  } catch {
    return null;
  }
}

function isImageUrl(url: string): boolean {
  const lower = url.toLowerCase();
  return /\.(jpg|jpeg|png|webp|avif)(\?|$)/.test(lower)
    || lower.includes('/image')
    || lower.includes('/photo')
    || lower.includes('/upload');
}

// ── Image Download & Upload ────────────────────────────────────────────

async function downloadImage(url: string): Promise<{ buffer: Buffer; contentType: string } | null> {
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

    // Skip tiny images (< 5KB probably icons/trackers)
    if (buffer.length < 5000) return null;
    // Skip huge images (> 10MB)
    if (buffer.length > 10 * 1024 * 1024) return null;

    return { buffer, contentType };
  } catch {
    return null;
  }
}

async function uploadPhoto(
  buffer: Buffer,
  contentType: string,
  key: string,
): Promise<string> {
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

// ── LLM Enrichment ────────────────────────────────────────────────────

interface EnrichmentResult {
  description: string;
  shortDescription?: string;
}

async function generateDescription(
  listing: { title: string; description: string; city: string; country: string; categorySlug: string },
  siteData: ScrapedSite,
): Promise<EnrichmentResult | null> {
  const prompt = `You are writing content for PersianPages, a directory of Iranian/Persian businesses worldwide.
Write in Persian (Farsi script).

Current listing:
- Title: ${listing.title}
- City: ${listing.city}, ${listing.country}
- Category: ${listing.categorySlug}
- Current description: ${listing.description}

Website content we scraped:
- Site title: ${siteData.title || 'N/A'}
- Meta description: ${siteData.description || 'N/A'}
- Page text (excerpt): ${siteData.bodyText.slice(0, 3000)}

Write an improved Persian description for this business (2-4 sentences). Use real details from the website — mention specific services, specialties, or unique offerings. Keep it natural and informative, not promotional. Only output the description text, nothing else.`;

  try {
    const content = await callLLM(prompt, { maxTokens: 500 });
    if (!content) return null;
    return { description: content };
  } catch (err) {
    console.error(`    LLM error: ${err}`);
    return null;
  }
}

// ── Main Enrichment ────────────────────────────────────────────────────

interface EnrichOptions {
  limit?: number;
  city?: string;
  dryRun?: boolean;
  id?: string;
}

interface EnrichStats {
  total: number;
  scraped: number;
  descriptionsUpdated: number;
  photosAdded: number;
  socialLinksAdded: number;
  websitesDiscovered: number;
  failed: number;
  details: string[];
}

async function enrichListings(prisma: PrismaClient, options: EnrichOptions = {}): Promise<EnrichStats> {
  const { limit = 50, city, dryRun = false, id } = options;
  validateLLMConfig();

  const stats: EnrichStats = {
    total: 0, scraped: 0, descriptionsUpdated: 0, photosAdded: 0,
    socialLinksAdded: 0, websitesDiscovered: 0, failed: 0, details: [],
  };

  // First: clean up Yelp page URLs (they're not real business websites)
  const yelpCleaned = await prisma.listing.updateMany({
    where: { website: { contains: 'yelp.com' } },
    data: { website: null },
  });
  if (yelpCleaned.count > 0) {
    console.log(`Cleaned ${yelpCleaned.count} Yelp URLs from listings`);
  }

  // Find listings with real websites that can be enriched
  const where: any = {
    isActive: true,
    source: 'scraped',
    website: { not: null },
  };
  if (city) where.city = city;
  if (id) {
    delete where.website;
    delete where.source;
    where.id = id;
  }

  const listings = await prisma.listing.findMany({
    where,
    include: { category: { select: { slug: true } } },
    orderBy: [
      // Prioritize: no photos first, then short descriptions
      { createdAt: 'desc' },
    ],
    take: limit,
  });

  stats.total = listings.length;
  console.log(`\nFound ${listings.length} listings to enrich${city ? ` in ${city}` : ''}${dryRun ? ' (DRY RUN)' : ''}\n`);

  for (let i = 0; i < listings.length; i++) {
    const listing = listings[i];
    const num = `[${i + 1}/${listings.length}]`;
    console.log(`${num} ${listing.title} — ${listing.website}`);

    // Step 1: Scrape the website
    const siteData = await scrapeWebsite(listing.website!);
    if (!siteData) {
      stats.failed++;
      stats.details.push(`SKIP: ${listing.title} — scrape failed`);
      continue;
    }
    stats.scraped++;

    const updates: any = {};
    const updateDetails: string[] = [];

    // Step 2: Download and upload new photos (up to 5 total)
    const currentPhotos = listing.photos || [];
    const currentAttributions = (listing.photoAttributions as Record<string, string>) || {};
    const newPhotos = [...currentPhotos];
    const newAttributions = { ...currentAttributions };
    const maxPhotos = 5;

    if (newPhotos.length < maxPhotos && siteData.imageUrls.length > 0) {
      const candidates = siteData.imageUrls.slice(0, maxPhotos - newPhotos.length + 2); // grab extras in case some fail
      let added = 0;

      for (const imgUrl of candidates) {
        if (newPhotos.length >= maxPhotos) break;

        const img = await downloadImage(imgUrl);
        if (!img) continue;

        const ext = img.contentType.includes('png') ? 'png'
          : img.contentType.includes('webp') ? 'webp' : 'jpg';
        const key = `uploads/enriched/${listing.id}-${newPhotos.length}.${ext}`;

        if (dryRun) {
          console.log(`    Would download: ${imgUrl.slice(0, 80)}...`);
          added++;
          continue;
        }

        try {
          const uploadedUrl = await uploadPhoto(img.buffer, img.contentType, key);
          newPhotos.push(uploadedUrl);
          newAttributions[uploadedUrl] = listing.website || 'Website';
          added++;
          console.log(`    + Photo: ${imgUrl.slice(0, 60)}...`);
        } catch (err) {
          console.error(`    Photo upload failed: ${err}`);
        }

        await new Promise(r => setTimeout(r, 200));
      }

      if (added > 0) {
        updates.photos = newPhotos;
        updates.photoAttributions = newAttributions;
        stats.photosAdded += added;
        updateDetails.push(`+${added} photos`);
      }
    }

    // Step 3: Add social links
    if (Object.keys(siteData.socialLinks).length > 0) {
      const existing = (listing.socialLinks as Record<string, string>) || {};
      const merged = { ...existing, ...siteData.socialLinks };
      const newCount = Object.keys(siteData.socialLinks).length - Object.keys(existing).length;
      if (Object.keys(merged).length > Object.keys(existing).length) {
        updates.socialLinks = merged;
        stats.socialLinksAdded++;
        updateDetails.push(`+social: ${Object.keys(siteData.socialLinks).join(', ')}`);
      }
    }

    // Step 4: Generate better description with LLM
    if (siteData.bodyText.length > 100) {
      const result = await generateDescription(
        {
          title: listing.title,
          description: listing.description,
          city: listing.city,
          country: listing.country,
          categorySlug: listing.category.slug,
        },
        siteData,
      );

      if (result && result.description.length > listing.description.length) {
        updates.description = result.description;
        stats.descriptionsUpdated++;
        updateDetails.push('updated description');
        console.log(`    ✓ New description (${listing.description.length} → ${result.description.length} chars)`);
      }
    }

    // Step 5: Apply updates
    if (Object.keys(updates).length > 0 && !dryRun) {
      await prisma.listing.update({
        where: { id: listing.id },
        data: updates,
      });
      stats.details.push(`OK: ${listing.title} — ${updateDetails.join(', ')}`);
    } else if (Object.keys(updates).length > 0) {
      stats.details.push(`DRY: ${listing.title} — would update: ${updateDetails.join(', ')}`);
    } else {
      stats.details.push(`NOOP: ${listing.title} — no improvements found`);
    }

    // Rate limit
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

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--limit': limit = parseInt(args[++i], 10); break;
      case '--city': city = args[++i]; break;
      case '--dry-run': dryRun = true; break;
      case '--id': id = args[++i]; break;
    }
  }

  const prisma = new PrismaClient();
  enrichListings(prisma, { limit, city, dryRun, id })
    .then(stats => {
      console.log('\n=== Enrichment Summary ===');
      console.log(`  Total: ${stats.total}, Scraped: ${stats.scraped}, Failed: ${stats.failed}`);
      console.log(`  Descriptions updated: ${stats.descriptionsUpdated}`);
      console.log(`  Photos added: ${stats.photosAdded}`);
      console.log(`  Social links found: ${stats.socialLinksAdded}`);
      console.log('');
      prisma.$disconnect();
    })
    .catch(err => {
      console.error('Fatal error:', err);
      prisma.$disconnect();
      process.exit(1);
    });
}

export { enrichListings, EnrichOptions, EnrichStats };
