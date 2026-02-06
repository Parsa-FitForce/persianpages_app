import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

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

const sampleListings = [
  {
    title: 'رستوران شب‌های تهران',
    description: 'رستوران ایرانی با غذاهای اصیل تهرانی. کباب کوبیده، جوجه کباب، چلوکباب سلطانی و انواع خورشت‌های خانگی. فضای دنج و سنتی با موسیقی زنده در آخر هفته‌ها.',
    categorySlug: 'restaurant',
    phone: '+1 310 555 0101',
    address: '1234 Westwood Blvd',
    city: 'لس‌آنجلس',
    country: 'آمریکا',
    website: 'https://example.com/tehran-nights',
    socialLinks: { instagram: 'tehrannightsla' },
    photos: ['https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800'],
  },
  {
    title: 'سوپرمارکت پارسیان',
    description: 'عرضه انواع مواد غذایی ایرانی، ادویه‌جات، نان تازه، لبنیات و محصولات منجمد. واردکننده مستقیم زعفران، خشکبار و چای ایرانی.',
    categorySlug: 'grocery',
    phone: '+1 416 555 0202',
    address: '567 Yonge Street',
    city: 'تورنتو',
    country: 'کانادا',
    website: 'https://example.com/parsian-market',
    socialLinks: { instagram: 'parsianmarket', telegram: 'parsianmarket' },
    photos: ['https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=800'],
  },
  {
    title: 'دکتر مریم احمدی - دندانپزشک',
    description: 'خدمات دندانپزشکی با بیش از ۱۵ سال تجربه. ایمپلنت، لمینیت، ارتودنسی و جراحی دندان عقل. پذیرش بیمه‌های مختلف.',
    categorySlug: 'medical',
    phone: '+49 30 555 0303',
    address: 'Kurfürstendamm 45',
    city: 'برلین',
    country: 'آلمان',
    socialLinks: { instagram: 'dr.ahmadi.dental' },
    photos: ['https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=800'],
  },
  {
    title: 'آموزشگاه زبان فارسی نور',
    description: 'آموزش زبان فارسی به کودکان و بزرگسالان. کلاس‌های آنلاین و حضوری. آموزش خواندن، نوشتن و مکالمه. معلمین مجرب و باتجربه.',
    categorySlug: 'education',
    phone: '+44 20 555 0404',
    address: '89 Kensington High Street',
    city: 'لندن',
    country: 'انگلستان',
    website: 'https://example.com/noor-academy',
    socialLinks: { instagram: 'noor.farsi', telegram: 'noorfarsi' },
    photos: ['https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800'],
  },
  {
    title: 'سالن زیبایی گلاره',
    description: 'خدمات آرایش و زیبایی بانوان. اپیلاسیون، مانیکور، پدیکور، آرایش عروس و شنیون. استفاده از محصولات برند معتبر.',
    categorySlug: 'beauty',
    phone: '+61 2 555 0505',
    address: '321 George Street',
    city: 'سیدنی',
    country: 'استرالیا',
    socialLinks: { instagram: 'golareh.beauty', whatsapp: '+61255550505' },
    photos: ['https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800'],
  },
  {
    title: 'مشاور املاک آریا',
    description: 'خرید، فروش و اجاره ملک در سراسر کالیفرنیا. مشاوره رایگان، ارزیابی ملک و کمک در دریافت وام مسکن. بیش از ۲۰ سال تجربه.',
    categorySlug: 'real-estate',
    phone: '+1 949 555 0606',
    address: '1000 Newport Center Dr',
    city: 'سانفرانسیسکو',
    country: 'آمریکا',
    website: 'https://example.com/aria-realty',
    socialLinks: { instagram: 'ariarealty' },
    photos: ['https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800'],
  },
  {
    title: 'وکیل مهاجرت - دکتر کریمی',
    description: 'مشاوره و وکالت در امور مهاجرتی. ویزای کار، تحصیلی، سرمایه‌گذاری و پناهندگی. تجربه موفق در پرونده‌های پیچیده.',
    categorySlug: 'legal',
    phone: '+1 604 555 0707',
    address: '1055 W Georgia St',
    city: 'ونکوور',
    country: 'کانادا',
    socialLinks: { instagram: 'karimi.law', telegram: 'karimiimmigration' },
    photos: ['https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=800'],
  },
  {
    title: 'تعمیرگاه خودرو پارس',
    description: 'تعمیر و سرویس انواع خودرو. تعویض روغن، ترمز، تایر و تعمیرات موتور. خدمات ویژه برای خودروهای اروپایی و ژاپنی.',
    categorySlug: 'automotive',
    phone: '+31 20 555 0808',
    address: 'Amstelveenseweg 500',
    city: 'آمستردام',
    country: 'هلند',
    socialLinks: { whatsapp: '+31205550808' },
    photos: ['https://images.unsplash.com/photo-1625047509248-ec889cbff17f?w=800'],
  },
];

async function main() {
  console.log('Seeding categories...');

  // Create categories
  const categoryMap: Record<string, string> = {};
  for (const category of categories) {
    const created = await prisma.category.upsert({
      where: { slug: category.slug },
      update: category,
      create: category,
    });
    categoryMap[category.slug] = created.id;
  }

  console.log('Creating demo user...');

  // Create demo user
  const hashedPassword = await bcrypt.hash('demo123', 10);
  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@persianpages.com' },
    update: {},
    create: {
      email: 'demo@persianpages.com',
      password: hashedPassword,
      name: 'کاربر نمونه',
    },
  });

  console.log('Seeding sample listings...');

  // Create sample listings
  for (const listing of sampleListings) {
    const categoryId = categoryMap[listing.categorySlug];
    if (!categoryId) continue;

    await prisma.listing.upsert({
      where: {
        id: `sample-${listing.categorySlug}-${listing.city.replace(/\s/g, '-')}`,
      },
      update: {},
      create: {
        id: `sample-${listing.categorySlug}-${listing.city.replace(/\s/g, '-')}`,
        title: listing.title,
        description: listing.description,
        phone: listing.phone,
        address: listing.address,
        city: listing.city,
        country: listing.country,
        website: listing.website,
        socialLinks: listing.socialLinks,
        photos: listing.photos,
        userId: demoUser.id,
        categoryId,
      },
    });
  }

  console.log('Seeding complete!');
  console.log('Demo account: demo@persianpages.com / demo123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
