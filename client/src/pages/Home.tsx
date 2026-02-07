import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { categoriesApi, listingsApi } from '../services/api';
import type { Category, Listing } from '../types';
import { getCountryByCode, getCitiesByCountry } from '../i18n/locations';
import CategoryCard from '../components/CategoryCard';
import ListingCard from '../components/ListingCard';

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
      listingsApi.getAll({ limit: 6, country: countryFilter }),
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

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="bg-gradient-to-bl from-primary-600 to-primary-800 text-white py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          {selectedCountry ? (
            <>
              <div className="text-5xl mb-4">{selectedCountry.flag}</div>
              <h1 className="text-3xl md:text-4xl font-bold mb-3">
                کسب‌وکارهای ایرانی در {selectedCountry.name}
              </h1>
              <p className="text-lg text-primary-100 mb-2">
                {countryCities.length} شهر
              </p>
            </>
          ) : (
            <>
              <h1 className="text-4xl md:text-5xl font-bold mb-4">
                راهنمای کسب‌وکارهای ایرانی در سراسر جهان
              </h1>
              <p className="text-lg text-primary-100 mb-8">
                به راحتی کسب‌وکارهای ایرانی را در شهر خود پیدا کنید
              </p>
            </>
          )}

          <form onSubmit={handleSearch} className="max-w-2xl mx-auto mt-6">
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
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {countryCities.slice(0, 8).map((city) => (
                <button
                  key={city.nameEn}
                  onClick={() => navigate(`/search?country=${countryCode}&city=${encodeURIComponent(city.name)}`)}
                  className="px-3 py-1 bg-white/20 rounded-full text-sm hover:bg-white/30 transition-colors"
                >
                  {city.name}
                </button>
              ))}
              {countryCities.length > 8 && (
                <button
                  onClick={() => navigate(`/search?country=${countryCode}`)}
                  className="px-3 py-1 bg-white/20 rounded-full text-sm hover:bg-white/30 transition-colors"
                >
                  +{countryCities.length - 8} شهر دیگر
                </button>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Categories */}
      <section className="max-w-7xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-bold mb-6">دسته‌بندی‌ها</h2>
        {loading ? (
          <div className="text-center text-gray-500">در حال بارگذاری...</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
            {categories.map((cat) => (
              <CategoryCard key={cat.id} category={cat} countryCode={countryCode} />
            ))}
          </div>
        )}
      </section>

      {/* Recent Listings */}
      <section className="max-w-7xl mx-auto px-4 pb-16">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">
            {selectedCountry ? `آگهی‌های ${selectedCountry.name}` : 'آگهی‌های اخیر'}
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
              ? `هنوز آگهی‌ای در ${selectedCountry.name} ثبت نشده است`
              : 'هنوز آگهی‌ای ثبت نشده است'
            }
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
