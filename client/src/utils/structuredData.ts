import type { Listing } from '../types';

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
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: listing.title,
    description: listing.description,
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

  if (listing.website) {
    schema.url = listing.website;
  }

  if (listing.photos.length > 0) {
    schema.image = listing.photos;
  }

  if (listing.businessHours && Object.keys(listing.businessHours).length > 0) {
    schema.openingHours = Object.entries(listing.businessHours).map(
      ([day, hours]) => `${day} ${hours}`
    );
  }

  return schema;
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
