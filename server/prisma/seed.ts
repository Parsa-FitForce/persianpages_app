import { PrismaClient } from '@prisma/client';

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

async function main() {
  console.log('Seeding categories...');

  for (const category of categories) {
    await prisma.category.upsert({
      where: { slug: category.slug },
      update: category,
      create: category,
    });
  }

  console.log('Seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
