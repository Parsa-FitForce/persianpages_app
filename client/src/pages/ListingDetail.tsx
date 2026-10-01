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
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import ListingCard from '../components/ListingCard';
import { countries, getCitiesByCountry, toSlug } from '../i18n/locations';

const MIN_INDEXABLE_LISTING_DESCRIPTION_LENGTH = 300;

function hasBusinessHours(businessHours: Listing['businessHours']): boolean {
  return Boolean(businessHours && Object.keys(businessHours).length > 0);
}

function PhotoGallery({ photos, title }: { photos: string[]; title: string }) {
  const [showAll, setShowAll] = useState(false);

  if (photos.length === 0) return null;

  if (photos.length === 1) {
    return (
      <div className="mb-6">
        <img
          src={resolveImageUrl(photos[0])}
          alt={title}
          className="w-full h-64 md:h-80 object-cover rounded-xl"
        />
      </div>
    );
  }

  const visiblePhotos = showAll ? photos : photos.slice(0, 5);
  const extraCount = photos.length - 5;

  return (
    <div className="mb-6">
      <div className="grid grid-cols-4 grid-rows-2 gap-1.5 rounded-xl overflow-hidden h-64 md:h-80">
        {/* Main large image */}
        <div className="col-span-2 row-span-2">
          <img
            src={resolveImageUrl(photos[0])}
            alt={`${title} - 1`}
            className="w-full h-full object-cover"
          />
        </div>
        {/* Smaller images */}
        {visiblePhotos.slice(1, 5).map((photo, idx) => (
          <div key={idx} className="relative">
            <img
              src={resolveImageUrl(photo)}
              alt={`${title} - ${idx + 2}`}
              className="w-full h-full object-cover"
            />
            {/* "Show more" overlay on last visible thumbnail */}
            {!showAll && idx === Math.min(3, photos.length - 2) && extraCount > 0 && (
              <button
                onClick={() => setShowAll(true)}
                className="absolute inset-0 bg-black/50 flex items-center justify-center text-white font-medium text-sm hover:bg-black/60 transition-colors"
              >
                +{extraCount} عکس دیگر
              </button>
            )}
          </div>
        ))}
        {/* Fill empty slots if fewer than 5 photos */}
        {photos.length < 5 &&
          Array.from({ length: 4 - (photos.length - 1) }).map((_, idx) => (
            <div key={`empty-${idx}`} className="bg-gray-100" />
          ))}
      </div>
      {/* Expanded view for extra photos */}
      {showAll && photos.length > 5 && (
        <div className="grid grid-cols-3 gap-1.5 mt-1.5">
          {photos.slice(5).map((photo, idx) => (
            <img
              key={idx}
              src={resolveImageUrl(photo)}
              alt={`${title} - ${idx + 6}`}
              className="w-full h-40 object-cover rounded-lg"
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function ListingDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { isLoaded } = useGoogleMaps();
  const [listing, setListing] = useState<Listing | null>(null);
  const [relatedListings, setRelatedListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [claiming, setClaiming] = useState(false);
  const [claimError, setClaimError] = useState('');
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [maskedPhone, setMaskedPhone] = useState('');

  const handleClaimClick = async () => {
    if (!listing || !user) return;
    setClaimError('');

    try {
      const res = await verificationApi.getPhoneHint(listing.id);
      setMaskedPhone(res.data.maskedPhone);
      setShowOtpModal(true);
    } catch (err: any) {
      setClaimError(err.response?.data?.error || 'خطا در دریافت اطلاعات تلفن');
    }
  };

  const handleClaimVerified = async (verificationToken: string) => {
    if (!listing) return;
    setShowOtpModal(false);
    setClaiming(true);
    setClaimError('');
    try {
      const res = await listingsApi.claim(listing.id, verificationToken);
      setListing(res.data);
    } catch (err: any) {
      setClaimError(err.response?.data?.error || 'خطا در ثبت مالکیت');
    } finally {
      setClaiming(false);
    }
  };

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    setError('');
    listingsApi
      .getOne(id)
      .then((res) => {
        if (cancelled) return;
        setListing(res.data);
        setRelatedListings(res.data.relatedListings || []);
      })
      .catch(() => {
        if (!cancelled) setError('کسب‌وکار یافت نشد');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
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
  const listingCountry = countries.find((country) => country.name === listing.country);
  const listingCity = listingCountry
    ? getCitiesByCountry(listingCountry.code).find((city) => city.name === listing.city)
    : undefined;
  const countryUrl = listingCountry ? `/browse/${listingCountry.code}` : '/select-country';
  const cityUrl = listingCountry && listingCity
    ? `/browse/${listingCountry.code}/${toSlug(listingCity.nameEn)}`
    : countryUrl;
  const categoryUrl = listingCountry && listingCity
    ? `${cityUrl}/${listing.category.slug}`
    : listingCountry
      ? `/browse/${listingCountry.code}/category/${listing.category.slug}`
      : `/search?category=${listing.category.slug}`;
  const listingTitle = `${listing.title} - ${listing.city}، ${listing.country} | پرشین‌پیجز`;
  const listingDescription = listing.description.slice(0, 160);
  const isSeoIndexable = Boolean(
    listing.isActive
      && listing.slug
      && listing.title.trim().length >= 3
      && listing.description.trim().length >= MIN_INDEXABLE_LISTING_DESCRIPTION_LENGTH
      && listing.address.trim()
      && listing.city.trim()
      && listing.country.trim()
      && listing.phone
      && listing.website
      && (listing.isClaimed || listing.phoneVerified)
      && (
        listing.photos.length > 0
        || hasBusinessHours(listing.businessHours)
        || listing.isClaimed
        || listing.phoneVerified
      )
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 md:py-10 lg:px-8">
      <Helmet>
        <title>{listingTitle}</title>
        <meta name="description" content={listingDescription} />
        <link rel="canonical" href={`https://persianpages.com/listing/${listing.slug || id}`} />
        {!isSeoIndexable ? (
          <meta name="robots" content="noindex, follow" />
        ) : null}
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
            { name: listing.title, url: `/listing/${listing.slug || listing.id}` },
          ]))}
        </script>
      </Helmet>

      <nav className="mb-6 flex flex-wrap items-center gap-2 text-xs text-slate-500" aria-label="مسیر صفحه">
        <Link to="/" className="hover:text-primary-700">پرشین‌پیجز</Link><span aria-hidden="true">/</span>
        <Link to={countryUrl} className="hover:text-primary-700">{listing.country}</Link><span aria-hidden="true">/</span>
        <Link to={cityUrl} className="hover:text-primary-700">{listing.city}</Link><span aria-hidden="true">/</span>
        <Link to={categoryUrl} className="hover:text-primary-700">{listing.category.nameFa}</Link>
      </nav>

      <header className="mb-7 grid gap-5 border-b border-slate-200 pb-7 md:grid-cols-[1fr_auto] md:items-end">
        <div>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Link to={categoryUrl} className="rounded-lg bg-primary-50 px-2.5 py-1 text-sm font-bold text-primary-800">{listing.category.icon} {listing.category.nameFa}</Link>
            {isUnclaimed && (
              <span className="inline-flex items-center rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-800">
                مالکیت ثبت نشده
              </span>
            )}
            {listing.isClaimed && (
              <span className="inline-flex items-center gap-1 rounded-lg bg-primary-50 px-2.5 py-1 text-xs font-bold text-primary-800">
                <span aria-hidden="true">✓</span> مالک ثبت‌شده
              </span>
            )}
            {listing.phoneVerified && (
              <span className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-bold text-lapis">
                <span aria-hidden="true">✓</span> تلفن تأیید‌شده
              </span>
            )}
          </div>
          <h1 className="text-balance text-3xl font-black leading-tight text-ink md:text-5xl">{listing.title}</h1>
          <p className="mt-3 text-slate-600">{listing.address}، {listing.city}، {listing.country}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {isOwner && (
            <Link
              to={`/listings/${listing.id}/edit`}
              className="btn-secondary"
            >
              ویرایش صفحه
            </Link>
          )}
          {isUnclaimed && user && (
            <button
              onClick={handleClaimClick}
              disabled={claiming}
              className="btn-primary disabled:opacity-50"
            >
              {claiming ? 'در حال ثبت...' : 'این کسب‌وکار من است'}
            </button>
          )}
          {isUnclaimed && !user && (
            <Link
              to="/login"
              className="btn-primary"
            >
              ورود برای ثبت مالکیت
            </Link>
          )}
        </div>
      </header>
      {claimError && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
          {claimError}
        </div>
      )}

      {/* Photos */}
      <PhotoGallery photos={listing.photos} title={listing.title} />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_360px]">
        {/* Main Content */}
        <div>
          <section className="card mb-6 p-6 md:p-8">
            <h2 className="mb-4 text-2xl font-black text-ink">درباره {listing.title}</h2>
            <p className="whitespace-pre-line text-base leading-8 text-slate-700">{listing.description}</p>
          </section>

          <section className="mb-6 grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 sm:grid-cols-3">
            <div><span className="block text-xs text-slate-500">منبع اطلاعات</span><strong className="mt-1 block text-sm text-ink">{listing.isClaimed ? 'مالک کسب‌وکار' : 'منابع عمومی'}</strong></div>
            <div><span className="block text-xs text-slate-500">وضعیت تماس</span><strong className="mt-1 block text-sm text-ink">{listing.phoneVerified ? 'شماره تأیید شده' : 'پیش از مراجعه بررسی شود'}</strong></div>
            <div><span className="block text-xs text-slate-500">آخرین به‌روزرسانی</span><time className="mt-1 block text-sm font-bold text-ink" dateTime={listing.updatedAt}>{new Date(listing.updatedAt).toLocaleDateString('fa-IR')}</time></div>
          </section>

          {/* Map */}
          <section className="card p-6 md:p-8">
            <h2 className="mb-4 text-xl font-black text-ink">موقعیت و مسیریابی</h2>
            {listing.latitude && listing.longitude && isLoaded ? (
              <>
                <div className="rounded-xl overflow-hidden mb-3" style={{ height: 300 }}>
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
                <div className="rounded-xl overflow-hidden mb-3" style={{ height: 300 }}>
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
          </section>
        </div>

        {/* Sidebar */}
        <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          <div className="card p-6">
            <h2 className="mb-4 text-xl font-black text-ink">تماس با کسب‌وکار</h2>
            <div className="mb-5 grid gap-2">
              {listing.phone && <a href={`tel:${listing.phone}`} className="btn-primary text-center">تماس تلفنی</a>}
              {listing.website && <a href={listing.website} target="_blank" rel="noopener noreferrer nofollow" className="btn-secondary text-center">باز کردن وب‌سایت رسمی</a>}
            </div>
            <div className="space-y-3">
              {listing.phone && (() => {
                const parsed = parsePhoneNumberFromString(listing.phone);
                const display = parsed ? parsed.formatInternational() : listing.phone;
                return (
                  <div className="flex items-center gap-3">
                    <span className="text-gray-400">📞</span>
                    <a href={`tel:${listing.phone}`} className="hover:text-primary-600" dir="ltr">
                      {display}
                    </a>
                  </div>
                );
              })()}
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
                    rel="noopener noreferrer nofollow"
                    className="font-bold text-primary-700 hover:underline"
                  >
                    وب‌سایت
                  </a>
                </div>
              )}
            </div>
          </div>

          {listing.businessHours && Object.keys(listing.businessHours).length > 0 && (() => {
            const dayOrder = ['saturday', 'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
            const daysFa: Record<string, string> = {
              saturday: 'شنبه', sunday: 'یکشنبه', monday: 'دوشنبه', tuesday: 'سه‌شنبه',
              wednesday: 'چهارشنبه', thursday: 'پنج‌شنبه', friday: 'جمعه',
            };
            const toFaDigits = (s: string) => s.replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[+d]);
            const hoursMap = Object.fromEntries(
              Object.entries(listing.businessHours!).map(([k, v]) => [k.toLowerCase(), v])
            );
            return (
              <div className="card p-6">
                <h2 className="font-semibold mb-4">ساعات کاری</h2>
                <div className="space-y-2">
                  {dayOrder.map((day) => {
                    const hours = hoursMap[day];
                    const timeStr = !hours
                      ? 'تعطیل'
                      : typeof hours === 'string'
                        ? toFaDigits(hours)
                        : toFaDigits(`${(hours as any).open} - ${(hours as any).close}`);
                    return (
                      <div key={day} className="flex justify-between text-sm">
                        <span className={!hours ? 'text-red-400' : ''} dir="ltr">{timeStr}</span>
                        <span className="text-gray-600">{daysFa[day]}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {listing.socialLinks && Object.keys(listing.socialLinks).length > 0 && (
            <div className="card p-6">
              <h2 className="font-semibold mb-4">شبکه‌های اجتماعی</h2>
              <div className="space-y-3">
                {listing.socialLinks.instagram && (
                  <a
                    href={listing.socialLinks.instagram.startsWith('http') ? listing.socialLinks.instagram : `https://instagram.com/${listing.socialLinks.instagram}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 text-primary-600 hover:underline"
                  >
                    اینستاگرام
                  </a>
                )}
                {listing.socialLinks.facebook && (
                  <a
                    href={listing.socialLinks.facebook.startsWith('http') ? listing.socialLinks.facebook : `https://facebook.com/${listing.socialLinks.facebook}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 text-primary-600 hover:underline"
                  >
                    فیسبوک
                  </a>
                )}
                {listing.socialLinks.telegram && (
                  <a
                    href={listing.socialLinks.telegram.startsWith('http') ? listing.socialLinks.telegram : `https://t.me/${listing.socialLinks.telegram}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 text-primary-600 hover:underline"
                  >
                    تلگرام
                  </a>
                )}
                {listing.socialLinks.whatsapp && (
                  <a
                    href={listing.socialLinks.whatsapp.startsWith('http') ? listing.socialLinks.whatsapp : `https://wa.me/${listing.socialLinks.whatsapp}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 text-primary-600 hover:underline"
                  >
                    واتساپ
                  </a>
                )}
                {listing.socialLinks.youtube && (
                  <a
                    href={listing.socialLinks.youtube.startsWith('http') ? listing.socialLinks.youtube : `https://youtube.com/${listing.socialLinks.youtube}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 text-primary-600 hover:underline"
                  >
                    یوتیوب
                  </a>
                )}
                {listing.socialLinks.tiktok && (
                  <a
                    href={listing.socialLinks.tiktok.startsWith('http') ? listing.socialLinks.tiktok : `https://tiktok.com/${listing.socialLinks.tiktok}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 text-primary-600 hover:underline"
                  >
                    تیک‌تاک
                  </a>
                )}
              </div>
            </div>
          )}
        </aside>
      </div>

      {relatedListings.length > 0 && (
        <section className="mt-14 border-t border-slate-200 pt-10" aria-labelledby="related-listings-heading">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div><h2 id="related-listings-heading" className="text-2xl font-black text-ink">گزینه‌های مرتبط</h2><p className="mt-1 text-sm text-slate-500">کسب‌وکارهای هم‌دسته یا نزدیک در {listing.city}</p></div>
            <Link to={categoryUrl} className="text-sm font-bold text-primary-700">مشاهده راهنمای کامل</Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{relatedListings.map((related) => <ListingCard key={related.id} listing={related} />)}</div>
        </section>
      )}

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
