import type { Listing } from '../types';
import { openingHoursSpecification } from './businessHours';
import { resolveImageUrl } from './image';

const SITE_URL = 'https://persianpages.com';

const CATEGORY_SCHEMA_TYPES: Record<string, string> = {
  restaurant: 'Restaurant',
  grocery: 'GroceryStore',
  medical: 'MedicalBusiness',
  legal: 'LegalService',
  'real-estate': 'RealEstateAgent',
  automotive: 'AutomotiveBusiness',
  beauty: 'HealthAndBeautyBusiness',
  financial: 'FinancialService',
};

function absoluteUrl(pathOrUrl: string): string {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  return `${SITE_URL}${pathOrUrl.startsWith('/') ? '' : '/'}${pathOrUrl}`;
}

function normalizeSocialUrl(network: string, value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  const handle = trimmed.replace(/^@/, '');
  if (network === 'instagram') return `https://instagram.com/${handle}`;
  if (network === 'facebook') return `https://facebook.com/${handle}`;
  if (network === 'telegram') return `https://t.me/${handle}`;
  if (network === 'whatsapp') return `https://wa.me/${handle.replace(/[^\d+]/g, '')}`;
  if (network === 'youtube') return `https://youtube.com/${handle}`;
  if (network === 'tiktok') return `https://tiktok.com/${handle}`;
  return `https://${trimmed}`;
}

export function getWebsiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'پرشین‌پیجز',
    alternateName: 'PersianPages',
    description: 'راهنمای جامع کسب‌وکارهای ایرانی در سراسر جهان',
    inLanguage: 'fa',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: '/search?search={search_term_string}',
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

export function getLocalBusinessSchema(listing: Listing) {
  const listingUrl = absoluteUrl(`/listing/${listing.slug || listing.id}`);
  const sameAs = [
    listing.website,
    ...Object.entries(listing.socialLinks || {})
      .map(([network, value]) => value ? normalizeSocialUrl(network, value) : null),
  ].filter((url): url is string => Boolean(url));
  const openingHours = openingHoursSpecification(listing.businessHours);

  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': CATEGORY_SCHEMA_TYPES[listing.category.slug] || 'LocalBusiness',
    '@id': `${listingUrl}#business`,
    name: listing.title,
    description: listing.description,
    url: listingUrl,
    mainEntityOfPage: listingUrl,
    inLanguage: 'fa',
    address: {
      '@type': 'PostalAddress',
      streetAddress: listing.address,
      addressLocality: listing.city,
      addressCountry: listing.country,
    },
  };

  if (listing.latitude && listing.longitude) {
    schema.geo = {
      '@type': 'GeoCoordinates',
      latitude: listing.latitude,
      longitude: listing.longitude,
    };
  }

  if (listing.phone) {
    schema.telephone = listing.phone;
  }

  if (sameAs.length > 0) {
    schema.sameAs = sameAs;
  }

  if (listing.photos.length > 0) {
    schema.image = listing.photos.map(resolveImageUrl);
  }

  if (openingHours) {
    schema.openingHoursSpecification = openingHours;
  }

  return schema;
}

export function getCollectionPageSchema(params: {
  name: string;
  description: string;
  url: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: params.name,
    description: params.description,
    url: params.url,
    isPartOf: {
      '@type': 'WebSite',
      name: 'پرشین‌پیجز',
      url: 'https://persianpages.com',
    },
  };
}

export function getBreadcrumbSchema(items: { name: string; url: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}
