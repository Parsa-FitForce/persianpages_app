/**
 * One-time migration: normalize all listing phone numbers to E.164 format.
 * Scraped listings may have national format (e.g., "(213) 123-4567").
 * This script converts them to E.164 (e.g., "+12131234567").
 *
 * Usage: npx tsx scripts/fix-phone-format.ts [--dry-run]
 */

import { PrismaClient } from '@prisma/client';
import { parsePhoneNumberFromString } from 'libphonenumber-js';

const prisma = new PrismaClient();
const dryRun = process.argv.includes('--dry-run');

// Map country names (Persian) to ISO codes for parsing hints
const countryHints: Record<string, string> = {
  'آمریکا': 'US',
  'کانادا': 'CA',
  'انگلستان': 'GB',
  'آلمان': 'DE',
  'فرانسه': 'FR',
  'استرالیا': 'AU',
  'سوئد': 'SE',
  'هلند': 'NL',
  'ترکیه': 'TR',
  'امارات': 'AE',
  'اتریش': 'AT',
  'دانمارک': 'DK',
  'نروژ': 'NO',
  'بلژیک': 'BE',
  'ایتالیا': 'IT',
  'اسپانیا': 'ES',
};

async function main() {
  const listings = await prisma.listing.findMany({
    where: { phone: { not: null } },
    select: { id: true, phone: true, country: true, title: true },
  });

  console.log(`Found ${listings.length} listings with phone numbers`);
  if (dryRun) console.log('DRY RUN — no changes will be made\n');

  let fixed = 0;
  let alreadyOk = 0;
  let failed = 0;

  for (const listing of listings) {
    const phone = listing.phone!;
    const cleaned = phone.replace(/[\s\-\(\)]/g, '');

    // Already E.164
    if (/^\+[1-9]\d{6,14}$/.test(cleaned)) {
      alreadyOk++;
      continue;
    }

    // Try parsing with country hint
    const countryHint = countryHints[listing.country] || undefined;
    const parsed = parsePhoneNumberFromString(phone, countryHint as any);

    if (parsed && parsed.isValid()) {
      const e164 = parsed.format('E.164');
      console.log(`  ${listing.title}: "${phone}" → "${e164}"`);
      if (!dryRun) {
        await prisma.listing.update({
          where: { id: listing.id },
          data: { phone: e164 },
        });
      }
      fixed++;
    } else {
      console.log(`  FAILED: ${listing.title}: "${phone}" (country: ${listing.country})`);
      failed++;
    }
  }

  console.log(`\nDone: ${fixed} fixed, ${alreadyOk} already E.164, ${failed} failed`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
