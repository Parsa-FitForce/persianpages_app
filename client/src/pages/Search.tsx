import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { categoriesApi, listingsApi } from '../services/api';
import type { Category, Listing } from '../types';
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
  const category = searchParams.get('category') || '';
  const city = searchParams.get('city') || '';

  useEffect(() => {
    categoriesApi.getAll().then((res) => setCategories(res.data));
  }, []);

  useEffect(() => {
    setLoading(true);
    listingsApi
      .getAll({ search, category, city, page })
      .then((res) => {
        setListings(res.data.listings);
        setTotal(res.data.pagination.total);
        setPages(res.data.pagination.pages);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [search, category, city, page]);

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

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">جستجوی کسب‌وکار</h1>

      {/* Filters */}
      <div className="card p-4 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <input
            type="text"
            value={search}
            onChange={(e) => updateFilter('search', e.target.value)}
            placeholder="جستجو..."
            className="input"
          />
          <select
            value={category}
            onChange={(e) => updateFilter('category', e.target.value)}
            className="input"
          >
            <option value="">همه دسته‌بندی‌ها</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.slug}>
                {cat.nameFa}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={city}
            onChange={(e) => updateFilter('city', e.target.value)}
            placeholder="شهر..."
            className="input"
          />
        </div>
      </div>

      {/* Results */}
      <div className="mb-4 text-gray-600">
        {total} نتیجه یافت شد
      </div>

      {loading ? (
        <div className="text-center text-gray-500 py-12">در حال بارگذاری...</div>
      ) : listings.length === 0 ? (
        <div className="text-center text-gray-500 py-12">
          نتیجه‌ای یافت نشد
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
            <div className="flex justify-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="btn-secondary disabled:opacity-50"
              >
                قبلی
              </button>
              <span className="px-4 py-2">
                صفحه {page} از {pages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(pages, p + 1))}
                disabled={page === pages}
                className="btn-secondary disabled:opacity-50"
              >
                بعدی
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
