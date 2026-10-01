import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { categoriesApi, listingsApi } from '../services/api';
import type { BrowsePageContent, Category, Listing } from '../types';
import { getCountryByCode, getCitiesByCountry, getCityBySlug, toSlug } from '../i18n/locations';
import ListingCard from '../components/ListingCard';
import { getCollectionPageSchema, getItemListSchema } from '../utils/structuredData';

const MIN_INDEXABLE_BROWSE_LISTINGS = 25;
const CATEGORY_ENGLISH_LABELS: Record<string, string> = {
  restaurant: 'restaurants',
  grocery: 'grocery stores',
  medical: 'healthcare providers',
  legal: 'legal services',
  'real-estate': 'real estate professionals',
  automotive: 'automotive services',
  beauty: 'beauty services',
  financial: 'financial services',
  education: 'education services',
  services: 'local services',
};

function englishCountryName(name: string): string {
  return ['United States', 'United Kingdom', 'UAE'].includes(name) ? `the ${name}` : name;
}

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
  const [browseContent, setBrowseContent] = useState<BrowsePageContent | null>(null);
  const [categoryFacets, setCategoryFacets] = useState<{ slug: string; count: number }[]>([]);
  const [cityFacets, setCityFacets] = useState<{ name: string; count: number }[]>([]);

  const country = getCountryByCode(countryCode);
  const city = citySlug ? getCityBySlug(countryCode, citySlug) : undefined;
  const countryCities = getCitiesByCountry(countryCode);

  // Determine if :citySlug is actually "category" (for /browse/:country/category/:cat)
  const isCategoryRoute = citySlug === 'category';
  const resolvedCity = isCategoryRoute ? undefined : city;
  const resolvedCategorySlug = isCategoryRoute ? categorySlug : categorySlug;
  const invalidLocation = !country || Boolean(citySlug && !isCategoryRoute && !city);

  useEffect(() => {
    categoriesApi.getAll().then((res) => setCategories(res.data));
  }, []);

  useEffect(() => {
    setPage(1);
  }, [countryCode, citySlug, categorySlug]);

  const selectedCategory = categories.find(c => c.slug === resolvedCategorySlug);
  const invalidCategory = Boolean(
    resolvedCategorySlug
      && categories.length > 0
      && !selectedCategory
  );

  useEffect(() => {
    let cancelled = false;
    if (invalidLocation) {
      setListings([]);
      setTotal(0);
      setPages(1);
      setBrowseContent(null);
      setCategoryFacets([]);
      setCityFacets([]);
      setLoading(false);
      return () => { cancelled = true; };
    }

    setLoading(true);
    listingsApi
      .getBrowse({
        category: resolvedCategorySlug,
        city: resolvedCity?.name,
        country: country?.name || '',
        page,
      })
      .then((res) => {
        if (cancelled) return;
        setListings(res.data.listings);
        setTotal(res.data.pagination.total);
        setPages(res.data.pagination.pages);
        setBrowseContent(res.data.content);
        setCategoryFacets(res.data.facets.categories);
        setCityFacets(res.data.facets.cities);
      })
      .catch((error) => {
        if (!cancelled) console.error(error);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [resolvedCategorySlug, resolvedCity?.name, country?.name, page, invalidLocation]);

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
  const pageDescription = browseContent?.metaDescription || (descParts.join(' ') + ' را پیدا کنید.');

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
  const englishCategory = selectedCategory
    ? CATEGORY_ENGLISH_LABELS[selectedCategory.slug] || selectedCategory.name.toLowerCase()
    : '';
  const englishHeading = resolvedCity
    ? selectedCategory
      ? `Iranian ${englishCategory} in ${resolvedCity.nameEn}`
      : `Iranian businesses in ${resolvedCity.nameEn}`
    : selectedCategory
      ? `Iranian ${englishCategory} in ${country ? englishCountryName(country.nameEn) : ''}`
      : `Iranian businesses in ${country ? englishCountryName(country.nameEn) : ''}`;
  const visibleCategorySlugs = new Set(categoryFacets.map((facet) => facet.slug));
  const visibleCategories = categories.filter(
    (category) => visibleCategorySlugs.has(category.slug) || category.slug === resolvedCategorySlug
  );
  const categoryCountBySlug = new Map(categoryFacets.map((facet) => [facet.slug, facet.count]));
  const visibleCityNames = new Set(cityFacets.map((facet) => facet.name));
  const visibleCities = countryCities.filter(
    (candidate) => visibleCityNames.has(candidate.name) || candidate.name === resolvedCity?.name
  );
  const cityCountByName = new Map(cityFacets.map((facet) => [facet.name, facet.count]));

  if (invalidLocation || invalidCategory) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <Helmet>
          <title>صفحه یافت نشد | پرشین‌پیجز</title>
          <meta name="robots" content="noindex, follow" />
        </Helmet>
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">صفحه یافت نشد</h1>
          <Link to="/" className="text-primary-700 hover:underline">
            بازگشت به صفحه اصلی
          </Link>
        </div>
      </div>
    );
  }

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
        {!loading && total < MIN_INDEXABLE_BROWSE_LISTINGS ? (
          <meta name="robots" content="noindex, follow" />
        ) : null}
        <script type="application/ld+json">
          {JSON.stringify(getCollectionPageSchema({
            name: pageTitle,
            alternateName: englishHeading,
            description: pageDescription,
            url: canonicalUrl,
          }))}
        </script>
        {!loading && listings.length > 0 ? (
          <script type="application/ld+json">
            {JSON.stringify(getItemListSchema(canonicalUrl, listings))}
          </script>
        ) : null}
      </Helmet>

      <section className="atlas-grid bg-ink text-white">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 md:py-14 lg:px-8">
          <nav className="mb-6 flex flex-wrap items-center gap-2 text-xs text-slate-300" aria-label="مسیر صفحه">
            <Link to="/" className="hover:text-white">پرشین‌پیجز</Link><span aria-hidden="true">/</span>
            {country && <>{resolvedCity || selectedCategory ? <Link to={`/browse/${countryCode}`} className="hover:text-white">{country.name}</Link> : <span>{country.name}</span>}</>}
            {resolvedCity && <><span aria-hidden="true">/</span>{selectedCategory ? <Link to={`/browse/${countryCode}/${citySlug}`} className="hover:text-white">{resolvedCity.name}</Link> : <span>{resolvedCity.name}</span>}</>}
            {selectedCategory && <><span aria-hidden="true">/</span><span>{selectedCategory.nameFa}</span></>}
          </nav>
          <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-end">
            <div>
              <div className="mb-3 flex items-center gap-3">{country && <span className="text-3xl" aria-hidden="true">{country.flag}</span>}<span className="rounded-lg bg-white/10 px-2.5 py-1 text-sm font-bold text-primary-100">{loading ? '…' : total.toLocaleString('fa-IR')} نتیجه</span></div>
              <h1 className="text-balance text-3xl font-black leading-tight md:text-5xl">{heading}</h1>
              <p lang="en" dir="ltr" className="mt-2 w-fit font-latin text-sm font-semibold text-primary-200">{englishHeading}</p>
              {!loading && browseContent && <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300 md:text-base">{browseContent.intro}</p>}
            </div>
            <Link to="/search" className="inline-flex w-fit rounded-xl bg-white px-4 py-3 text-sm font-bold text-ink hover:bg-primary-50">جستجو در همه فهرست‌ها</Link>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 md:py-10 lg:px-8">
        {/* Category Pills */}
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 md:p-5">
          <h2 className="mb-3 text-sm font-bold text-ink">محدود کردن بر اساس دسته</h2>
          <div className="flex md:flex-wrap gap-2 overflow-x-auto pb-1 md:pb-0 -mx-4 px-4 md:mx-0 md:px-0 scrollbar-hide">
            <Link
              to={resolvedCity ? `/browse/${countryCode}/${citySlug}` : `/browse/${countryCode}`}
              className={`px-3 md:px-4 py-1.5 md:py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap shrink-0 ${
                !resolvedCategorySlug
                  ? 'bg-ink text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-primary-50 hover:text-primary-800'
              }`}
            >
              همه
            </Link>
            {visibleCategories.map((cat) => {
              const catUrl = resolvedCity
                ? `/browse/${countryCode}/${citySlug}/${cat.slug}`
                : `/browse/${countryCode}/category/${cat.slug}`;
              return (
                <Link
                  key={cat.id}
                  to={catUrl}
                  className={`px-3 md:px-4 py-1.5 md:py-2 rounded-full text-sm font-medium transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                    resolvedCategorySlug === cat.slug
                      ? 'bg-ink text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-primary-50 hover:text-primary-800'
                  }`}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.nameFa}</span>
                  {categoryCountBySlug.has(cat.slug) && <span className="opacity-60">{categoryCountBySlug.get(cat.slug)?.toLocaleString('fa-IR')}</span>}
                </Link>
              );
            })}
          </div>
        </div>

        {/* City Pills */}
        {visibleCities.length > 0 && (
          <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 md:p-5">
            <h2 className="mb-3 text-sm font-bold text-ink">محدود کردن بر اساس شهر</h2>
            <div className="flex md:flex-wrap gap-2 overflow-x-auto pb-1 md:pb-0 -mx-4 px-4 md:mx-0 md:px-0 scrollbar-hide">
              <Link
                to={resolvedCategorySlug ? `/browse/${countryCode}/category/${resolvedCategorySlug}` : `/browse/${countryCode}`}
                className={`px-3 md:px-4 py-1.5 md:py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap shrink-0 ${
                  !resolvedCity
                    ? 'bg-ink text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-primary-50 hover:text-primary-800'
                }`}
              >
                همه شهرها
              </Link>
              {visibleCities.map((c) => {
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
                        ? 'bg-ink text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-primary-50 hover:text-primary-800'
                    }`}
                  >
                    {c.name}
                    {cityCountByName.has(c.name) && <span className="mr-1 opacity-60">{cityCountByName.get(c.name)?.toLocaleString('fa-IR')}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Results Count */}
        <div className="mb-6 flex items-end justify-between gap-4">
          <div><h2 className="text-2xl font-black text-ink">گزینه‌های قابل مقایسه</h2><p className="mt-1 text-sm text-slate-500"><span className="font-bold text-ink">{total.toLocaleString('fa-IR')}</span> کسب‌وکار در این راهنما</p></div>
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
            <div className="mb-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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

        {!loading && browseContent && (
          <section className="mt-12 grid gap-8 rounded-3xl border border-slate-200 bg-white p-6 md:grid-cols-[1fr_.8fr] md:p-9" aria-labelledby="browse-guide-heading">
            <div><h2 id="browse-guide-heading" className="mb-4 text-2xl font-black text-ink md:text-3xl">
              {browseContent.overviewHeading}
            </h2>
            <div className="space-y-3 text-sm leading-7 text-slate-600 md:text-base">
              {browseContent.paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div></div>
            <div className="rounded-2xl bg-porcelain p-5"><h3 className="mb-3 text-base font-black text-ink md:text-lg">
              {browseContent.checklistHeading}
            </h3>
            <ul className="space-y-3 text-sm text-slate-700 md:text-base">
              {browseContent.checklist.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-1 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary-100 text-xs font-bold text-primary-800" aria-hidden="true">✓</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p className="mt-5 border-t border-slate-200 pt-4 text-xs leading-6 text-slate-500 md:text-sm">
              {browseContent.accuracyNote}
            </p></div>
          </section>
        )}
      </div>
    </div>
  );
}
