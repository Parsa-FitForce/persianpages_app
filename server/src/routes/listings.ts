import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, optionalAuth, AuthRequest } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

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
    res.status(500).json({ error: 'خطا در دریافت آگهی‌ها' });
  }
});

// Get single listing
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const listing = await prisma.listing.findUnique({
      where: { id: req.params.id },
      include: {
        category: true,
        user: { select: { id: true, name: true } },
      },
    });

    if (!listing) {
      return res.status(404).json({ error: 'آگهی یافت نشد' });
    }

    res.json(listing);
  } catch (error) {
    console.error('Get listing error:', error);
    res.status(500).json({ error: 'خطا در دریافت آگهی' });
  }
});

// Create listing (auth required)
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
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
    } = req.body;

    if (!title || !description || !categoryId || !address || !city || !country) {
      return res.status(400).json({ error: 'لطفا فیلدهای الزامی را پر کنید' });
    }

    const category = await prisma.category.findUnique({ where: { id: categoryId } });
    if (!category) {
      return res.status(400).json({ error: 'دسته‌بندی نامعتبر است' });
    }

    const listing = await prisma.listing.create({
      data: {
        title,
        description,
        phone,
        address,
        city,
        country,
        website,
        socialLinks,
        businessHours,
        photos: photos || [],
        userId: req.user!.id,
        categoryId,
      },
      include: {
        category: true,
        user: { select: { id: true, name: true } },
      },
    });

    res.status(201).json(listing);
  } catch (error) {
    console.error('Create listing error:', error);
    res.status(500).json({ error: 'خطا در ایجاد آگهی' });
  }
});

// Update listing (auth + owner required)
router.put('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.listing.findUnique({
      where: { id: req.params.id },
    });

    if (!existing) {
      return res.status(404).json({ error: 'آگهی یافت نشد' });
    }

    if (existing.userId !== req.user!.id) {
      return res.status(403).json({ error: 'شما اجازه ویرایش این آگهی را ندارید' });
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
    } = req.body;

    const listing = await prisma.listing.update({
      where: { id: req.params.id },
      data: {
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
      },
      include: {
        category: true,
        user: { select: { id: true, name: true } },
      },
    });

    res.json(listing);
  } catch (error) {
    console.error('Update listing error:', error);
    res.status(500).json({ error: 'خطا در ویرایش آگهی' });
  }
});

// Delete listing (auth + owner required)
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.listing.findUnique({
      where: { id: req.params.id },
    });

    if (!existing) {
      return res.status(404).json({ error: 'آگهی یافت نشد' });
    }

    if (existing.userId !== req.user!.id) {
      return res.status(403).json({ error: 'شما اجازه حذف این آگهی را ندارید' });
    }

    await prisma.listing.delete({ where: { id: req.params.id } });
    res.json({ message: 'آگهی با موفقیت حذف شد' });
  } catch (error) {
    console.error('Delete listing error:', error);
    res.status(500).json({ error: 'خطا در حذف آگهی' });
  }
});

// Get user's listings
router.get('/user/me', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const listings = await prisma.listing.findMany({
      where: { userId: req.user!.id },
      include: { category: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(listings);
  } catch (error) {
    console.error('Get user listings error:', error);
    res.status(500).json({ error: 'خطا در دریافت آگهی‌های شما' });
  }
});

export default router;
