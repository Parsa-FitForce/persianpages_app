import {
  isSeoEligibleListing,
  MIN_INDEXABLE_BROWSE_LISTINGS,
  selectCanonicalListings,
} from '../src/utils/seo.js';
import {
  buildBrowsePageContent,
  EDITORIAL_BROWSE_PAGE_KEYS,
} from '../src/utils/browseContent.js';

type TestListing = Parameters<typeof isSeoEligibleListing>[0];

function listing(overrides: Partial<TestListing> = {}): TestListing {
  return {
    id: 'base',
    slug: 'base-listing',
    title: 'کسب‌وکار نمونه',
    description: 'این یک توضیح کامل و اختصاصی برای یک کسب‌وکار ایرانی است که اطلاعات کافی درباره خدمات، موقعیت، راه‌های ارتباطی، تجربه مشتریان، دسته‌بندی، ویژگی‌های مهم و جزئیات قابل اعتماد ارائه می‌کند. این متن عمداً بلندتر از حداقل لازم نوشته شده تا صفحه به‌عنوان یک صفحه مستقل و مفید برای کاربران و موتورهای جستجو قابل ارزیابی باشد.',
    address: '123 Main St',
    city: 'لس‌آنجلس',
    country: 'آمریکا',
    phone: '+13105550100',
    website: 'https://example.com',
    placeId: 'place-base',
    photos: ['https://example.com/photo.jpg'],
    businessHours: { monday: '09:00 - 17:00' },
    isActive: true,
    isClaimed: false,
    phoneVerified: false,
    source: 'scraped',
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  };
}

function assert(condition: unknown, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

assert(MIN_INDEXABLE_BROWSE_LISTINGS >= 10, 'Browse pages must require at least 10 strong canonical listings.');
assert(isSeoEligibleListing(listing()), 'A rich listing with phone, website, description, and rich signals should be indexable.');
assert(!isSeoEligibleListing(listing({ description: 'too short' })), 'Thin listing descriptions must not be indexable.');
assert(!isSeoEligibleListing(listing({ website: null })), 'Listings without a website must not be indexable.');
assert(!isSeoEligibleListing(listing({ phone: null })), 'Listings without a phone must not be indexable.');
assert(!isSeoEligibleListing(listing({ photos: [], businessHours: null, isClaimed: false, phoneVerified: false })), 'Listings without any rich signal must not be indexable.');
assert(!isSeoEligibleListing(listing({ isActive: false })), 'Inactive listings must not be indexable.');

const weakerDuplicate = listing({
  id: 'weaker',
  slug: 'weaker-duplicate',
  photos: ['https://example.com/one.jpg'],
  updatedAt: new Date('2026-01-01T00:00:00Z'),
});
const strongerDuplicate = listing({
  id: 'stronger',
  slug: 'stronger-duplicate',
  photos: [
    'https://example.com/one.jpg',
    'https://example.com/two.jpg',
    'https://example.com/three.jpg',
  ],
  updatedAt: new Date('2026-01-02T00:00:00Z'),
});
const canonical = selectCanonicalListings([weakerDuplicate, strongerDuplicate]);

assert(canonical.length === 1, 'Duplicate listings should collapse to one canonical listing.');
assert(canonical[0]?.id === 'stronger', 'The richer duplicate should win canonical selection.');

const restaurantBrowseContent = buildBrowsePageContent({
  countryName: 'آمریکا',
  cityName: 'لس‌آنجلس',
  categorySlug: 'restaurant',
  categoryName: 'رستوران',
  totalCount: 24,
});
const medicalBrowseContent = buildBrowsePageContent({
  countryName: 'کانادا',
  cityName: 'تورنتو',
  categorySlug: 'medical',
  categoryName: 'پزشکی',
  totalCount: 18,
});

assert(restaurantBrowseContent.intro.includes('۲۴'), 'Browse content should include the real localized result count.');
assert(restaurantBrowseContent.overviewHeading.includes('لس‌آنجلس'), 'Browse content should identify the selected city.');
assert(restaurantBrowseContent.checklist.length >= 3, 'Browse content should include actionable selection guidance.');
assert(
  restaurantBrowseContent.paragraphs.join(' ') !== medicalBrowseContent.paragraphs.join(' '),
  'Different browse categories should receive category-specific content.'
);
assert(
  !Object.values(restaurantBrowseContent).flat().join(' ').includes('undefined'),
  'Browse content must never expose missing template values.'
);
assert(EDITORIAL_BROWSE_PAGE_KEYS.length === 28, 'Every currently indexable city/category page should have an editorial intro.');
const categoryNames: Record<string, string> = {
  medical: 'پزشکی',
  legal: 'حقوقی',
  restaurant: 'رستوران',
  grocery: 'سوپرمارکت',
  financial: 'مالی',
};
const editorialIntros = EDITORIAL_BROWSE_PAGE_KEYS.map((key) => {
  const [countryName, cityName, categorySlug] = key.split('|');
  const content = buildBrowsePageContent({
    countryName,
    cityName,
    categorySlug,
    categoryName: categoryNames[categorySlug] || categorySlug,
    totalCount: 10,
  });
  assert(content.intro.includes('۱۰'), `Editorial intro ${key} should retain the live localized count.`);
  assert(content.intro.length >= 180, `Editorial intro ${key} should contain substantive local guidance.`);
  assert(!content.intro.startsWith('در این صفحه'), `Editorial intro ${key} should not use the generic fallback.`);
  return content.intro;
});
assert(
  new Set(editorialIntros).size === EDITORIAL_BROWSE_PAGE_KEYS.length,
  'Editorial city/category intros should be unique.'
);
assert(
  medicalBrowseContent.intro.includes('انتاریو'),
  'Priority city/category pages should use hand-written local editorial copy.'
);
const genericBrowseContent = buildBrowsePageContent({
  countryName: 'ژاپن',
  cityName: 'اوساکا',
  categorySlug: 'financial',
  categoryName: 'مالی',
  totalCount: 3,
});
assert(
  genericBrowseContent.intro.startsWith('در این صفحه'),
  'Non-priority pages should retain the safe generated fallback.'
);

console.log('SEO policy check passed.');
