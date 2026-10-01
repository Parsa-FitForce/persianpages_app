import { Link } from 'react-router-dom';
import type { Listing } from '../types';
import { countries, getCitiesByCountry, toSlug } from '../i18n/locations';
import { resolveImageUrl } from '../utils/image';

interface Props { listing: Listing; }

export default function ListingCard({ listing }: Props) {
  const detailUrl = `/listing/${listing.slug || listing.id}`;
  const country = countries.find((item) => item.name === listing.country);
  const city = country
    ? getCitiesByCountry(country.code).find((item) => item.name === listing.city)
    : undefined;
  const cityUrl = country && city ? `/browse/${country.code}/${toSlug(city.nameEn)}` : undefined;
  const categoryUrl = country
    ? cityUrl
      ? `${cityUrl}/${listing.category.slug}`
      : `/browse/${country.code}/category/${listing.category.slug}`
    : `/search?category=${listing.category.slug}`;

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white transition-[border-color,transform] hover:-translate-y-0.5 hover:border-primary-300">
      <Link to={detailUrl} className="relative block aspect-[16/10] overflow-hidden bg-primary-50" aria-label={`مشاهده ${listing.title}`}>
        {listing.photos[0] ? (
          <img src={resolveImageUrl(listing.photos[0])} alt={listing.title} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.025]" />
        ) : (
          <div className="atlas-grid grid h-full place-items-center bg-ink text-5xl" aria-hidden="true"><span className="drop-shadow-sm">{listing.category.icon}</span></div>
        )}
        {(listing.isClaimed || listing.phoneVerified) && (
          <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-lg bg-white/95 px-2 py-1 text-[11px] font-bold text-primary-800 shadow-sm">
            <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M16.704 5.29a1 1 0 0 1 .006 1.414l-7.25 7.31a1 1 0 0 1-1.42 0l-3.25-3.276a1 1 0 1 1 1.42-1.408l2.54 2.56 6.54-6.594a1 1 0 0 1 1.414-.006Z" clipRule="evenodd" /></svg>
            {listing.isClaimed ? 'مالک ثبت‌شده' : 'تلفن تأیید‌شده'}
          </span>
        )}
      </Link>
      <div className="flex flex-1 flex-col p-4 md:p-5">
        <div className="mb-2 flex flex-wrap items-center gap-2 text-xs font-semibold text-primary-700">
          <Link to={categoryUrl} className="hover:underline">{listing.category.icon} {listing.category.nameFa}</Link>
          {cityUrl && <><span className="text-slate-300" aria-hidden="true">/</span><Link to={cityUrl} className="text-slate-500 hover:text-primary-700">{listing.city}</Link></>}
        </div>
        <h3 className="text-base font-black leading-7 text-ink md:text-lg"><Link to={detailUrl} className="hover:text-primary-700">{listing.title}</Link></h3>
        <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">{listing.description}</p>
        <div className="mt-auto flex items-center justify-between gap-3 border-t border-slate-100 pt-4 text-xs text-slate-500">
          <span className="line-clamp-1">{listing.city}، {listing.country}</span>
          <Link to={detailUrl} className="shrink-0 font-bold text-ink hover:text-primary-700">اطلاعات و تماس</Link>
        </div>
      </div>
    </article>
  );
}
