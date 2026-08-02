type SeoListing = {
  id: string;
  slug: string | null;
  title: string;
  description: string;
  address: string;
  city: string;
  country: string;
  phone: string | null;
  website: string | null;
  placeId: string | null;
  photos: string[];
  businessHours?: unknown;
  isActive: boolean;
  isClaimed: boolean;
  phoneVerified: boolean;
  source: string;
  updatedAt: Date;
};

export const MIN_INDEXABLE_LISTING_DESCRIPTION_LENGTH = 300;
export const MIN_INDEXABLE_BROWSE_LISTINGS = 10;

function normalize(value: string | null | undefined): string {
  return (value || '')
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

export function isSeoEligibleBrowseSource(listing: SeoListing): boolean {
  const hasBusinessHours = Boolean(
    listing.businessHours
      && typeof listing.businessHours === 'object'
      && Object.keys(listing.businessHours).length > 0
  );
  const hasRichSignal = listing.photos.length > 0
    || hasBusinessHours
    || listing.isClaimed
    || listing.phoneVerified;

  return Boolean(
    listing.isActive
      && listing.slug
      && normalize(listing.title).length >= 3
      && listing.description.trim().length >= MIN_INDEXABLE_LISTING_DESCRIPTION_LENGTH
      && normalize(listing.address)
      && normalize(listing.city)
      && normalize(listing.country)
      && listing.phone
      && listing.website
      && hasRichSignal
  );
}

export function isSeoEligibleListing(listing: SeoListing): boolean {
  // Imported listings can still be useful, indexable directory pages once they
  // have enough unique business data. Claim and verification state influence
  // which duplicate wins, but must not exclude the entire imported catalog.
  return isSeoEligibleBrowseSource(listing);
}

export function listingDuplicateKey(listing: SeoListing): string {
  if (listing.placeId) return `place:${listing.placeId}`;
  return `address:${normalize(listing.address)}|${normalize(listing.city)}|${normalize(listing.country)}`;
}

function listingQualityScore(listing: SeoListing): number {
  return (
    (listing.isClaimed ? 1000 : 0)
    + (listing.phoneVerified ? 500 : 0)
    + Math.min(listing.photos.length, 5) * 20
    + (listing.website ? 25 : 0)
    + (listing.phone ? 15 : 0)
    + Math.min(listing.description.trim().length, 500) / 10
  );
}

export function selectCanonicalListings<T extends SeoListing>(
  listings: T[],
  isEligible: (listing: T) => boolean = isSeoEligibleListing
): T[] {
  const canonicalByKey = new Map<string, T>();

  for (const listing of listings) {
    if (!isEligible(listing)) continue;

    const key = listingDuplicateKey(listing);
    const existing = canonicalByKey.get(key);
    if (!existing) {
      canonicalByKey.set(key, listing);
      continue;
    }

    const scoreDifference = listingQualityScore(listing) - listingQualityScore(existing);
    if (
      scoreDifference > 0
      || (scoreDifference === 0 && listing.updatedAt > existing.updatedAt)
      || (
        scoreDifference === 0
        && listing.updatedAt.getTime() === existing.updatedAt.getTime()
        && listing.id < existing.id
      )
    ) {
      canonicalByKey.set(key, listing);
    }
  }

  return [...canonicalByKey.values()];
}

export function findCanonicalListing<T extends SeoListing>(
  listing: T,
  candidates: T[]
): T | null {
  if (!isSeoEligibleListing(listing)) return null;
  const duplicateKey = listingDuplicateKey(listing);
  return selectCanonicalListings(candidates).find(
    (candidate) => listingDuplicateKey(candidate) === duplicateKey
  ) || null;
}
