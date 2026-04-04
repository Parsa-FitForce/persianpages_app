import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

const SITE_NAME = 'PersianPages';
const SITE_URL = 'https://persianpages.com';
const DEFAULT_IMAGE = `${SITE_URL}/og-default.png`;

// Country code to Persian name mapping (matches client locations.ts)
const COUNTRY_NAMES: Record<string, { name: string; nameEn: string }> = {
  us: { name: 'آمریکا', nameEn: 'United States' },
  ca: { name: 'کانادا', nameEn: 'Canada' },
  de: { name: 'آلمان', nameEn: 'Germany' },
  ae: { name: 'امارات', nameEn: 'UAE' },
  tr: { name: 'ترکیه', nameEn: 'Turkey' },
  gb: { name: 'انگلستان', nameEn: 'United Kingdom' },
  se: { name: 'سوئد', nameEn: 'Sweden' },
  au: { name: 'استرالیا', nameEn: 'Australia' },
  fr: { name: 'فرانسه', nameEn: 'France' },
  nl: { name: 'هلند', nameEn: 'Netherlands' },
  at: { name: 'اتریش', nameEn: 'Austria' },
  it: { name: 'ایتالیا', nameEn: 'Italy' },
  es: { name: 'اسپانیا', nameEn: 'Spain' },
  no: { name: 'نروژ', nameEn: 'Norway' },
  dk: { name: 'دانمارک', nameEn: 'Denmark' },
  be: { name: 'بلژیک', nameEn: 'Belgium' },
  ch: { name: 'سوئیس', nameEn: 'Switzerland' },
  nz: { name: 'نیوزیلند', nameEn: 'New Zealand' },
  jp: { name: 'ژاپن', nameEn: 'Japan' },
  my: { name: 'مالزی', nameEn: 'Malaysia' },
};

// Slug → { Persian name (matches DB `city` column), English display name }
// Mirrors client/src/i18n/locations.ts so browse pages show real counts.
const CITIES_BY_SLUG: Record<string, { nameFa: string; nameEn: string }> = {
  'los-angeles': { nameFa: 'لس‌آنجلس', nameEn: 'Los Angeles' },
  'beverly-hills': { nameFa: 'بورلی‌هیلز', nameEn: 'Beverly Hills' },
  'irvine': { nameFa: 'ارواین', nameEn: 'Irvine' },
  'glendale': { nameFa: 'گلندیل', nameEn: 'Glendale' },
  'santa-monica': { nameFa: 'سانتا مونیکا', nameEn: 'Santa Monica' },
  'encino': { nameFa: 'انسینو', nameEn: 'Encino' },
  'woodland-hills': { nameFa: 'وودلند هیلز', nameEn: 'Woodland Hills' },
  'san-diego': { nameFa: 'سن‌دیگو', nameEn: 'San Diego' },
  'san-francisco': { nameFa: 'سانفرانسیسکو', nameEn: 'San Francisco' },
  'san-jose': { nameFa: 'سن‌خوزه', nameEn: 'San Jose' },
  'palo-alto': { nameFa: 'پالو آلتو', nameEn: 'Palo Alto' },
  'sacramento': { nameFa: 'ساکرامنتو', nameEn: 'Sacramento' },
  'fresno': { nameFa: 'فرزنو', nameEn: 'Fresno' },
  'houston': { nameFa: 'هیوستون', nameEn: 'Houston' },
  'dallas': { nameFa: 'دالاس', nameEn: 'Dallas' },
  'austin': { nameFa: 'آستین', nameEn: 'Austin' },
  'san-antonio': { nameFa: 'سن‌آنتونیو', nameEn: 'San Antonio' },
  'new-york': { nameFa: 'نیویورک', nameEn: 'New York' },
  'great-neck': { nameFa: 'گریت‌نک', nameEn: 'Great Neck' },
  'washington-dc': { nameFa: 'واشنگتن', nameEn: 'Washington DC' },
  'chicago': { nameFa: 'شیکاگو', nameEn: 'Chicago' },
  'seattle': { nameFa: 'سیاتل', nameEn: 'Seattle' },
  'boston': { nameFa: 'بوستون', nameEn: 'Boston' },
  'miami': { nameFa: 'مایامی', nameEn: 'Miami' },
  'atlanta': { nameFa: 'آتلانتا', nameEn: 'Atlanta' },
  'phoenix': { nameFa: 'فینیکس', nameEn: 'Phoenix' },
  'las-vegas': { nameFa: 'لاس‌وگاس', nameEn: 'Las Vegas' },
  'denver': { nameFa: 'دنور', nameEn: 'Denver' },
  'portland': { nameFa: 'پورتلند', nameEn: 'Portland' },
  'philadelphia': { nameFa: 'فیلادلفیا', nameEn: 'Philadelphia' },
  'baltimore': { nameFa: 'بالتیمور', nameEn: 'Baltimore' },
  'minneapolis': { nameFa: 'مینیاپولیس', nameEn: 'Minneapolis' },
  'salt-lake-city': { nameFa: 'سالت‌لیک‌سیتی', nameEn: 'Salt Lake City' },
  'toronto': { nameFa: 'تورنتو', nameEn: 'Toronto' },
  'vancouver': { nameFa: 'ونکوور', nameEn: 'Vancouver' },
  'montreal': { nameFa: 'مونترال', nameEn: 'Montreal' },
  'calgary': { nameFa: 'کلگری', nameEn: 'Calgary' },
  'ottawa': { nameFa: 'اتاوا', nameEn: 'Ottawa' },
  'edmonton': { nameFa: 'ادمونتون', nameEn: 'Edmonton' },
  'winnipeg': { nameFa: 'وینیپگ', nameEn: 'Winnipeg' },
  'richmond-hill': { nameFa: 'ریچموند‌هیل', nameEn: 'Richmond Hill' },
  'north-york': { nameFa: 'نورث‌یورک', nameEn: 'North York' },
  'markham': { nameFa: 'مارکهام', nameEn: 'Markham' },
  'berlin': { nameFa: 'برلین', nameEn: 'Berlin' },
  'munich': { nameFa: 'مونیخ', nameEn: 'Munich' },
  'frankfurt': { nameFa: 'فرانکفورت', nameEn: 'Frankfurt' },
  'hamburg': { nameFa: 'هامبورگ', nameEn: 'Hamburg' },
  'cologne': { nameFa: 'کلن', nameEn: 'Cologne' },
  'dusseldorf': { nameFa: 'دوسلدورف', nameEn: 'Dusseldorf' },
  'stuttgart': { nameFa: 'اشتوتگارت', nameEn: 'Stuttgart' },
  'hannover': { nameFa: 'هانوفر', nameEn: 'Hannover' },
  'bonn': { nameFa: 'بن', nameEn: 'Bonn' },
  'nuremberg': { nameFa: 'نورنبرگ', nameEn: 'Nuremberg' },
  'dubai': { nameFa: 'دبی', nameEn: 'Dubai' },
  'abu-dhabi': { nameFa: 'ابوظبی', nameEn: 'Abu Dhabi' },
  'sharjah': { nameFa: 'شارجه', nameEn: 'Sharjah' },
  'ajman': { nameFa: 'عجمان', nameEn: 'Ajman' },
  'istanbul': { nameFa: 'استانبول', nameEn: 'Istanbul' },
  'ankara': { nameFa: 'آنکارا', nameEn: 'Ankara' },
  'izmir': { nameFa: 'ازمیر', nameEn: 'Izmir' },
  'antalya': { nameFa: 'آنتالیا', nameEn: 'Antalya' },
  'bursa': { nameFa: 'بورسا', nameEn: 'Bursa' },
  'van': { nameFa: 'وان', nameEn: 'Van' },
  'london': { nameFa: 'لندن', nameEn: 'London' },
  'manchester': { nameFa: 'منچستر', nameEn: 'Manchester' },
  'birmingham': { nameFa: 'بیرمنگام', nameEn: 'Birmingham' },
  'leeds': { nameFa: 'لیدز', nameEn: 'Leeds' },
  'glasgow': { nameFa: 'گلاسگو', nameEn: 'Glasgow' },
  'bristol': { nameFa: 'بریستول', nameEn: 'Bristol' },
  'liverpool': { nameFa: 'لیورپول', nameEn: 'Liverpool' },
  'newcastle': { nameFa: 'نیوکاسل', nameEn: 'Newcastle' },
  'stockholm': { nameFa: 'استکهلم', nameEn: 'Stockholm' },
  'gothenburg': { nameFa: 'گوتنبرگ', nameEn: 'Gothenburg' },
  'uppsala': { nameFa: 'اوپسالا', nameEn: 'Uppsala' },
  'malmo': { nameFa: 'مالمو', nameEn: 'Malmo' },
  'linkoping': { nameFa: 'لینشوپینگ', nameEn: 'Linkoping' },
  'sydney': { nameFa: 'سیدنی', nameEn: 'Sydney' },
  'melbourne': { nameFa: 'ملبورن', nameEn: 'Melbourne' },
  'brisbane': { nameFa: 'بریزبن', nameEn: 'Brisbane' },
  'perth': { nameFa: 'پرث', nameEn: 'Perth' },
  'adelaide': { nameFa: 'آدلاید', nameEn: 'Adelaide' },
  'canberra': { nameFa: 'کانبرا', nameEn: 'Canberra' },
  'paris': { nameFa: 'پاریس', nameEn: 'Paris' },
  'lyon': { nameFa: 'لیون', nameEn: 'Lyon' },
  'marseille': { nameFa: 'مارسی', nameEn: 'Marseille' },
  'toulouse': { nameFa: 'تولوز', nameEn: 'Toulouse' },
  'nice': { nameFa: 'نیس', nameEn: 'Nice' },
  'amsterdam': { nameFa: 'آمستردام', nameEn: 'Amsterdam' },
  'rotterdam': { nameFa: 'روتردام', nameEn: 'Rotterdam' },
  'the-hague': { nameFa: 'لاهه', nameEn: 'The Hague' },
  'utrecht': { nameFa: 'اوترخت', nameEn: 'Utrecht' },
  'eindhoven': { nameFa: 'آیندهوون', nameEn: 'Eindhoven' },
  'vienna': { nameFa: 'وین', nameEn: 'Vienna' },
  'salzburg': { nameFa: 'سالزبورگ', nameEn: 'Salzburg' },
  'graz': { nameFa: 'گراتس', nameEn: 'Graz' },
  'linz': { nameFa: 'لینتس', nameEn: 'Linz' },
  'milan': { nameFa: 'میلان', nameEn: 'Milan' },
  'rome': { nameFa: 'رم', nameEn: 'Rome' },
  'turin': { nameFa: 'تورین', nameEn: 'Turin' },
  'bologna': { nameFa: 'بولونیا', nameEn: 'Bologna' },
  'madrid': { nameFa: 'مادرید', nameEn: 'Madrid' },
  'barcelona': { nameFa: 'بارسلونا', nameEn: 'Barcelona' },
  'valencia': { nameFa: 'والنسیا', nameEn: 'Valencia' },
  'oslo': { nameFa: 'اسلو', nameEn: 'Oslo' },
  'bergen': { nameFa: 'برگن', nameEn: 'Bergen' },
  'trondheim': { nameFa: 'تروندهایم', nameEn: 'Trondheim' },
  'copenhagen': { nameFa: 'کپنهاگ', nameEn: 'Copenhagen' },
  'aarhus': { nameFa: 'آرهوس', nameEn: 'Aarhus' },
  'odense': { nameFa: 'اودنسه', nameEn: 'Odense' },
  'brussels': { nameFa: 'بروکسل', nameEn: 'Brussels' },
  'antwerp': { nameFa: 'آنتورپ', nameEn: 'Antwerp' },
  'ghent': { nameFa: 'گنت', nameEn: 'Ghent' },
  'zurich': { nameFa: 'زوریخ', nameEn: 'Zurich' },
  'geneva': { nameFa: 'ژنو', nameEn: 'Geneva' },
  'bern': { nameFa: 'برن', nameEn: 'Bern' },
  'basel': { nameFa: 'بازل', nameEn: 'Basel' },
  'auckland': { nameFa: 'اوکلند', nameEn: 'Auckland' },
  'wellington': { nameFa: 'ولینگتون', nameEn: 'Wellington' },
  'christchurch': { nameFa: 'کرایستچرچ', nameEn: 'Christchurch' },
  'tokyo': { nameFa: 'توکیو', nameEn: 'Tokyo' },
  'osaka': { nameFa: 'اوساکا', nameEn: 'Osaka' },
  'yokohama': { nameFa: 'یوکوهاما', nameEn: 'Yokohama' },
  'kuala-lumpur': { nameFa: 'کوالالامپور', nameEn: 'Kuala Lumpur' },
  'penang': { nameFa: 'پنانگ', nameEn: 'Penang' },
};

function resolveCity(slug: string): { nameFa: string; nameEn: string } {
  const hit = CITIES_BY_SLUG[slug];
  if (hit) return hit;
  // Unknown slug: reverse the slug into a display name and use it for both.
  const nameEn = slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  return { nameFa: nameEn, nameEn };
}

const FALLBACK_META = {
  title: `${SITE_NAME} | دایرکتوری مشاغل ایرانی`,
  description: 'دایرکتوری آنلاین مشاغل ایرانی در کانادا - رستوران، پزشک، وکیل، املاک و خدمات ایرانی',
  image: DEFAULT_IMAGE,
  url: SITE_URL,
  type: 'website',
  jsonLd: {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: SITE_URL,
    description: 'دایرکتوری آنلاین مشاغل ایرانی در کانادا',
  },
};

// Browse: country page meta
router.get('/browse/:countryCode', async (req: Request, res: Response) => {
  try {
    const country = COUNTRY_NAMES[req.params.countryCode];
    if (!country) return res.json(FALLBACK_META);

    const listingCount = await prisma.listing.count({
      where: { country: country.name, isActive: true },
    });

    const url = `${SITE_URL}/browse/${req.params.countryCode}`;
    const title = `کسب‌وکارهای ایرانی در ${country.name} | ${SITE_NAME}`;
    const description = `مشاهده ${listingCount} کسب‌وکار ایرانی در ${country.name} - ${SITE_NAME}`;

    return res.json({
      title,
      description,
      image: DEFAULT_IMAGE,
      url,
      type: 'CollectionPage',
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: title,
        description,
        url,
        isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: SITE_URL },
      },
    });
  } catch (error) {
    console.error('Meta API error:', error);
    res.json(FALLBACK_META);
  }
});

// Browse: country + category meta (must come before the generic :citySlug route)
router.get('/browse/:countryCode/category/:categorySlug', async (req: Request, res: Response) => {
  try {
    const country = COUNTRY_NAMES[req.params.countryCode];
    if (!country) return res.json(FALLBACK_META);

    const category = await prisma.category.findUnique({ where: { slug: req.params.categorySlug } });
    if (!category) return res.json(FALLBACK_META);

    const listingCount = await prisma.listing.count({
      where: { country: country.name, categoryId: category.id, isActive: true },
    });

    const url = `${SITE_URL}/browse/${req.params.countryCode}/category/${req.params.categorySlug}`;
    const title = `${category.nameFa} ایرانی در ${country.name} | ${SITE_NAME}`;
    const description = `مشاهده ${listingCount} ${category.nameFa} ایرانی در ${country.name} - ${SITE_NAME}`;

    return res.json({
      title,
      description,
      image: DEFAULT_IMAGE,
      url,
      type: 'CollectionPage',
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: title,
        description,
        url,
        numberOfItems: listingCount,
        isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: SITE_URL },
      },
    });
  } catch (error) {
    console.error('Meta API error:', error);
    res.json(FALLBACK_META);
  }
});

// Browse: city + category meta (4 segments — must come before 3-segment :citySlug route)
router.get('/browse/:countryCode/:citySlug/:categorySlug', async (req: Request, res: Response) => {
  try {
    const country = COUNTRY_NAMES[req.params.countryCode];
    if (!country) return res.json(FALLBACK_META);

    const category = await prisma.category.findUnique({ where: { slug: req.params.categorySlug } });
    if (!category) return res.json(FALLBACK_META);

    const city = resolveCity(req.params.citySlug);

    const listingCount = await prisma.listing.count({
      where: {
        country: country.name,
        city: { contains: city.nameFa, mode: 'insensitive' },
        categoryId: category.id,
        isActive: true,
      },
    });

    const url = `${SITE_URL}/browse/${req.params.countryCode}/${req.params.citySlug}/${req.params.categorySlug}`;
    const title = `${category.nameFa} ایرانی در ${city.nameFa}, ${country.name} | ${SITE_NAME}`;
    const description = `مشاهده ${listingCount} ${category.nameFa} ایرانی در ${city.nameFa} - ${SITE_NAME}`;

    return res.json({
      title,
      description,
      image: DEFAULT_IMAGE,
      url,
      type: 'CollectionPage',
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: title,
        description,
        url,
        numberOfItems: listingCount,
        isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: SITE_URL },
      },
    });
  } catch (error) {
    console.error('Meta API error:', error);
    res.json(FALLBACK_META);
  }
});

// Browse: city page meta
router.get('/browse/:countryCode/:citySlug', async (req: Request, res: Response) => {
  try {
    const country = COUNTRY_NAMES[req.params.countryCode];
    if (!country) return res.json(FALLBACK_META);

    const city = resolveCity(req.params.citySlug);

    const listingCount = await prisma.listing.count({
      where: { country: country.name, city: { contains: city.nameFa, mode: 'insensitive' }, isActive: true },
    });

    const url = `${SITE_URL}/browse/${req.params.countryCode}/${req.params.citySlug}`;
    const title = `کسب‌وکارهای ایرانی در ${city.nameFa}, ${country.name} | ${SITE_NAME}`;
    const description = `مشاهده ${listingCount} کسب‌وکار ایرانی در ${city.nameFa} - ${SITE_NAME}`;

    return res.json({
      title,
      description,
      image: DEFAULT_IMAGE,
      url,
      type: 'CollectionPage',
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: title,
        description,
        url,
        isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: SITE_URL },
      },
    });
  } catch (error) {
    console.error('Meta API error:', error);
    res.json(FALLBACK_META);
  }
});

router.get('/:type/:id', async (req: Request, res: Response) => {
  const { type, id } = req.params;

  try {
    if (type === 'listing') {
      // Try slug first, then id
      let listing = await prisma.listing.findUnique({
        where: { slug: id },
        include: { category: true },
      });
      if (!listing) {
        listing = await prisma.listing.findUnique({
          where: { id },
          include: { category: true },
        });
      }

      if (!listing) {
        return res.json(FALLBACK_META);
      }

      const url = `${SITE_URL}/listing/${listing.slug || listing.id}`;
      const image = listing.photos.length > 0 ? listing.photos[0] : DEFAULT_IMAGE;
      const description = listing.description
        ? listing.description.substring(0, 160)
        : `${listing.title} - ${listing.category.nameFa} در ${listing.city}`;

      return res.json({
        title: `${listing.title} | ${SITE_NAME}`,
        description,
        image,
        url,
        type: 'LocalBusiness',
        jsonLd: {
          '@context': 'https://schema.org',
          '@type': 'LocalBusiness',
          name: listing.title,
          description: listing.description,
          image,
          url,
          address: {
            '@type': 'PostalAddress',
            streetAddress: listing.address,
            addressLocality: listing.city,
            addressCountry: listing.country,
          },
          ...(listing.phone && { telephone: listing.phone }),
          ...(listing.latitude && listing.longitude && {
            geo: {
              '@type': 'GeoCoordinates',
              latitude: listing.latitude,
              longitude: listing.longitude,
            },
          }),
          ...(listing.website && { sameAs: listing.website }),
        },
      });
    }

    if (type === 'category') {
      const category = await prisma.category.findUnique({
        where: { slug: id },
      });

      if (!category) {
        return res.json(FALLBACK_META);
      }

      const listingCount = await prisma.listing.count({
        where: { categoryId: category.id, isActive: true },
      });

      const url = `${SITE_URL}/category/${category.slug}`;

      return res.json({
        title: `${category.nameFa} - ${category.name} | ${SITE_NAME}`,
        description: `مشاهده ${listingCount} کسب‌وکار در دسته ${category.nameFa} - ${SITE_NAME}`,
        image: DEFAULT_IMAGE,
        url,
        type: 'CollectionPage',
        jsonLd: {
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          name: `${category.nameFa} - ${category.name}`,
          description: `لیست مشاغل ایرانی در دسته ${category.nameFa}`,
          url,
          numberOfItems: listingCount,
          isPartOf: {
            '@type': 'WebSite',
            name: SITE_NAME,
            url: SITE_URL,
          },
        },
      });
    }

    res.json(FALLBACK_META);
  } catch (error) {
    console.error('Meta API error:', error);
    res.json(FALLBACK_META);
  }
});

export default router;
