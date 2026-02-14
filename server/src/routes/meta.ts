import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

const SITE_NAME = 'PersianPages';
const SITE_URL = 'https://persianpages.com';
const DEFAULT_IMAGE = `${SITE_URL}/og-default.png`;

const FALLBACK_META = {
  title: `${SITE_NAME} | دایرکتوری مشاغل ایرانی`,
  description: 'دایرکتوری آنلاین مشاغل ایرانی در کانادا - رستوران، پزشک، وکیل، املاک و خدمات ایرانی',
  image: DEFAULT_IMAGE,
  url: SITE_URL,
  type: 'website',
  jsonLd: {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: SITE_URL,
    description: 'دایرکتوری آنلاین مشاغل ایرانی در کانادا',
  },
};

router.get('/:type/:id', async (req: Request, res: Response) => {
  const { type, id } = req.params;

  try {
    if (type === 'listing') {
      // Try slug first, then id
      let listing = await prisma.listing.findUnique({
        where: { slug: id },
        include: { category: true },
      });
      if (!listing) {
        listing = await prisma.listing.findUnique({
          where: { id },
          include: { category: true },
        });
      }

      if (!listing) {
        return res.json(FALLBACK_META);
      }

      const url = `${SITE_URL}/listing/${listing.slug || listing.id}`;
      const image = listing.photos.length > 0 ? listing.photos[0] : DEFAULT_IMAGE;
      const description = listing.description
        ? listing.description.substring(0, 160)
        : `${listing.title} - ${listing.category.nameFa} در ${listing.city}`;

      return res.json({
        title: `${listing.title} | ${SITE_NAME}`,
        description,
        image,
        url,
        type: 'LocalBusiness',
        jsonLd: {
          '@context': 'https://schema.org',
          '@type': 'LocalBusiness',
          name: listing.title,
          description: listing.description,
          image,
          url,
          address: {
            '@type': 'PostalAddress',
            streetAddress: listing.address,
            addressLocality: listing.city,
            addressCountry: listing.country,
          },
          ...(listing.phone && { telephone: listing.phone }),
          ...(listing.latitude && listing.longitude && {
            geo: {
              '@type': 'GeoCoordinates',
              latitude: listing.latitude,
              longitude: listing.longitude,
            },
          }),
          ...(listing.website && { sameAs: listing.website }),
        },
      });
    }

    if (type === 'category') {
      const category = await prisma.category.findUnique({
        where: { slug: id },
      });

      if (!category) {
        return res.json(FALLBACK_META);
      }

      const listingCount = await prisma.listing.count({
        where: { categoryId: category.id, isActive: true },
      });

      const url = `${SITE_URL}/category/${category.slug}`;

      return res.json({
        title: `${category.nameFa} - ${category.name} | ${SITE_NAME}`,
        description: `مشاهده ${listingCount} کسب‌وکار در دسته ${category.nameFa} - ${SITE_NAME}`,
        image: DEFAULT_IMAGE,
        url,
        type: 'CollectionPage',
        jsonLd: {
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          name: `${category.nameFa} - ${category.name}`,
          description: `لیست مشاغل ایرانی در دسته ${category.nameFa}`,
          url,
          numberOfItems: listingCount,
          isPartOf: {
            '@type': 'WebSite',
            name: SITE_NAME,
            url: SITE_URL,
          },
        },
      });
    }

    res.json(FALLBACK_META);
  } catch (error) {
    console.error('Meta API error:', error);
    res.json(FALLBACK_META);
  }
});

export default router;
