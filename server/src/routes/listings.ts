import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { authenticate, optionalAuth } from '../middleware/auth.js';
import { normalizePhone, toE164 } from '../utils/phone.js';
import { generateUniqueSlug } from '../utils/slug.js';

const router = Router();
const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

// Get all listings (with search & filters)
router.get('/', optionalAuth, async (req: Request, res: Response) => {
  try {
    const {
      search,
      category,
      city,
      country,
      page = '1',
      limit = '12',
    } = req.query;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    const where: any = { isActive: true };

    if (search) {
      where.OR = [
        { title: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    if (category) {
      where.category = { slug: category as string };
    }

    if (city) {
      where.city = { contains: city as string, mode: 'insensitive' };
    }

    if (country) {
      where.country = { contains: country as string, mode: 'insensitive' };
    }

    const [listings, total] = await Promise.all([
      prisma.listing.findMany({
        where,
        include: {
          category: true,
          user: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.listing.count({ where }),
    ]);

    res.json({
      listings,
      pagination: {
        page: parseInt(page as string),
        limit: take,
        total,
        pages: Math.ceil(total / take),
      },
    });
  } catch (error) {
    console.error('Get listings error:', error);
    res.status(500).json({ error: 'خطا در دریافت کسب‌وکارها' });
  }
});

// Get single listing (by slug or id)
router.get('/:idOrSlug', async (req: Request, res: Response) => {
  try {
    const param = req.params.idOrSlug;
    const include = {
      category: true,
      user: { select: { id: true, name: true } },
    };

    // Try slug first, then fall back to id
    let listing = await prisma.listing.findUnique({
      where: { slug: param },
      include,
    });

    if (!listing) {
      listing = await prisma.listing.findUnique({
        where: { id: param },
        include,
      });
    }

    if (!listing) {
      return res.status(404).json({ error: 'کسب‌وکار یافت نشد' });
    }

    res.json(listing);
  } catch (error) {
    console.error('Get listing error:', error);
    res.status(500).json({ error: 'خطا در دریافت کسب‌وکار' });
  }
});

// Create listing (auth required)
router.post('/', authenticate, async (req: Request, res: Response) => {
  try {
    const {
      title,
      description,
      categoryId,
      phone,
      address,
      city,
      country,
      website,
      socialLinks,
      businessHours,
      photos,
      latitude,
      longitude,
      placeId,
    } = req.body;

    if (!title || !description || !categoryId || !address || !city || !country || !phone) {
      return res.status(400).json({ error: 'لطفا فیلدهای الزامی را پر کنید (تلفن الزامی است)' });
    }

    // Normalize phone to E.164
    const normalizedPhone = toE164(phone) || phone;

    const category = await prisma.category.findUnique({ where: { id: categoryId } });
    if (!category) {
      return res.status(400).json({ error: 'دسته‌بندی نامعتبر است' });
    }

    const slug = await generateUniqueSlug(prisma, title, city);

    const listing = await prisma.listing.create({
      data: {
        title,
        description,
        phone: normalizedPhone,
        address,
        city,
        country,
        website,
        socialLinks,
        businessHours,
        photos: photos || [],
        userId: req.user!.id,
        categoryId,
        latitude: latitude ? parseFloat(latitude) : undefined,
        longitude: longitude ? parseFloat(longitude) : undefined,
        placeId,
        slug,
      },
      include: {
        category: true,
        user: { select: { id: true, name: true } },
      },
    });

    res.status(201).json(listing);
  } catch (error) {
    console.error('Create listing error:', error);
    res.status(500).json({ error: 'خطا در ایجاد کسب‌وکار' });
  }
});

// Update listing (auth + owner required)
router.put('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const existing = await prisma.listing.findUnique({
      where: { id: req.params.id },
    });

    if (!existing) {
      return res.status(404).json({ error: 'کسب‌وکار یافت نشد' });
    }

    if (existing.userId !== req.user!.id) {
      return res.status(403).json({ error: 'شما اجازه ویرایش این کسب‌وکار را ندارید' });
    }

    const {
      title,
      description,
      categoryId,
      phone,
      address,
      city,
      country,
      website,
      socialLinks,
      businessHours,
      photos,
      isActive,
      latitude,
      longitude,
      placeId,
      verificationToken,
    } = req.body;

    // Normalize phone to E.164 if provided
    const normalizedPhone = phone ? (toE164(phone) || phone) : undefined;

    // If phone changed, reset phoneVerified
    let phoneVerified = undefined;
    if (normalizedPhone !== undefined && normalizePhone(normalizedPhone) !== normalizePhone(existing.phone || '')) {
      phoneVerified = false;
    }

    // If verification token provided, verify and mark phone as verified
    if (verificationToken) {
      try {
        const decoded = jwt.verify(verificationToken, JWT_SECRET) as {
          userId: string;
          phone: string;
          verificationId: string;
        };

        if (decoded.userId !== req.user!.id) {
          return res.status(403).json({ error: 'توکن تایید نامعتبر است' });
        }

        const currentPhone = normalizedPhone || existing.phone;
        if (currentPhone && normalizePhone(decoded.phone) !== normalizePhone(currentPhone)) {
          return res.status(400).json({ error: 'شماره تلفن با شماره تایید شده مطابقت ندارد' });
        }

        const verification = await prisma.phoneVerification.findUnique({
          where: { id: decoded.verificationId },
        });

        if (!verification || !verification.verified) {
          return res.status(400).json({ error: 'تایید تلفن انجام نشده است' });
        }

        phoneVerified = true;
      } catch (err) {
        return res.status(400).json({ error: 'توکن تایید منقضی شده یا نامعتبر است' });
      }
    }

    // Regenerate slug if title or city changed
    let newSlug = undefined;
    const newTitle = title || existing.title;
    const newCity = city || existing.city;
    if ((title && title !== existing.title) || (city && city !== existing.city)) {
      newSlug = await generateUniqueSlug(prisma, newTitle, newCity, existing.id);
    }

    const listing = await prisma.listing.update({
      where: { id: req.params.id },
      data: {
        title,
        description,
        categoryId,
        phone: normalizedPhone,
        address,
        city,
        country,
        website,
        socialLinks,
        businessHours,
        photos,
        isActive,
        phoneVerified,
        ...(newSlug && { slug: newSlug }),
        latitude: latitude !== undefined ? (latitude ? parseFloat(latitude) : null) : undefined,
        longitude: longitude !== undefined ? (longitude ? parseFloat(longitude) : null) : undefined,
        placeId: placeId !== undefined ? (placeId || null) : undefined,
      },
      include: {
        category: true,
        user: { select: { id: true, name: true } },
      },
    });

    res.json(listing);
  } catch (error) {
    console.error('Update listing error:', error);
    res.status(500).json({ error: 'خطا در ویرایش کسب‌وکار' });
  }
});

// Delete listing (auth + owner required)
router.delete('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const existing = await prisma.listing.findUnique({
      where: { id: req.params.id },
    });

    if (!existing) {
      return res.status(404).json({ error: 'کسب‌وکار یافت نشد' });
    }

    if (existing.userId !== req.user!.id) {
      return res.status(403).json({ error: 'شما اجازه حذف این کسب‌وکار را ندارید' });
    }

    await prisma.listing.delete({ where: { id: req.params.id } });
    res.json({ message: 'کسب‌وکار با موفقیت حذف شد' });
  } catch (error) {
    console.error('Delete listing error:', error);
    res.status(500).json({ error: 'خطا در حذف کسب‌وکار' });
  }
});

// Claim a scraped business (auth + phone verification required)
router.post('/:id/claim', authenticate, async (req: Request, res: Response) => {
  try {
    const listing = await prisma.listing.findUnique({
      where: { id: req.params.id },
    });

    if (!listing) {
      return res.status(404).json({ error: 'کسب‌وکار یافت نشد' });
    }

    if (listing.isClaimed) {
      return res.status(400).json({ error: 'این کسب‌وکار قبلا ثبت شده است' });
    }

    if (!listing.phone) {
      return res.status(400).json({ error: 'این کسب‌وکار شماره تلفن ندارد و امکان تایید مالکیت وجود ندارد' });
    }

    // Verify phone verification token
    const { verificationToken } = req.body;
    if (!verificationToken) {
      return res.status(400).json({ error: 'تایید شماره تلفن الزامی است' });
    }

    try {
      const decoded = jwt.verify(verificationToken, JWT_SECRET) as {
        userId: string;
        phone: string;
        verificationId: string;
      };

      if (decoded.userId !== req.user!.id) {
        return res.status(403).json({ error: 'توکن تایید نامعتبر است' });
      }

      if (normalizePhone(decoded.phone) !== normalizePhone(listing.phone)) {
        return res.status(400).json({ error: 'شماره تلفن تایید شده با شماره کسب‌وکار مطابقت ندارد' });
      }

      const verification = await prisma.phoneVerification.findUnique({
        where: { id: decoded.verificationId },
      });

      if (!verification || !verification.verified) {
        return res.status(400).json({ error: 'تایید تلفن انجام نشده است' });
      }
    } catch (err) {
      return res.status(400).json({ error: 'توکن تایید منقضی شده یا نامعتبر است' });
    }

    const claimed = await prisma.listing.update({
      where: { id: req.params.id },
      data: {
        userId: req.user!.id,
        isClaimed: true,
        claimedAt: new Date(),
      },
      include: {
        category: true,
        user: { select: { id: true, name: true } },
      },
    });

    res.json(claimed);
  } catch (error) {
    console.error('Claim listing error:', error);
    res.status(500).json({ error: 'خطا در ثبت مالکیت کسب‌وکار' });
  }
});

// Get user's listings
router.get('/user/me', authenticate, async (req: Request, res: Response) => {
  try {
    const listings = await prisma.listing.findMany({
      where: { userId: req.user!.id },
      include: { category: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(listings);
  } catch (error) {
    console.error('Get user listings error:', error);
    res.status(500).json({ error: 'خطا در دریافت کسب‌وکارهای شما' });
  }
});

export default router;
