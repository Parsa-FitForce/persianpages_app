import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { listingsApi } from '../services/api';
import type { Listing } from '../types';
import { useAuth } from '../hooks/useAuth';

export default function ListingDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    listingsApi
      .getOne(id)
      .then((res) => setListing(res.data))
      .catch(() => setError('آگهی یافت نشد'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-gray-500">در حال بارگذاری...</div>
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">آگهی یافت نشد</h2>
          <Link to="/" className="text-primary-600 hover:underline">
            بازگشت به صفحه اصلی
          </Link>
        </div>
      </div>
    );
  }

  const isOwner = user?.id === listing.userId;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <span className="text-sm text-gray-500 mb-2 block">
            {listing.category.icon} {listing.category.nameFa}
          </span>
          <h1 className="text-3xl font-bold mb-2">{listing.title}</h1>
          <p className="text-gray-600">📍 {listing.city}، {listing.country}</p>
        </div>
        {isOwner && (
          <Link
            to={`/listings/${listing.id}/edit`}
            className="btn-secondary"
          >
            ویرایش
          </Link>
        )}
      </div>

      {/* Photos */}
      {listing.photos.length > 0 && (
        <div className="mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {listing.photos.map((photo, idx) => (
              <img
                key={idx}
                src={photo}
                alt={`${listing.title} - ${idx + 1}`}
                className="w-full h-64 object-cover rounded-xl"
              />
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="md:col-span-2">
          <div className="card p-6 mb-6">
            <h2 className="font-semibold mb-4">درباره کسب‌وکار</h2>
            <p className="text-gray-700 whitespace-pre-line">{listing.description}</p>
          </div>

          {listing.businessHours && Object.keys(listing.businessHours).length > 0 && (
            <div className="card p-6">
              <h2 className="font-semibold mb-4">ساعات کاری</h2>
              <div className="space-y-2">
                {Object.entries(listing.businessHours).map(([day, hours]) => (
                  <div key={day} className="flex justify-between text-sm">
                    <span className="text-gray-600">{day}</span>
                    <span>{hours}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="card p-6">
            <h2 className="font-semibold mb-4">اطلاعات تماس</h2>
            <div className="space-y-3">
              {listing.phone && (
                <div className="flex items-center gap-3">
                  <span className="text-gray-400">📞</span>
                  <a href={`tel:${listing.phone}`} className="hover:text-primary-600" dir="ltr">
                    {listing.phone}
                  </a>
                </div>
              )}
              <div className="flex items-center gap-3">
                <span className="text-gray-400">📍</span>
                <span>{listing.address}</span>
              </div>
              {listing.website && (
                <div className="flex items-center gap-3">
                  <span className="text-gray-400">🌐</span>
                  <a
                    href={listing.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary-600 hover:underline"
                  >
                    وب‌سایت
                  </a>
                </div>
              )}
            </div>
          </div>

          {listing.socialLinks && Object.keys(listing.socialLinks).length > 0 && (
            <div className="card p-6">
              <h2 className="font-semibold mb-4">شبکه‌های اجتماعی</h2>
              <div className="space-y-3">
                {listing.socialLinks.instagram && (
                  <a
                    href={`https://instagram.com/${listing.socialLinks.instagram}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 text-primary-600 hover:underline"
                  >
                    اینستاگرام
                  </a>
                )}
                {listing.socialLinks.telegram && (
                  <a
                    href={`https://t.me/${listing.socialLinks.telegram}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 text-primary-600 hover:underline"
                  >
                    تلگرام
                  </a>
                )}
                {listing.socialLinks.whatsapp && (
                  <a
                    href={`https://wa.me/${listing.socialLinks.whatsapp}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 text-primary-600 hover:underline"
                  >
                    واتساپ
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
