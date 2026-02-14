import { PrismaClient } from '@prisma/client';
import { scrapedBusinesses } from './seed-data';

const prisma = new PrismaClient();

const categories = [
  { name: 'Restaurant', nameFa: 'رستوران', icon: '🍽️', slug: 'restaurant' },
  { name: 'Grocery', nameFa: 'سوپرمارکت', icon: '🛒', slug: 'grocery' },
  { name: 'Services', nameFa: 'خدمات', icon: '🔧', slug: 'services' },
  { name: 'Real Estate', nameFa: 'املاک', icon: '🏠', slug: 'real-estate' },
  { name: 'Legal', nameFa: 'حقوقی', icon: '⚖️', slug: 'legal' },
  { name: 'Medical', nameFa: 'پزشکی', icon: '🏥', slug: 'medical' },
  { name: 'Beauty', nameFa: 'زیبایی', icon: '💇', slug: 'beauty' },
  { name: 'Automotive', nameFa: 'خودرو', icon: '🚗', slug: 'automotive' },
  { name: 'Education', nameFa: 'آموزش', icon: '📚', slug: 'education' },
  { name: 'Financial', nameFa: 'مالی', icon: '💰', slug: 'financial' },
];

function makeSlugBase(titleEn: string): string {
  return titleEn
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

async function main() {
  console.log('Seeding categories...');

  const categoryMap: Record<string, string> = {};
  for (const category of categories) {
    const created = await prisma.category.upsert({
      where: { slug: category.slug },
      update: category,
      create: category,
    });
    categoryMap[category.slug] = created.id;
  }

  // Delete sample listings (source: 'user' from demo account)
  const deleted = await prisma.listing.deleteMany({
    where: { source: 'user', userId: { not: null } },
  });
  if (deleted.count > 0) {
    console.log(`Deleted ${deleted.count} sample listings`);
  }

  console.log('Seeding scraped businesses (unclaimed)...');

  const usedSlugs = new Set<string>();

  for (const biz of scrapedBusinesses) {
    const categoryId = categoryMap[biz.categorySlug];
    if (!categoryId) continue;

    const seedId = `scraped-${biz.titleEn.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

    // Generate unique slug
    let slug = makeSlugBase(biz.titleEn);
    let suffix = 2;
    while (usedSlugs.has(slug)) {
      slug = `${makeSlugBase(biz.titleEn)}-${suffix}`;
      suffix++;
    }
    usedSlugs.add(slug);

    await prisma.listing.upsert({
      where: { id: seedId },
      update: {
        title: biz.title,
        description: biz.description,
        phone: biz.phone || null,
        address: biz.address,
        city: biz.city,
        country: biz.country,
        website: biz.website || null,
        socialLinks: biz.socialLinks || undefined,
        slug,
      },
      create: {
        id: seedId,
        title: biz.title,
        description: biz.description,
        phone: biz.phone || null,
        address: biz.address,
        city: biz.city,
        country: biz.country,
        website: biz.website || null,
        socialLinks: biz.socialLinks || undefined,
        photos: [],
        userId: null,
        categoryId,
        source: 'scraped',
        isClaimed: false,
        claimedAt: null,
        slug,
      },
    });
  }

  console.log('Seeding complete!');
  console.log(`  - ${categories.length} categories`);
  console.log(`  - ${scrapedBusinesses.length} scraped listings (unclaimed)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
