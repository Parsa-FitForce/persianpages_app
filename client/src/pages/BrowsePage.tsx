import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { categoriesApi, listingsApi } from '../services/api';
import type { Category, Listing } from '../types';
import { getCountryByCode, getCitiesByCountry, getCityBySlug, toSlug } from '../i18n/locations';
import ListingCard from '../components/ListingCard';
import { getCollectionPageSchema } from '../utils/structuredData';

export default function BrowsePage() {
  const { countryCode = '', citySlug, categorySlug } = useParams<{
    countryCode: string;
    citySlug: string;
    categorySlug: string;
  }>();

  const [listings, setListings] = useState<Listing[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);

  const country = getCountryByCode(countryCode);
  const city = citySlug ? getCityBySlug(countryCode, citySlug) : undefined;
  const countryCities = getCitiesByCountry(countryCode);

  // Determine if :citySlug is actually "category" (for /browse/:country/category/:cat)
  const isCategoryRoute = citySlug === 'category';
  const resolvedCity = isCategoryRoute ? undefined : city;
  const resolvedCategorySlug = isCategoryRoute ? categorySlug : categorySlug;

  useEffect(() => {
    categoriesApi.getAll().then((res) => setCategories(res.data));
  }, []);

  const selectedCategory = categories.find(c => c.slug === resolvedCategorySlug);

  useEffect(() => {
    setLoading(true);
    listingsApi
      .getAll({
        category: resolvedCategorySlug,
        city: resolvedCity?.name,
        country: country?.name,
        page,
      })
      .then((res) => {
        setListings(res.data.listings);
        setTotal(res.data.pagination.total);
        setPages(res.data.pagination.pages);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [resolvedCategorySlug, resolvedCity?.name, country?.name, page]);

  // Build SEO meta
  const SITE_URL = 'https://persianpages.com';
  const titleParts: string[] = [];
  const descParts: string[] = ['کسب‌وکارهای ایرانی'];

  if (selectedCategory) {
    titleParts.push(selectedCategory.nameFa);
    descParts.push(`در دسته ${selectedCategory.nameFa}`);
  }
  if (resolvedCity) {
    titleParts.push(resolvedCity.name);
    descParts.push(`در ${resolvedCity.name}`);
  }
  if (country) {
    titleParts.push(country.name);
    if (!resolvedCity) descParts.push(`در ${country.name}`);
  }

  const pageTitle = titleParts.length > 0
    ? `${titleParts.join(' - ')} | پرشین‌پیجز`
    : 'پرشین‌پیجز';
  const pageDescription = descParts.join(' ') + ' را پیدا کنید.';

  let canonicalPath = `/browse/${countryCode}`;
  if (resolvedCity) {
    canonicalPath += `/${citySlug}`;
    if (resolvedCategorySlug) canonicalPath += `/${resolvedCategorySlug}`;
  } else if (resolvedCategorySlug) {
    canonicalPath += `/category/${resolvedCategorySlug}`;
  }
  const canonicalUrl = `${SITE_URL}${canonicalPath}`;

  const heading = resolvedCity
    ? `${resolvedCity.name}${selectedCategory ? ` - ${selectedCategory.nameFa}` : ''}`
    : selectedCategory
      ? `${selectedCategory.nameFa} در ${country?.name || ''}`
      : country?.name || '';

  return (
    <div className="min-h-screen">
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="PersianPages" />
        <script type="application/ld+json">
          {JSON.stringify(getCollectionPageSchema({
            name: pageTitle,
            description: pageDescription,
            url: canonicalUrl,
          }))}
        </script>
      </Helmet>

      {/* Header */}
      <div className="bg-gradient-to-l from-primary-600 to-primary-700 text-white py-4 md:py-8">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-4">
            {country && <span className="text-2xl md:text-3xl">{country.flag}</span>}
            <h1 className="text-lg md:text-2xl font-bold">{heading}</h1>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-4 md:py-6">
        {/* Category Pills */}
        <div className="mb-4 md:mb-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2 md:mb-3">دسته‌بندی</h3>
          <div className="flex md:flex-wrap gap-2 overflow-x-auto pb-1 md:pb-0 -mx-4 px-4 md:mx-0 md:px-0 scrollbar-hide">
            <Link
              to={resolvedCity ? `/browse/${countryCode}/${citySlug}` : `/browse/${countryCode}`}
              className={`px-3 md:px-4 py-1.5 md:py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap shrink-0 ${
                !resolvedCategorySlug
                  ? 'bg-primary-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              همه
            </Link>
            {categories.map((cat) => {
              const catUrl = resolvedCity
                ? `/browse/${countryCode}/${citySlug}/${cat.slug}`
                : `/browse/${countryCode}/category/${cat.slug}`;
              return (
                <Link
                  key={cat.id}
                  to={catUrl}
                  className={`px-3 md:px-4 py-1.5 md:py-2 rounded-full text-sm font-medium transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                    resolvedCategorySlug === cat.slug
                      ? 'bg-primary-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.nameFa}</span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* City Pills */}
        {countryCities.length > 0 && !isCategoryRoute && (
          <div className="mb-4 md:mb-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2 md:mb-3">شهر</h3>
            <div className="flex md:flex-wrap gap-2 overflow-x-auto pb-1 md:pb-0 -mx-4 px-4 md:mx-0 md:px-0 scrollbar-hide">
              <Link
                to={resolvedCategorySlug ? `/browse/${countryCode}/category/${resolvedCategorySlug}` : `/browse/${countryCode}`}
                className={`px-3 md:px-4 py-1.5 md:py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap shrink-0 ${
                  !resolvedCity
                    ? 'bg-primary-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                همه شهرها
              </Link>
              {countryCities.map((c) => {
                const slug = toSlug(c.nameEn);
                const cityUrl = resolvedCategorySlug
                  ? `/browse/${countryCode}/${slug}/${resolvedCategorySlug}`
                  : `/browse/${countryCode}/${slug}`;
                return (
                  <Link
                    key={c.nameEn}
                    to={cityUrl}
                    className={`px-3 md:px-4 py-1.5 md:py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap shrink-0 ${
                      citySlug === slug
                        ? 'bg-primary-600 text-white shadow-md'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {c.name}
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Results Count */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-gray-600">
            <span className="font-semibold text-gray-900">{total.toLocaleString('fa-IR')}</span> کسب‌وکار یافت شد
          </p>
        </div>

        {/* Results */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
          </div>
        ) : listings.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">نتیجه‌ای یافت نشد</h3>
            <p className="text-gray-500">فیلترهای جستجو را تغییر دهید</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6 mb-8">
              {listings.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>

            {/* Pagination */}
            {pages > 1 && (
              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-40 disabled:hover:bg-gray-100 transition-colors"
                >
                  قبلی
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, pages) }, (_, i) => {
                    let pageNum;
                    if (pages <= 5) {
                      pageNum = i + 1;
                    } else if (page <= 3) {
                      pageNum = i + 1;
                    } else if (page >= pages - 2) {
                      pageNum = pages - 4 + i;
                    } else {
                      pageNum = page - 2 + i;
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setPage(pageNum)}
                        className={`w-10 h-10 rounded-lg font-medium transition-colors ${
                          page === pageNum
                            ? 'bg-primary-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {pageNum.toLocaleString('fa-IR')}
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={() => setPage((p) => Math.min(pages, p + 1))}
                  disabled={page === pages}
                  className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-40 disabled:hover:bg-gray-100 transition-colors"
                >
                  بعدی
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
