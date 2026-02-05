import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { categoriesApi, listingsApi } from '../services/api';
import type { Category, Listing } from '../types';
import CategoryCard from '../components/CategoryCard';
import ListingCard from '../components/ListingCard';

export default function Home() {
  const [search, setSearch] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      categoriesApi.getAll(),
      listingsApi.getAll({ limit: 6 }),
    ])
      .then(([catRes, listRes]) => {
        setCategories(catRes.data);
        setListings(listRes.data.listings);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (search.trim()) {
      navigate(`/search?search=${encodeURIComponent(search)}`);
    }
  };

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="bg-gradient-to-bl from-primary-600 to-primary-800 text-white py-20">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            راهنمای کسب‌وکارهای ایرانی در سراسر جهان
          </h1>
          <p className="text-lg text-primary-100 mb-8">
            به راحتی کسب‌وکارهای ایرانی را در شهر خود پیدا کنید
          </p>

          <form onSubmit={handleSearch} className="max-w-2xl mx-auto">
            <div className="flex gap-2">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="جستجوی کسب‌وکار..."
                className="input flex-1 text-gray-900"
              />
              <button type="submit" className="btn-primary bg-white text-primary-600 hover:bg-gray-100">
                جستجو
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* Categories */}
      <section className="max-w-7xl mx-auto px-4 py-16">
        <h2 className="text-2xl font-bold mb-8">دسته‌بندی‌ها</h2>
        {loading ? (
          <div className="text-center text-gray-500">در حال بارگذاری...</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
            {categories.map((cat) => (
              <CategoryCard key={cat.id} category={cat} />
            ))}
          </div>
        )}
      </section>

      {/* Recent Listings */}
      <section className="max-w-7xl mx-auto px-4 pb-16">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-bold">آگهی‌های اخیر</h2>
          <button
            onClick={() => navigate('/search')}
            className="text-primary-600 hover:text-primary-700"
          >
            مشاهده همه ←
          </button>
        </div>
        {loading ? (
          <div className="text-center text-gray-500">در حال بارگذاری...</div>
        ) : listings.length === 0 ? (
          <div className="text-center text-gray-500 py-12">
            هنوز آگهی‌ای ثبت نشده است
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {listings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
