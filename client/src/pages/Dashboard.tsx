import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { listingsApi } from '../services/api';
import type { Listing } from '../types';
import { useAuth } from '../hooks/useAuth';

export default function Dashboard() {
  const { user } = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listingsApi
      .getMine()
      .then((res) => setListings(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('آیا از حذف این آگهی اطمینان دارید؟')) return;

    try {
      await listingsApi.delete(id);
      setListings((prev) => prev.filter((l) => l.id !== id));
    } catch (err) {
      alert('خطا در حذف آگهی');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold">داشبورد</h1>
          <p className="text-gray-600">خوش آمدید، {user?.name}</p>
        </div>
        <Link to="/listings/new" className="btn-primary">
          ثبت آگهی جدید
        </Link>
      </div>

      <div className="card">
        <div className="p-4 border-b border-gray-100">
          <h2 className="font-semibold">آگهی‌های من</h2>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-500">در حال بارگذاری...</div>
        ) : listings.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            هنوز آگهی‌ای ثبت نکرده‌اید
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {listings.map((listing) => (
              <div key={listing.id} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center text-2xl">
                    {listing.photos[0] ? (
                      <img
                        src={listing.photos[0]}
                        alt=""
                        className="w-full h-full object-cover rounded-lg"
                      />
                    ) : (
                      listing.category.icon
                    )}
                  </div>
                  <div>
                    <h3 className="font-medium">{listing.title}</h3>
                    <p className="text-sm text-gray-500">
                      {listing.category.nameFa} • {listing.city}
                    </p>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        listing.isActive
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {listing.isActive ? 'فعال' : 'غیرفعال'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    to={`/listing/${listing.id}`}
                    className="text-gray-600 hover:text-gray-900 px-3 py-1"
                  >
                    مشاهده
                  </Link>
                  <Link
                    to={`/listings/${listing.id}/edit`}
                    className="text-primary-600 hover:text-primary-700 px-3 py-1"
                  >
                    ویرایش
                  </Link>
                  <button
                    onClick={() => handleDelete(listing.id)}
                    className="text-red-600 hover:text-red-700 px-3 py-1"
                  >
                    حذف
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
