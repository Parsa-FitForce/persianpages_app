/**
 * Removes Yelp page URLs from listings that were scraped from Yelp.
 * The Yelp API returns yelp.com links, not the business's actual website.
 *
 * Usage (from server/):
 *   npx tsx scripts/fix-yelp-urls.ts
 */

import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();

  const result = await prisma.listing.updateMany({
    where: {
      website: { contains: 'yelp.com' },
    },
    data: {
      website: null,
    },
  });

  console.log(`Cleared Yelp URLs from ${result.count} listing(s).`);

  await prisma.$disconnect();
}

main().catch(console.error);
