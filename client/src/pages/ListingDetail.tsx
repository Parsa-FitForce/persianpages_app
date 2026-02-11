import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { GoogleMap, MarkerF } from '@react-google-maps/api';
import { listingsApi, verificationApi } from '../services/api';
import type { Listing } from '../types';
import { useAuth } from '../hooks/useAuth';
import OtpVerifyModal from '../components/OtpVerifyModal';
import { useGoogleMaps } from '../hooks/useGoogleMaps';
import { getLocalBusinessSchema, getBreadcrumbSchema } from '../utils/structuredData';
import { resolveImageUrl } from '../utils/image';

export default function ListingDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { isLoaded } = useGoogleMaps();
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [claiming, setClaiming] = useState(false);
  const [claimError, setClaimError] = useState('');
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [maskedPhone, setMaskedPhone] = useState('');

  const handleClaimClick = async () => {
    if (!id || !user) return;
    setClaimError('');

    try {
      const res = await verificationApi.getPhoneHint(id);
      setMaskedPhone(res.data.maskedPhone);
      setShowOtpModal(true);
    } catch (err: any) {
      setClaimError(err.response?.data?.error || 'خطا در دریافت اطلاعات تلفن');
    }
  };

  const handleClaimVerified = async (verificationToken: string) => {
    if (!id) return;
    setShowOtpModal(false);
    setClaiming(true);
    setClaimError('');
    try {
      const res = await listingsApi.claim(id, verificationToken);
      setListing(res.data);
    } catch (err: any) {
      setClaimError(err.response?.data?.error || 'خطا در ثبت مالکیت');
    } finally {
      setClaiming(false);
    }
  };

  useEffect(() => {
    if (!id) return;
    listingsApi
      .getOne(id)
      .then((res) => setListing(res.data))
      .catch(() => setError('کسب‌وکار یافت نشد'))
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
          <h2 className="text-xl font-semibold mb-2">کسب‌وکار یافت نشد</h2>
          <Link to="/" className="text-primary-600 hover:underline">
            بازگشت به صفحه اصلی
          </Link>
        </div>
      </div>
    );
  }

  const isOwner = user?.id === listing.userId;
  const isUnclaimed = !listing.isClaimed && listing.source === 'scraped';
  const listingTitle = `${listing.title} - ${listing.city}، ${listing.country} | پرشین‌پیجز`;
  const listingDescription = listing.description.slice(0, 160);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Helmet>
        <title>{listingTitle}</title>
        <meta name="description" content={listingDescription} />
        <meta property="og:title" content={listingTitle} />
        <meta property="og:description" content={listingDescription} />
        <meta property="og:type" content="business.business" />
        {listing.photos.length > 0 && (
          <meta property="og:image" content={listing.photos[0]} />
        )}
        <meta name="twitter:title" content={listingTitle} />
        <meta name="twitter:description" content={listingDescription} />
        {listing.photos.length > 0 && (
          <meta name="twitter:image" content={listing.photos[0]} />
        )}
        <script type="application/ld+json">
          {JSON.stringify(getLocalBusinessSchema(listing))}
        </script>
        <script type="application/ld+json">
          {JSON.stringify(getBreadcrumbSchema([
            { name: 'پرشین‌پیجز', url: '/' },
            { name: listing.category.nameFa, url: `/search?category=${listing.category.slug}` },
            { name: listing.title, url: `/listings/${listing.id}` },
          ]))}
        </script>
      </Helmet>

      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm text-gray-500">
              {listing.category.icon} {listing.category.nameFa}
            </span>
            {isUnclaimed && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                ثبت نشده
              </span>
            )}
            {listing.isClaimed && listing.source === 'scraped' && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                ثبت شده
              </span>
            )}
          </div>
          <h1 className="text-3xl font-bold mb-2">{listing.title}</h1>
          <p className="text-gray-600">📍 {listing.city}، {listing.country}</p>
        </div>
        <div className="flex gap-2">
          {isOwner && (
            <Link
              to={`/listings/${listing.id}/edit`}
              className="btn-secondary"
            >
              ویرایش
            </Link>
          )}
          {isUnclaimed && user && (
            <button
              onClick={handleClaimClick}
              disabled={claiming}
              className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
            >
              {claiming ? 'در حال ثبت...' : 'این کسب‌وکار من است'}
            </button>
          )}
          {isUnclaimed && !user && (
            <Link
              to="/login"
              className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
            >
              ورود برای ثبت مالکیت
            </Link>
          )}
        </div>
      </div>
      {claimError && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
          {claimError}
        </div>
      )}

      {/* Photos */}
      {listing.photos.length > 0 && (
        <div className="mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {listing.photos.map((photo, idx) => (
              <img
                key={idx}
                src={resolveImageUrl(photo)}
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
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(listing.address + ', ' + listing.city + ', ' + listing.country)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-primary-600"
                >
                  {listing.address}
                </a>
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

          {/* Map */}
          <div className="card p-6">
            <h2 className="font-semibold mb-4">نقشه</h2>
            {listing.latitude && listing.longitude && isLoaded ? (
              <>
                <div className="rounded-xl overflow-hidden mb-3" style={{ height: 200 }}>
                  <GoogleMap
                    center={{ lat: listing.latitude, lng: listing.longitude }}
                    zoom={15}
                    mapContainerStyle={{ width: '100%', height: '100%' }}
                    options={{ disableDefaultUI: true, zoomControl: true }}
                  >
                    <MarkerF position={{ lat: listing.latitude, lng: listing.longitude }} />
                  </GoogleMap>
                </div>
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${listing.latitude},${listing.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary w-full text-center block"
                >
                  مسیریابی
                </a>
              </>
            ) : (
              <>
                <div className="rounded-xl overflow-hidden mb-3" style={{ height: 200 }}>
                  <iframe
                    title="نقشه"
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    src={`https://www.google.com/maps/embed/v1/place?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}&q=${encodeURIComponent(listing.address + ', ' + listing.city + ', ' + listing.country)}`}
                  />
                </div>
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(listing.address + ', ' + listing.city + ', ' + listing.country)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary w-full text-center block"
                >
                  مسیریابی
                </a>
              </>
            )}
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

      {listing.phone && (
        <OtpVerifyModal
          isOpen={showOtpModal}
          onClose={() => setShowOtpModal(false)}
          onVerified={handleClaimVerified}
          phone={listing.phone}
          maskedPhone={maskedPhone}
          listingId={listing.id}
          mode="claim"
        />
      )}
    </div>
  );
}
