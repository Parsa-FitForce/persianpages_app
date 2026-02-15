import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { categoriesApi, listingsApi } from '../services/api';
import type { Category, Listing } from '../types';
import { getCountryByCode, getCitiesByCountry } from '../i18n/locations';
import ListingCard from '../components/ListingCard';

export default function Search() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [listings, setListings] = useState<Listing[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);

  const search = searchParams.get('search') || '';
  const categorySlug = searchParams.get('category') || '';
  const city = searchParams.get('city') || '';
  const countryCode = searchParams.get('country') || localStorage.getItem('selectedCountry') || '';

  const selectedCountry = countryCode ? getCountryByCode(countryCode) : null;
  const countryCities = countryCode ? getCitiesByCountry(countryCode) : [];

  useEffect(() => {
    categoriesApi.getAll().then((res) => setCategories(res.data));
  }, []);

  useEffect(() => {
    setLoading(true);
    const countryFilter = selectedCountry?.name;
    listingsApi
      .getAll({ search, category: categorySlug, city, country: countryFilter, page })
      .then((res) => {
        setListings(res.data.listings);
        setTotal(res.data.pagination.total);
        setPages(res.data.pagination.pages);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [search, categorySlug, city, page, selectedCountry?.name]);

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    setSearchParams(params);
    setPage(1);
  };

  const selectedCategory = categories.find(c => c.slug === categorySlug);

  const titleParts = ['جستجو'];
  if (search) titleParts.push(`«${search}»`);
  if (selectedCategory) titleParts.push(selectedCategory.nameFa);
  if (city) titleParts.push(city);
  if (selectedCountry) titleParts.push(selectedCountry.name);
  const searchTitle = `${titleParts.join(' - ')} | پرشین‌پیجز`;

  return (
    <div className="min-h-screen">
      <Helmet>
        <title>{searchTitle}</title>
        <meta name="robots" content="noindex, follow" />
      </Helmet>

      {/* Search Header */}
      <div className="bg-gradient-to-l from-primary-600 to-primary-700 text-white py-8">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex items-center gap-3 mb-6">
            {selectedCountry && (
              <span className="text-3xl">{selectedCountry.flag}</span>
            )}
            <h1 className="text-2xl font-bold">
              {selectedCountry
                ? `جستجو در ${selectedCountry.name}`
                : 'جستجوی کسب‌وکار'}
            </h1>
          </div>

          {/* Search Input */}
          <div className="relative">
            <input
              type="text"
              value={search}
              onChange={(e) => updateFilter('search', e.target.value)}
              placeholder="نام کسب‌وکار، خدمات یا محصول..."
              className="w-full px-5 py-4 pr-12 rounded-2xl text-gray-900 text-lg shadow-lg focus:ring-4 focus:ring-white/30 outline-none"
            />
            <svg
              className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Category Pills */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-500 mb-3">دسته‌بندی</h3>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => updateFilter('category', '')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                !categorySlug
                  ? 'bg-primary-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              همه
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => updateFilter('category', cat.slug)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-1.5 ${
                  categorySlug === cat.slug
                    ? 'bg-primary-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.nameFa}</span>
              </button>
            ))}
          </div>
        </div>

        {/* City Pills */}
        {countryCities.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-500 mb-3">شهر</h3>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => updateFilter('city', '')}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  !city
                    ? 'bg-primary-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                همه شهرها
              </button>
              {countryCities.map((c) => (
                <button
                  key={c.nameEn}
                  onClick={() => updateFilter('city', c.name)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    city === c.name
                      ? 'bg-primary-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Active Filters Summary */}
        {(search || categorySlug || city) && (
          <div className="flex items-center gap-2 mb-6 text-sm">
            <span className="text-gray-500">فیلترهای فعال:</span>
            {search && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-primary-50 text-primary-700 rounded-full">
                «{search}»
                <button
                  onClick={() => updateFilter('search', '')}
                  className="hover:text-primary-900"
                >
                  ✕
                </button>
              </span>
            )}
            {selectedCategory && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-primary-50 text-primary-700 rounded-full">
                {selectedCategory.icon} {selectedCategory.nameFa}
                <button
                  onClick={() => updateFilter('category', '')}
                  className="hover:text-primary-900"
                >
                  ✕
                </button>
              </span>
            )}
            {city && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-primary-50 text-primary-700 rounded-full">
                {city}
                <button
                  onClick={() => updateFilter('city', '')}
                  className="hover:text-primary-900"
                >
                  ✕
                </button>
              </span>
            )}
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
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
