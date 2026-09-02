import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import {
  findCanonicalListing,
  isSeoEligibleBrowseSource,
  isSeoEligibleListing,
  MIN_INDEXABLE_BROWSE_LISTINGS,
  selectCanonicalListings,
} from '../utils/seo.js';
import { buildBrowsePageContent, BrowsePageContent } from '../utils/browseContent.js';

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

function resolveCity(slug: string): { nameFa: string; nameEn: string } | null {
  return CITIES_BY_SLUG[slug] || null;
}

const COUNTRY_FA_TO_CODE: Record<string, string> = Object.fromEntries(
  Object.entries(COUNTRY_NAMES).map(([code, { name }]) => [name, code])
);

const CITY_FA_TO_SLUG: Record<string, string> = Object.fromEntries(
  Object.entries(CITIES_BY_SLUG).map(([slug, { nameFa }]) => [nameFa, slug])
);

export function countryCodeFromFa(name: string): string | null {
  return COUNTRY_FA_TO_CODE[name] || null;
}

export function citySlugFromFa(name: string): string | null {
  return CITY_FA_TO_SLUG[name] || null;
}

function esc(s: string | null | undefined): string {
  if (!s) return '';
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const CATEGORY_SCHEMA_TYPES: Record<string, string> = {
  restaurant: 'Restaurant',
  grocery: 'GroceryStore',
  medical: 'MedicalBusiness',
  legal: 'LegalService',
  'real-estate': 'RealEstateAgent',
  automotive: 'AutomotiveBusiness',
  beauty: 'HealthAndBeautyBusiness',
  financial: 'FinancialService',
};

const DAY_SCHEMA_NAMES: Record<string, string> = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday',
};

function absoluteUrl(pathOrUrl: string): string {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  return `${SITE_URL}${pathOrUrl.startsWith('/') ? '' : '/'}${pathOrUrl}`;
}

function normalizeSocialUrl(network: string, value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  const handle = trimmed.replace(/^@/, '');
  if (network === 'instagram') return `https://instagram.com/${handle}`;
  if (network === 'facebook') return `https://facebook.com/${handle}`;
  if (network === 'telegram') return `https://t.me/${handle}`;
  if (network === 'whatsapp') return `https://wa.me/${handle.replace(/[^\d+]/g, '')}`;
  if (network === 'youtube') return `https://youtube.com/${handle}`;
  if (network === 'tiktok') return `https://tiktok.com/${handle}`;
  return `https://${trimmed}`;
}

function sameAsUrls(website: string | null, socialLinks: unknown): string[] {
  const urls = new Set<string>();
  if (website) urls.add(website);
  if (socialLinks && typeof socialLinks === 'object') {
    for (const [network, value] of Object.entries(socialLinks as Record<string, unknown>)) {
      if (typeof value !== 'string') continue;
      const url = normalizeSocialUrl(network.toLowerCase(), value);
      if (url) urls.add(url);
    }
  }
  return [...urls];
}

type OpeningHoursSpec = {
  '@type': 'OpeningHoursSpecification';
  dayOfWeek: string;
  opens: string;
  closes: string;
};

function openingHoursSpecification(hours: unknown): OpeningHoursSpec[] | undefined {
  if (!hours || typeof hours !== 'object') return undefined;
  const specs = Object.entries(hours as Record<string, unknown>)
    .map(([day, value]) => {
      const dayOfWeek = DAY_SCHEMA_NAMES[day.toLowerCase()];
      if (!dayOfWeek || value === undefined || value === null || value === false || value === 'closed') {
        return null;
      }

      let display: string | null = null;
      if (typeof value === 'string') {
        display = value;
      } else if (typeof value === 'object') {
        const v = value as { open?: string; close?: string };
        if (v.open && v.close) display = `${v.open} - ${v.close}`;
      }
      if (!display) return null;

      const [opens, closes] = display.split(/\s*-\s*/);
      if (!opens || !closes) return null;
      return {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek,
        opens,
        closes,
      };
    })
    .filter((spec): spec is OpeningHoursSpec => spec !== null);

  return specs.length > 0 ? specs : undefined;
}

function localBusinessJsonLd(listing: {
  id: string;
  slug: string | null;
  title: string;
  description: string;
  address: string;
  city: string;
  country: string;
  phone: string | null;
  website: string | null;
  latitude: number | null;
  longitude: number | null;
  photos: string[];
  socialLinks: unknown;
  businessHours: unknown;
  category: { slug: string };
}) {
  const pageUrl = absoluteUrl(`/listing/${listing.slug || listing.id}`);
  const sameAs = sameAsUrls(listing.website, listing.socialLinks);
  const openingHours = openingHoursSpecification(listing.businessHours);

  return {
    '@context': 'https://schema.org',
    '@type': CATEGORY_SCHEMA_TYPES[listing.category.slug] || 'LocalBusiness',
    '@id': `${pageUrl}#business`,
    name: listing.title,
    description: listing.description,
    image: listing.photos.length > 0 ? listing.photos : DEFAULT_IMAGE,
    url: pageUrl,
    mainEntityOfPage: pageUrl,
    inLanguage: 'fa',
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
    ...(sameAs.length > 0 && { sameAs }),
    ...(openingHours && { openingHoursSpecification: openingHours }),
  };
}

type BrowseListing = {
  slug: string | null;
  id: string;
  title: string;
  description: string;
  city: string;
  category: { nameFa: string };
};

type IndexableBrowseListing = BrowseListing & {
  address: string;
  country: string;
  phone: string | null;
  website: string | null;
  placeId: string | null;
  photos: string[];
  businessHours: unknown;
  isActive: boolean;
  isClaimed: boolean;
  phoneVerified: boolean;
  source: string;
  updatedAt: Date;
  category: { nameFa: string; slug: string };
};

type BreadcrumbItem = { label: string; href?: string };
type NavLink = { label: string; href: string };

async function getAllIndexableBrowseListings(): Promise<IndexableBrowseListing[]> {
  const listings = await prisma.listing.findMany({
    where: { isActive: true },
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      address: true,
      city: true,
      country: true,
      phone: true,
      website: true,
      placeId: true,
      photos: true,
      businessHours: true,
      isActive: true,
      isClaimed: true,
      phoneVerified: true,
      source: true,
      updatedAt: true,
      category: { select: { nameFa: true, slug: true } },
    },
    orderBy: { updatedAt: 'desc' },
  });

  return selectCanonicalListings(listings, isSeoEligibleBrowseSource);
}

function listingMatchesCity(listing: IndexableBrowseListing, cityName: string): boolean {
  return listing.city.toLocaleLowerCase().includes(cityName.toLocaleLowerCase());
}

function countIndexableFacets<T>(items: T[], keyFor: (item: T) => string | null): Map<string, number> {
  const counts = new Map<string, number>();
  for (const item of items) {
    const key = keyFor(item);
    if (!key) continue;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return counts;
}

function indexableFacetEntries(counts: Map<string, number>): [string, number][] {
  return [...counts.entries()]
    .filter(([, count]) => count >= MIN_INDEXABLE_BROWSE_LISTINGS)
    .sort((a, b) => b[1] - a[1]);
}

function renderBreadcrumbs(items: BreadcrumbItem[]): string {
  if (items.length === 0) return '';
  const parts = items.map((item, i) => {
    const isLast = i === items.length - 1;
    if (item.href && !isLast) {
      return `<li><a href="${esc(item.href)}">${esc(item.label)}</a></li>`;
    }
    return `<li>${esc(item.label)}</li>`;
  });
  return `<nav aria-label="مسیر"><ol>${parts.join('')}</ol></nav>`;
}

function breadcrumbJsonLd(items: BreadcrumbItem[]): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.label,
      ...(item.href ? { item: item.href.startsWith('http') ? item.href : `${SITE_URL}${item.href}` } : {}),
    })),
  };
}

function renderNavLinks(heading: string, links: NavLink[]): string {
  if (links.length === 0) return '';
  const items = links
    .map((l) => `<li><a href="${esc(l.href)}">${esc(l.label)}</a></li>`)
    .join('');
  return `<section><h2>${esc(heading)}</h2><ul>${items}</ul></section>`;
}

function renderBrowseBody(opts: {
  h1: string;
  content: BrowsePageContent;
  listings: BrowseListing[];
  totalCount: number;
  breadcrumbs?: BreadcrumbItem[];
  navSections?: { heading: string; links: NavLink[] }[];
}): string {
  const { h1, content, listings, totalCount, breadcrumbs = [], navSections = [] } = opts;
  const items = listings
    .map((l) => {
      const href = `/listing/${l.slug || l.id}`;
      const desc = l.description ? l.description.substring(0, 220) : '';
      return `<li><article><h2><a href="${esc(href)}">${esc(l.title)}</a></h2><p>${esc(l.category.nameFa)} — ${esc(l.city)}</p>${desc ? `<p>${esc(desc)}</p>` : ''}</article></li>`;
    })
    .join('');
  const navHtml = navSections.map((s) => renderNavLinks(s.heading, s.links)).join('');
  const guideHtml = `<section><h2>${esc(content.overviewHeading)}</h2>${content.paragraphs.map((paragraph) => `<p>${esc(paragraph)}</p>`).join('')}<h3>${esc(content.checklistHeading)}</h3><ul>${content.checklist.map((item) => `<li>${esc(item)}</li>`).join('')}</ul><p>${esc(content.accuracyNote)}</p></section>`;
  return `<main>${renderBreadcrumbs(breadcrumbs)}<h1>${esc(h1)}</h1><p>${esc(content.intro)}</p><p>تعداد کل: ${totalCount}</p><ul>${items}</ul>${navHtml}${guideHtml}</main>`;
}

const DAY_LABELS_FA: Record<string, string> = {
  monday: 'دوشنبه',
  tuesday: 'سه‌شنبه',
  wednesday: 'چهارشنبه',
  thursday: 'پنج‌شنبه',
  friday: 'جمعه',
  saturday: 'شنبه',
  sunday: 'یکشنبه',
};
const DAY_ORDER = ['saturday', 'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday'];

function renderBusinessHours(hours: unknown): string {
  if (!hours || typeof hours !== 'object') return '';
  const obj = hours as Record<string, unknown>;
  const rows: string[] = [];
  for (const day of DAY_ORDER) {
    const value = obj[day];
    if (value === undefined || value === null) continue;
    const label = DAY_LABELS_FA[day] || day;
    let display: string;
    if (value === 'closed' || value === false) {
      display = 'تعطیل';
    } else if (typeof value === 'string') {
      display = value;
    } else if (typeof value === 'object' && value !== null) {
      const v = value as { open?: string; close?: string };
      if (v.open && v.close) display = `${v.open} - ${v.close}`;
      else continue;
    } else {
      continue;
    }
    rows.push(`<tr><th scope="row">${esc(label)}</th><td>${esc(display)}</td></tr>`);
  }
  if (rows.length === 0) return '';
  return `<section><h2>ساعات کاری</h2><table><tbody>${rows.join('')}</tbody></table></section>`;
}

const SOCIAL_LABELS_FA: Record<string, string> = {
  instagram: 'اینستاگرام',
  facebook: 'فیسبوک',
  twitter: 'توییتر',
  telegram: 'تلگرام',
  youtube: 'یوتیوب',
  tiktok: 'تیک‌تاک',
  linkedin: 'لینکدین',
  whatsapp: 'واتساپ',
};

function renderSocialLinks(links: unknown): string {
  if (!links || typeof links !== 'object') return '';
  const obj = links as Record<string, unknown>;
  const items: string[] = [];
  for (const [key, val] of Object.entries(obj)) {
    if (typeof val !== 'string' || !val) continue;
    const url = val.startsWith('http') ? val : `https://${val}`;
    const label = SOCIAL_LABELS_FA[key.toLowerCase()] || key;
    items.push(`<li><a href="${esc(url)}" rel="nofollow noopener">${esc(label)}</a></li>`);
  }
  if (items.length === 0) return '';
  return `<section><h2>شبکه‌های اجتماعی</h2><ul>${items.join('')}</ul></section>`;
}

function renderRelatedListings(heading: string, listings: BrowseListing[]): string {
  if (listings.length === 0) return '';
  const items = listings
    .map((l) => {
      const href = `/listing/${l.slug || l.id}`;
      const desc = l.description ? l.description.substring(0, 140) : '';
      return `<li><article><h3><a href="${esc(href)}">${esc(l.title)}</a></h3><p>${esc(l.category.nameFa)} — ${esc(l.city)}</p>${desc ? `<p>${esc(desc)}</p>` : ''}</article></li>`;
    })
    .join('');
  return `<section><h2>${esc(heading)}</h2><ul>${items}</ul></section>`;
}

function renderListingBody(opts: {
  listing: {
    title: string;
    description: string;
    address: string;
    city: string;
    country: string;
    phone: string | null;
    website: string | null;
    photos: string[];
    socialLinks: unknown;
    businessHours: unknown;
    isClaimed: boolean;
    phoneVerified: boolean;
    updatedAt: Date;
    category: { nameFa: string; slug: string };
  };
  breadcrumbs: BreadcrumbItem[];
  exploreLinks: NavLink[];
}): string {
  const { listing, breadcrumbs, exploreLinks } = opts;
  const parts: string[] = [];
  parts.push(renderBreadcrumbs(breadcrumbs));
  parts.push(`<h1>${esc(listing.title)}</h1>`);
  parts.push(`<p><strong>${esc(listing.category.nameFa)}</strong> در ${esc(listing.city)}، ${esc(listing.country)}</p>`);
  if (listing.photos.length > 0) {
    const images = listing.photos
      .slice(0, 3)
      .map((photo, i) => `<figure><img src="${esc(photo)}" alt="${esc(`${listing.title} - عکس ${i + 1}`)}" loading="lazy" /></figure>`)
      .join('');
    parts.push(`<section><h2>عکس‌های ${esc(listing.title)}</h2>${images}</section>`);
  }
  if (listing.description) {
    parts.push(`<section><h2>درباره ${esc(listing.title)}</h2><p>${esc(listing.description)}</p></section>`);
  }

  const qualitySignals = [
    listing.isClaimed ? 'مالکیت این کسب‌وکار در پرشین‌پیجز ثبت شده است.' : '',
    listing.phoneVerified ? 'شماره تماس این کسب‌وکار تأیید شده است.' : '',
    listing.photos.length > 0 ? `${listing.photos.length} عکس برای این کسب‌وکار ثبت شده است.` : '',
    listing.businessHours && typeof listing.businessHours === 'object' && Object.keys(listing.businessHours).length > 0
      ? 'ساعات کاری در این صفحه موجود است.'
      : '',
  ].filter(Boolean);
  parts.push(`<section><h2>اطلاعات صفحه</h2><p>در این صفحه می‌توانید اطلاعات تماس، آدرس، وب‌سایت، دسته‌بندی و جزئیات ${esc(listing.title)} را در پرشین‌پیجز ببینید.</p>${
    qualitySignals.length > 0 ? `<ul>${qualitySignals.map((signal) => `<li>${esc(signal)}</li>`).join('')}</ul>` : ''
  }<p>آخرین به‌روزرسانی: ${esc(listing.updatedAt.toISOString().split('T')[0])}</p></section>`);

  const contactBits: string[] = [];
  contactBits.push(`<address><p>${esc(listing.address)}</p><p>${esc(listing.city)}، ${esc(listing.country)}</p></address>`);
  if (listing.phone) contactBits.push(`<p>تلفن: <a href="tel:${esc(listing.phone)}">${esc(listing.phone)}</a></p>`);
  if (listing.website) contactBits.push(`<p>وب‌سایت: <a href="${esc(listing.website)}" rel="nofollow">${esc(listing.website)}</a></p>`);
  parts.push(`<section><h2>اطلاعات تماس</h2>${contactBits.join('')}</section>`);
  parts.push(renderBusinessHours(listing.businessHours));
  parts.push(renderSocialLinks(listing.socialLinks));
  if (exploreLinks.length > 0) {
    parts.push(renderNavLinks('کاوش بیشتر', exploreLinks));
  }
  return `<main>${parts.filter(Boolean).join('')}</main>`;
}

const BROWSE_PAGE_SIZE = 12;

const FALLBACK_META = {
  title: `${SITE_NAME} | دایرکتوری مشاغل ایرانی`,
  description: 'دایرکتوری آنلاین مشاغل ایرانی در کانادا - رستوران، پزشک، وکیل، املاک و خدمات ایرانی',
  image: DEFAULT_IMAGE,
  url: SITE_URL,
  type: 'website',
  noindex: true,
  jsonLd: {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: SITE_URL,
    description: 'دایرکتوری آنلاین مشاغل ایرانی در کانادا',
  },
};

function notFoundMeta(path: string) {
  return {
    title: `صفحه یافت نشد | ${SITE_NAME}`,
    description: 'صفحه مورد نظر پیدا نشد.',
    image: DEFAULT_IMAGE,
    url: `${SITE_URL}${path}`,
    type: 'website',
    noindex: true,
    statusCode: 404,
    bodyHtml: '<main><h1>صفحه یافت نشد</h1><p><a href="/">بازگشت به صفحه اصلی</a></p></main>',
  };
}

router.get('/home', async (_req: Request, res: Response) => {
  try {
    const listings = await prisma.listing.findMany({
      where: { isActive: true },
      select: {
        id: true,
        slug: true,
        title: true,
        description: true,
        address: true,
        city: true,
        country: true,
        phone: true,
        website: true,
        placeId: true,
        photos: true,
        businessHours: true,
        isActive: true,
        isClaimed: true,
        phoneVerified: true,
        source: true,
        updatedAt: true,
        category: { select: { nameFa: true, slug: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
    const canonicalListings = selectCanonicalListings(
      listings,
      isSeoEligibleBrowseSource
    );
    const recentListings = canonicalListings.slice(0, 12);
    const countryCounts = new Map<string, number>();
    const cityCategoryCounts = new Map<string, { count: number; label: string; href: string }>();
    for (const listing of canonicalListings) {
      countryCounts.set(listing.country, (countryCounts.get(listing.country) || 0) + 1);
      const countryCode = countryCodeFromFa(listing.country);
      const citySlug = citySlugFromFa(listing.city);
      if (countryCode && citySlug) {
        const key = `${countryCode}|${citySlug}|${listing.category.slug}`;
        const current = cityCategoryCounts.get(key);
        cityCategoryCounts.set(key, {
          count: (current?.count || 0) + 1,
          label: `${listing.category.nameFa} ایرانی در ${listing.city}`,
          href: `/browse/${countryCode}/${citySlug}/${listing.category.slug}`,
        });
      }
    }
    const countryLinks = [...countryCounts.entries()]
      .filter(([, count]) => count >= MIN_INDEXABLE_BROWSE_LISTINGS)
      .map(([country, count]) => {
        const code = countryCodeFromFa(country);
        return code ? { label: `${country} (${count})`, href: `/browse/${code}` } : null;
      })
      .filter((link): link is NavLink => link !== null)
      .sort((a, b) => Number(b.label.match(/\((\d+)\)/)?.[1] || 0) - Number(a.label.match(/\((\d+)\)/)?.[1] || 0))
      .slice(0, 10);
    const priorityBrowseLinks = [...cityCategoryCounts.values()]
      .filter(({ count }) => count >= MIN_INDEXABLE_BROWSE_LISTINGS)
      .sort((a, b) => b.count - a.count || a.href.localeCompare(b.href))
      .slice(0, 16)
      .map(({ count, label, href }) => ({ label: `${label} (${count})`, href }));

    const title = 'پرشین‌پیجز - راهنمای کسب‌وکارهای ایرانی در سراسر جهان';
    const description = 'راهنمای جامع کسب‌وکارهای ایرانی در سراسر جهان. رستوران، پزشک، وکیل، سوپرمارکت و خدمات ایرانی را پیدا کنید.';
    const content = buildBrowsePageContent({
      countryName: 'سراسر جهان',
      totalCount: canonicalListings.length,
    });
    const bodyHtml = renderBrowseBody({
      h1: 'راهنمای کسب‌وکارهای ایرانی در سراسر جهان',
      content,
      listings: recentListings,
      totalCount: canonicalListings.length,
      navSections: [
        { heading: 'کشورهای پربازدید', links: countryLinks },
        { heading: 'راهنماهای محبوب شهر و تخصص', links: priorityBrowseLinks },
      ],
    });

    res.json({
      title,
      description,
      image: DEFAULT_IMAGE,
      url: `${SITE_URL}/`,
      type: 'website',
      bodyHtml,
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: SITE_NAME,
        url: SITE_URL,
        description,
      },
    });
  } catch (error) {
    console.error('Homepage meta error:', error);
    res.status(503).json(FALLBACK_META);
  }
});

// Browse: country page meta
router.get('/browse/:countryCode', async (req: Request, res: Response) => {
  try {
    const country = COUNTRY_NAMES[req.params.countryCode];
    if (!country) {
      return res.status(404).json(notFoundMeta(`/browse/${req.params.countryCode}`));
    }

    const allIndexableListings = await getAllIndexableBrowseListings();
    const indexableListings = allIndexableListings.filter((listing) => listing.country === country.name);
    const categoryNames = new Map(indexableListings.map((listing) => [listing.category.slug, listing.category.nameFa]));
    const categoryLinks: NavLink[] = indexableFacetEntries(
      countIndexableFacets(indexableListings, (listing) => listing.category.slug)
    ).map(([slug, count]) => ({
      label: `${categoryNames.get(slug) || slug} (${count})`,
      href: `/browse/${req.params.countryCode}/category/${slug}`,
    }));
    const cityLinks: NavLink[] = indexableFacetEntries(
      countIndexableFacets(indexableListings, (listing) => citySlugFromFa(listing.city))
    ).map(([slug, count]) => ({
      label: `${resolveCity(slug)?.nameFa || slug} (${count})`,
      href: `/browse/${req.params.countryCode}/${slug}`,
    }));

    const indexableListingCount = indexableListings.length;
    const url = `${SITE_URL}/browse/${req.params.countryCode}`;
    const title = `کسب‌وکارهای ایرانی در ${country.name} | ${SITE_NAME}`;
    const content = buildBrowsePageContent({
      countryName: country.name,
      totalCount: indexableListingCount,
    });
    const description = content.metaDescription;
    const breadcrumbs: BreadcrumbItem[] = [
      { label: SITE_NAME, href: '/' },
      { label: country.name },
    ];
    const bodyHtml = renderBrowseBody({
      h1: `کسب‌وکارهای ایرانی در ${country.name}`,
      content,
      listings: indexableListings.slice(0, BROWSE_PAGE_SIZE),
      totalCount: indexableListingCount,
      breadcrumbs,
      navSections: [
        ...(categoryLinks.length > 0 ? [{ heading: `دسته‌بندی‌ها در ${country.name}`, links: categoryLinks }] : []),
        ...(cityLinks.length > 0 ? [{ heading: `شهرهای ${country.name}`, links: cityLinks }] : []),
      ],
    });

    return res.json({
      title,
      description,
      image: DEFAULT_IMAGE,
      url,
      type: 'CollectionPage',
      noindex: indexableListingCount < MIN_INDEXABLE_BROWSE_LISTINGS,
      bodyHtml,
      jsonLd: [
        {
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          name: title,
          description,
          url,
          isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: SITE_URL },
        },
        breadcrumbJsonLd(breadcrumbs.map((b, i) => ({ ...b, href: i === breadcrumbs.length - 1 ? url : b.href }))),
      ],
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
    if (!country) {
      return res.status(404).json(notFoundMeta(`/browse/${req.params.countryCode}/category/${req.params.categorySlug}`));
    }

    const category = await prisma.category.findUnique({ where: { slug: req.params.categorySlug } });
    if (!category) {
      return res.status(404).json(notFoundMeta(`/browse/${req.params.countryCode}/category/${req.params.categorySlug}`));
    }

    const allIndexableListings = await getAllIndexableBrowseListings();
    const countryListings = allIndexableListings.filter((listing) => listing.country === country.name);
    const indexableListings = countryListings.filter((listing) => listing.category.slug === category.slug);
    const cityLinks: NavLink[] = indexableFacetEntries(
      countIndexableFacets(indexableListings, (listing) => citySlugFromFa(listing.city))
    ).map(([slug, count]) => ({
      label: `${category.nameFa} در ${resolveCity(slug)?.nameFa || slug} (${count})`,
      href: `/browse/${req.params.countryCode}/${slug}/${req.params.categorySlug}`,
    }));
    const categoryNames = new Map(countryListings.map((listing) => [listing.category.slug, listing.category.nameFa]));
    const otherCategoryLinks: NavLink[] = indexableFacetEntries(
      countIndexableFacets(countryListings, (listing) => listing.category.slug)
    )
      .filter(([slug]) => slug !== category.slug)
      .slice(0, 9)
      .map(([slug]) => ({
        label: `${categoryNames.get(slug) || slug} ایرانی در ${country.name}`,
        href: `/browse/${req.params.countryCode}/category/${slug}`,
      }));

    const indexableListingCount = indexableListings.length;
    const url = `${SITE_URL}/browse/${req.params.countryCode}/category/${req.params.categorySlug}`;
    const title = `${category.nameFa} ایرانی در ${country.name} | ${SITE_NAME}`;
    const content = buildBrowsePageContent({
      countryName: country.name,
      categorySlug: category.slug,
      categoryName: category.nameFa,
      totalCount: indexableListingCount,
    });
    const description = content.metaDescription;
    const breadcrumbs: BreadcrumbItem[] = [
      { label: SITE_NAME, href: '/' },
      { label: country.name, href: `/browse/${req.params.countryCode}` },
      { label: category.nameFa },
    ];
    const bodyHtml = renderBrowseBody({
      h1: `${category.nameFa} ایرانی در ${country.name}`,
      content,
      listings: indexableListings.slice(0, BROWSE_PAGE_SIZE),
      totalCount: indexableListingCount,
      breadcrumbs,
      navSections: [
        ...(cityLinks.length > 0 ? [{ heading: `${category.nameFa} در شهرهای ${country.name}`, links: cityLinks }] : []),
        ...(otherCategoryLinks.length > 0 ? [{ heading: `سایر دسته‌بندی‌ها در ${country.name}`, links: otherCategoryLinks }] : []),
      ],
    });

    return res.json({
      title,
      description,
      image: DEFAULT_IMAGE,
      url,
      type: 'CollectionPage',
      noindex: indexableListingCount < MIN_INDEXABLE_BROWSE_LISTINGS,
      bodyHtml,
      jsonLd: [
        {
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          name: title,
          description,
          url,
          numberOfItems: indexableListingCount,
          isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: SITE_URL },
        },
        breadcrumbJsonLd(breadcrumbs.map((b, i) => ({ ...b, href: i === breadcrumbs.length - 1 ? url : b.href }))),
      ],
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
    if (!country) {
      return res.status(404).json(notFoundMeta(req.path.replace('/api/meta', '')));
    }

    const category = await prisma.category.findUnique({ where: { slug: req.params.categorySlug } });
    if (!category) {
      return res.status(404).json(notFoundMeta(req.path.replace('/api/meta', '')));
    }

    const city = resolveCity(req.params.citySlug);
    if (!city) {
      return res.status(404).json(notFoundMeta(req.path.replace('/api/meta', '')));
    }

    const allIndexableListings = await getAllIndexableBrowseListings();
    const cityListings = allIndexableListings.filter(
      (listing) => listing.country === country.name && listingMatchesCity(listing, city.nameFa)
    );
    const indexableListings = cityListings.filter((listing) => listing.category.slug === category.slug);
    const categoryNames = new Map(cityListings.map((listing) => [listing.category.slug, listing.category.nameFa]));
    const otherCategoryLinks: NavLink[] = indexableFacetEntries(
      countIndexableFacets(cityListings, (listing) => listing.category.slug)
    )
      .filter(([slug]) => slug !== category.slug)
      .slice(0, 9)
      .map(([slug]) => ({
        label: `${categoryNames.get(slug) || slug} در ${city.nameFa}`,
        href: `/browse/${req.params.countryCode}/${req.params.citySlug}/${slug}`,
      }));

    const indexableListingCount = indexableListings.length;
    const url = `${SITE_URL}/browse/${req.params.countryCode}/${req.params.citySlug}/${req.params.categorySlug}`;
    const title = `${category.nameFa} ایرانی در ${city.nameFa}, ${country.name} | ${SITE_NAME}`;
    const content = buildBrowsePageContent({
      countryName: country.name,
      cityName: city.nameFa,
      categorySlug: category.slug,
      categoryName: category.nameFa,
      totalCount: indexableListingCount,
    });
    const description = content.metaDescription;
    const breadcrumbs: BreadcrumbItem[] = [
      { label: SITE_NAME, href: '/' },
      { label: country.name, href: `/browse/${req.params.countryCode}` },
      { label: city.nameFa, href: `/browse/${req.params.countryCode}/${req.params.citySlug}` },
      { label: category.nameFa },
    ];
    const bodyHtml = renderBrowseBody({
      h1: `${category.nameFa} ایرانی در ${city.nameFa}`,
      content,
      listings: indexableListings.slice(0, BROWSE_PAGE_SIZE),
      totalCount: indexableListingCount,
      breadcrumbs,
      navSections: [
        { heading: `سایر کسب‌وکارهای ایرانی در ${city.nameFa}`, links: [
          { label: `همه کسب‌وکارهای ایرانی در ${city.nameFa}`, href: `/browse/${req.params.countryCode}/${req.params.citySlug}` },
          { label: `همه ${category.nameFa} ایرانی در ${country.name}`, href: `/browse/${req.params.countryCode}/category/${req.params.categorySlug}` },
        ]},
        ...(otherCategoryLinks.length > 0 ? [{ heading: `سایر دسته‌بندی‌ها در ${city.nameFa}`, links: otherCategoryLinks }] : []),
      ],
    });

    return res.json({
      title,
      description,
      image: DEFAULT_IMAGE,
      url,
      type: 'CollectionPage',
      noindex: indexableListingCount < MIN_INDEXABLE_BROWSE_LISTINGS,
      bodyHtml,
      jsonLd: [
        {
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          name: title,
          description,
          url,
          numberOfItems: indexableListingCount,
          isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: SITE_URL },
        },
        breadcrumbJsonLd(breadcrumbs.map((b, i) => ({ ...b, href: i === breadcrumbs.length - 1 ? url : b.href }))),
      ],
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
    if (!country) {
      return res.status(404).json(notFoundMeta(req.path.replace('/api/meta', '')));
    }

    const city = resolveCity(req.params.citySlug);
    if (!city) {
      return res.status(404).json(notFoundMeta(req.path.replace('/api/meta', '')));
    }

    const allIndexableListings = await getAllIndexableBrowseListings();
    const indexableListings = allIndexableListings.filter(
      (listing) => listing.country === country.name && listingMatchesCity(listing, city.nameFa)
    );
    const categoryNames = new Map(indexableListings.map((listing) => [listing.category.slug, listing.category.nameFa]));
    const categoryLinks: NavLink[] = indexableFacetEntries(
      countIndexableFacets(indexableListings, (listing) => listing.category.slug)
    ).map(([slug, count]) => ({
      label: `${categoryNames.get(slug) || slug} در ${city.nameFa} (${count})`,
      href: `/browse/${req.params.countryCode}/${req.params.citySlug}/${slug}`,
    }));

    const indexableListingCount = indexableListings.length;
    const url = `${SITE_URL}/browse/${req.params.countryCode}/${req.params.citySlug}`;
    const title = `کسب‌وکارهای ایرانی در ${city.nameFa}, ${country.name} | ${SITE_NAME}`;
    const content = buildBrowsePageContent({
      countryName: country.name,
      cityName: city.nameFa,
      totalCount: indexableListingCount,
    });
    const description = content.metaDescription;
    const breadcrumbs: BreadcrumbItem[] = [
      { label: SITE_NAME, href: '/' },
      { label: country.name, href: `/browse/${req.params.countryCode}` },
      { label: city.nameFa },
    ];
    const bodyHtml = renderBrowseBody({
      h1: `کسب‌وکارهای ایرانی در ${city.nameFa}`,
      content,
      listings: indexableListings.slice(0, BROWSE_PAGE_SIZE),
      totalCount: indexableListingCount,
      breadcrumbs,
      navSections: [
        ...(categoryLinks.length > 0 ? [{ heading: `دسته‌بندی‌ها در ${city.nameFa}`, links: categoryLinks }] : []),
        { heading: `کاوش بیشتر`, links: [
          { label: `همه کسب‌وکارهای ایرانی در ${country.name}`, href: `/browse/${req.params.countryCode}` },
        ]},
      ],
    });

    return res.json({
      title,
      description,
      image: DEFAULT_IMAGE,
      url,
      type: 'CollectionPage',
      noindex: indexableListingCount < MIN_INDEXABLE_BROWSE_LISTINGS,
      bodyHtml,
      jsonLd: [
        {
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          name: title,
          description,
          url,
          isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: SITE_URL },
        },
        breadcrumbJsonLd(breadcrumbs.map((b, i) => ({ ...b, href: i === breadcrumbs.length - 1 ? url : b.href }))),
      ],
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
        return res.status(404).json(notFoundMeta(`/listing/${id}`));
      }

      if (!listing.isActive) {
        return res.status(404).json(notFoundMeta(`/listing/${id}`));
      }

      const duplicateCandidates = await prisma.listing.findMany({
        where: {
          isActive: true,
          OR: [
            ...(listing.placeId ? [{ placeId: listing.placeId }] : []),
            { address: listing.address, city: listing.city, country: listing.country },
          ],
        },
        include: { category: true },
      });
      const canonicalListing = findCanonicalListing(listing, duplicateCandidates);
      const isIndexable = isSeoEligibleListing(listing)
        && canonicalListing?.id === listing.id;
      const canonicalTarget = canonicalListing || listing;
      const url = `${SITE_URL}/listing/${canonicalTarget.slug || canonicalTarget.id}`;
      const image = listing.photos.length > 0 ? listing.photos[0] : DEFAULT_IMAGE;
      const description = listing.description
        ? listing.description.substring(0, 160)
        : `${listing.title} - ${listing.category.nameFa} در ${listing.city}`;

      const countryCode = countryCodeFromFa(listing.country);
      const citySlug = citySlugFromFa(listing.city);
      const breadcrumbs: BreadcrumbItem[] = [
        { label: SITE_NAME, href: '/' },
        ...(countryCode ? [{ label: listing.country, href: `/browse/${countryCode}` }] : []),
        ...(countryCode && citySlug ? [{ label: listing.city, href: `/browse/${countryCode}/${citySlug}` }] : []),
        { label: listing.title },
      ];

      const exploreLinks: NavLink[] = [];
      if (countryCode && citySlug) {
        exploreLinks.push({
          label: `همه ${listing.category.nameFa} ایرانی در ${listing.city}`,
          href: `/browse/${countryCode}/${citySlug}/${listing.category.slug}`,
        });
        exploreLinks.push({
          label: `همه کسب‌وکارهای ایرانی در ${listing.city}`,
          href: `/browse/${countryCode}/${citySlug}`,
        });
      }
      if (countryCode) {
        exploreLinks.push({
          label: `همه ${listing.category.nameFa} ایرانی در ${listing.country}`,
          href: `/browse/${countryCode}/category/${listing.category.slug}`,
        });
        exploreLinks.push({
          label: `همه کسب‌وکارهای ایرانی در ${listing.country}`,
          href: `/browse/${countryCode}`,
        });
      }

      const bodyHtml = renderListingBody({
        listing,
        breadcrumbs,
        exploreLinks,
      });

      return res.json({
        title: `${listing.title} | ${SITE_NAME}`,
        description,
        image,
        url,
        type: 'LocalBusiness',
        noindex: !isIndexable,
        bodyHtml,
        jsonLd: [
          localBusinessJsonLd(listing),
          breadcrumbJsonLd(breadcrumbs.map((b, i) => ({ ...b, href: i === breadcrumbs.length - 1 ? url : b.href }))),
        ],
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
