import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { categoriesApi, listingsApi } from '../services/api';
import type { Category, Listing } from '../types';
import { getCountryByCode, getCitiesByCountry, toSlug } from '../i18n/locations';
import CategoryCard from '../components/CategoryCard';
import ListingCard from '../components/ListingCard';
import { getWebsiteSchema } from '../utils/structuredData';

// These country hubs currently satisfy the same minimum-quality threshold as
// the browse sitemap. Avoid promoting thin/noindexed browse routes from home.
const POPULAR_COUNTRY_CODES = ['us', 'ca', 'ae', 'gb', 'se', 'es', 'it'];

const PRIORITY_BROWSE_LINKS = [
  { href: '/browse/us/los-angeles/medical', label: 'پزشکان ایرانی در لس‌آنجلس' },
  { href: '/browse/ca/toronto/medical', label: 'پزشکان ایرانی در تورنتو' },
  { href: '/browse/ca/toronto/legal', label: 'وکلای ایرانی در تورنتو' },
  { href: '/browse/ca/vancouver/medical', label: 'پزشکان ایرانی در ونکوور' },
  { href: '/browse/ca/toronto/grocery', label: 'سوپرمارکت‌های ایرانی در تورنتو' },
  { href: '/browse/ae/dubai/medical', label: 'پزشکان ایرانی در دبی' },
  { href: '/browse/gb/london/restaurant', label: 'رستوران‌های ایرانی در لندن' },
  { href: '/browse/se/stockholm/restaurant', label: 'رستوران‌های ایرانی در استکهلم' },
  { href: '/browse/us/new-york/restaurant', label: 'رستوران‌های ایرانی در نیویورک' },
  { href: '/browse/us/new-york/legal', label: 'وکلای ایرانی در نیویورک' },
  { href: '/browse/us/seattle/medical', label: 'پزشکان ایرانی در سیاتل' },
  { href: '/browse/us/woodland-hills/restaurant', label: 'رستوران‌های ایرانی در وودلند هیلز' },
];

export default function Home() {
  const [search, setSearch] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const countryCode = searchParams.get('country') || localStorage.getItem('selectedCountry') || '';
  const selectedCountry = countryCode ? getCountryByCode(countryCode) : null;
  const countryCities = countryCode ? getCitiesByCountry(countryCode) : [];

  useEffect(() => {
    setLoading(true);

    // Get country name for filtering
    const countryFilter = selectedCountry?.name;

    Promise.all([
      categoriesApi.getAll(),
      listingsApi.getFeatured({ limit: 12, country: countryFilter }),
    ])
      .then(([catRes, listRes]) => {
        setCategories(catRes.data);
        setListings(listRes.data.listings);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [countryCode, selectedCountry?.name]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (search.trim()) {
      const params = new URLSearchParams();
      params.set('search', search);
      if (countryCode) params.set('country', countryCode);
      navigate(`/search?${params.toString()}`);
    }
  };

  const pageTitle = selectedCountry
    ? `کسب‌وکارهای ایرانی در ${selectedCountry.name} | پرشین‌پیجز`
    : 'پرشین‌پیجز - راهنمای کسب‌وکارهای ایرانی در سراسر جهان';
  const pageDescription = selectedCountry
    ? `راهنمای کسب‌وکارهای ایرانی در ${selectedCountry.name}. رستوران، پزشک، وکیل، سوپرمارکت و خدمات ایرانی را پیدا کنید.`
    : 'راهنمای جامع کسب‌وکارهای ایرانی در سراسر جهان. رستوران، پزشک، وکیل، سوپرمارکت و خدمات ایرانی را در شهر خود پیدا کنید.';

  return (
    <div className="min-h-screen">
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <link rel="canonical" href="https://persianpages.com/" />
        <script type="application/ld+json">
          {JSON.stringify(getWebsiteSchema())}
        </script>
      </Helmet>

      {/* Hero */}
      <section className="bg-gradient-to-bl from-primary-600 to-primary-800 text-white py-8 md:py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          {selectedCountry ? (
            <>
              <div className="text-4xl md:text-5xl mb-2 md:mb-4">{selectedCountry.flag}</div>
              <h1 className="text-2xl md:text-4xl font-bold mb-1 md:mb-3">
                کسب‌وکارهای ایرانی در {selectedCountry.name}
              </h1>
              <p className="text-sm md:text-lg text-primary-100">
                {countryCities.length.toLocaleString('fa-IR')} شهر
              </p>
            </>
          ) : (
            <>
              <h1 className="text-2xl md:text-5xl font-bold mb-2 md:mb-4">
                راهنمای کسب‌وکارهای ایرانی در سراسر جهان
              </h1>
              <p className="text-sm md:text-lg text-primary-100 mb-4 md:mb-8">
                به راحتی کسب‌وکارهای ایرانی را در شهر خود پیدا کنید
              </p>
            </>
          )}

          <form onSubmit={handleSearch} className="max-w-2xl mx-auto mt-4 md:mt-6">
            <div className="flex gap-2">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={selectedCountry ? `جستجو در ${selectedCountry.name}...` : 'جستجوی کسب‌وکار...'}
                className="input flex-1 text-gray-900"
              />
              <button type="submit" className="btn-primary bg-white text-primary-600 hover:bg-gray-100">
                جستجو
              </button>
            </div>
          </form>

          {/* Quick City Links */}
          {countryCities.length > 0 && (
            <div className="mt-3 md:mt-6 flex flex-wrap justify-center gap-1.5 md:gap-2">
              {countryCities.slice(0, 8).map((city) => (
                <Link
                  key={city.nameEn}
                  to={`/browse/${countryCode}/${toSlug(city.nameEn)}`}
                  className="px-2.5 py-0.5 md:px-3 md:py-1 bg-white/20 rounded-full text-xs md:text-sm hover:bg-white/30 transition-colors"
                >
                  {city.name}
                </Link>
              ))}
              {countryCities.length > 8 && (
                <Link
                  to={`/browse/${countryCode}`}
                  className="px-2.5 py-0.5 md:px-3 md:py-1 bg-white/20 rounded-full text-xs md:text-sm hover:bg-white/30 transition-colors"
                >
                  +{(countryCities.length - 8).toLocaleString('fa-IR')} شهر دیگر
                </Link>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Categories */}
      <section className="max-w-7xl mx-auto px-4 py-6 md:py-12">
        <h2 className="text-lg md:text-2xl font-bold mb-3 md:mb-6">دسته‌بندی‌ها</h2>
        {loading ? (
          <div className="text-center text-gray-500">در حال بارگذاری...</div>
        ) : (
          <div className="grid grid-cols-5 gap-2 md:gap-4">
            {categories.map((cat) => (
              <CategoryCard key={cat.id} category={cat} countryCode={countryCode} />
            ))}
          </div>
        )}
      </section>

      {!selectedCountry && (
        <section className="border-y border-gray-200 bg-white">
          <div className="max-w-7xl mx-auto px-4 py-6 md:py-10 space-y-8">
            <div className="flex items-end justify-between gap-4 mb-4">
              <div>
                <h2 className="text-lg md:text-2xl font-bold">کشورهای پربازدید</h2>
                <p className="text-sm text-gray-500 mt-1">راهنمای شهرها و کسب‌وکارهای ایرانی</p>
              </div>
              <Link to="/select-country" className="text-sm text-primary-700 hover:text-primary-800">
                همه کشورها
              </Link>
            </div>
            <nav aria-label="کشورهای پربازدید" className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
              {POPULAR_COUNTRY_CODES.map((code) => {
                const item = getCountryByCode(code);
                if (!item) return null;
                return (
                  <Link
                    key={code}
                    to={`/browse/${code}`}
                    className="flex items-center gap-2 px-3 py-3 border border-gray-200 rounded-lg text-sm font-medium text-gray-800 hover:border-primary-300 hover:text-primary-700 transition-colors"
                  >
                    <span aria-hidden="true">{item.flag}</span>
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>

            <div>
              <div className="mb-4">
                <h2 className="text-lg md:text-2xl font-bold">راهنماهای محبوب شهر و تخصص</h2>
                <p className="text-sm text-gray-500 mt-1">مسیرهای مستقیم به فهرست‌های کامل و به‌روز پرشین‌پیجز</p>
              </div>
              <nav aria-label="راهنماهای محبوب" className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {PRIORITY_BROWSE_LINKS.map((item) => (
                  <Link
                    key={item.href}
                    to={item.href}
                    className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 px-4 py-3 text-sm font-medium text-gray-800 hover:border-primary-300 hover:text-primary-700 transition-colors"
                  >
                    <span>{item.label}</span>
                    <span aria-hidden="true" className="text-primary-500">←</span>
                  </Link>
                ))}
              </nav>
            </div>
          </div>
        </section>
      )}

      {/* Featured indexable listings */}
      <section className="max-w-7xl mx-auto px-4 pb-8 md:pb-16">
        <div className="flex justify-between items-center mb-4 md:mb-6">
          <h2 className="text-lg md:text-2xl font-bold">
            {selectedCountry ? `کسب‌وکارهای منتخب ${selectedCountry.name}` : 'کسب‌وکارهای منتخب'}
          </h2>
          <button
            onClick={() => navigate(countryCode ? `/search?country=${countryCode}` : '/search')}
            className="text-primary-600 hover:text-primary-700"
          >
            مشاهده همه ←
          </button>
        </div>
        {loading ? (
          <div className="text-center text-gray-500">در حال بارگذاری...</div>
        ) : listings.length === 0 ? (
          <div className="text-center text-gray-500 py-12">
            {selectedCountry
              ? `هنوز کسب‌وکاری در ${selectedCountry.name} ثبت نشده است`
              : 'هنوز کسب‌وکاری ثبت نشده است'
            }
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
            {listings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
