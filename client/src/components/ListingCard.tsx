import { Link } from 'react-router-dom';
import type { Listing } from '../types';
import { resolveImageUrl } from '../utils/image';

interface Props {
  listing: Listing;
}

export default function ListingCard({ listing }: Props) {
  return (
    <Link to={`/listing/${listing.slug || listing.id}`} className="card hover:shadow-md transition-shadow">
      <div className="aspect-[4/3] md:aspect-video bg-gray-100 relative">
        {listing.photos[0] ? (
          <img
            src={resolveImageUrl(listing.photos[0])}
            alt={listing.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-3xl md:text-4xl">
            {listing.category.icon}
          </div>
        )}
        <span className="absolute top-1.5 right-1.5 md:top-2 md:right-2 bg-white/90 px-1.5 py-0.5 md:px-2 md:py-1 rounded-md text-xs md:text-sm">
          {listing.category.nameFa}
        </span>
      </div>
      <div className="p-2.5 md:p-4">
        <h3 className="font-semibold text-sm md:text-lg mb-0.5 md:mb-1 line-clamp-1">{listing.title}</h3>
        <p className="text-gray-500 text-xs md:text-sm mb-1.5 md:mb-2 line-clamp-1 md:line-clamp-2">{listing.description}</p>
        <div className="flex items-center gap-1 md:gap-2 text-xs md:text-sm text-gray-400">
          <span>📍</span>
          <span className="line-clamp-1">{listing.city}، {listing.country}</span>
        </div>
      </div>
    </Link>
  );
}
