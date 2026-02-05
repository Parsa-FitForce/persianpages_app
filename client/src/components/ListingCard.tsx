import { Link } from 'react-router-dom';
import type { Listing } from '../types';

interface Props {
  listing: Listing;
}

export default function ListingCard({ listing }: Props) {
  return (
    <Link to={`/listing/${listing.id}`} className="card hover:shadow-md transition-shadow">
      <div className="aspect-video bg-gray-100 relative">
        {listing.photos[0] ? (
          <img
            src={listing.photos[0]}
            alt={listing.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl">
            {listing.category.icon}
          </div>
        )}
        <span className="absolute top-2 right-2 bg-white/90 px-2 py-1 rounded-md text-sm">
          {listing.category.nameFa}
        </span>
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-lg mb-1 line-clamp-1">{listing.title}</h3>
        <p className="text-gray-500 text-sm mb-2 line-clamp-2">{listing.description}</p>
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <span>📍</span>
          <span>{listing.city}، {listing.country}</span>
        </div>
      </div>
    </Link>
  );
}
