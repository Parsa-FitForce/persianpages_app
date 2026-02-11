import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { authenticate } from '../middleware/auth.js';
import { normalizePhone, maskPhone, isValidE164 } from '../utils/phone.js';
import { generateOTP, sendSms, sendVoiceCall } from '../services/twilio.js';

const router = Router();
const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

// Get masked phone for a listing (claim flow)
router.get('/phone-hint/:listingId', authenticate, async (req: Request, res: Response) => {
  try {
    const listing = await prisma.listing.findUnique({
      where: { id: req.params.listingId },
      select: { phone: true, isClaimed: true },
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

    res.json({ maskedPhone: maskPhone(listing.phone) });
  } catch (error) {
    console.error('Phone hint error:', error);
    res.status(500).json({ error: 'خطا در دریافت اطلاعات' });
  }
});

// Send OTP
router.post('/send', authenticate, async (req: Request, res: Response) => {
  try {
    const { phone, channel = 'sms', listingId } = req.body;

    if (!phone) {
      return res.status(400).json({ error: 'شماره تلفن الزامی است' });
    }

    const normalized = normalizePhone(phone);

    if (!isValidE164(normalized)) {
      return res.status(400).json({ error: 'شماره تلفن باید با + شروع شود و فرمت بین‌المللی داشته باشد' });
    }

    if (channel !== 'sms' && channel !== 'call') {
      return res.status(400).json({ error: 'روش ارسال نامعتبر است' });
    }

    // Rate limit: max 3 OTPs in 10 minutes per user
    const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000);
    const recentCount = await prisma.phoneVerification.count({
      where: {
        userId: req.user!.id,
        createdAt: { gte: tenMinAgo },
      },
    });

    if (recentCount >= 3) {
      return res.status(429).json({ error: 'تعداد درخواست‌ها بیش از حد مجاز است. لطفا ۱۰ دقیقه صبر کنید' });
    }

    // If claiming, verify phone matches listing
    if (listingId) {
      const listing = await prisma.listing.findUnique({
        where: { id: listingId },
        select: { phone: true, isClaimed: true },
      });

      if (!listing) {
        return res.status(404).json({ error: 'کسب‌وکار یافت نشد' });
      }

      if (listing.isClaimed) {
        return res.status(400).json({ error: 'این کسب‌وکار قبلا ثبت شده است' });
      }

      if (!listing.phone) {
        return res.status(400).json({ error: 'این کسب‌وکار شماره تلفن ندارد' });
      }

      if (normalizePhone(listing.phone) !== normalized) {
        return res.status(400).json({ error: 'شماره تلفن وارد شده با شماره کسب‌وکار مطابقت ندارد' });
      }
    }

    const code = generateOTP();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    await prisma.phoneVerification.create({
      data: {
        phone: normalized,
        code,
        channel,
        expiresAt,
        userId: req.user!.id,
        listingId: listingId || null,
      },
    });

    // Send OTP via Twilio
    if (channel === 'call') {
      await sendVoiceCall(normalized, code);
    } else {
      await sendSms(normalized, code);
    }

    res.json({ message: 'کد تایید ارسال شد', expiresAt: expiresAt.toISOString() });
  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({ error: 'خطا در ارسال کد تایید' });
  }
});

// Confirm OTP
router.post('/confirm', authenticate, async (req: Request, res: Response) => {
  try {
    const { phone, code } = req.body;

    if (!phone || !code) {
      return res.status(400).json({ error: 'شماره تلفن و کد تایید الزامی است' });
    }

    const normalized = normalizePhone(phone);

    // Find most recent unverified verification for this user + phone
    const verification = await prisma.phoneVerification.findFirst({
      where: {
        userId: req.user!.id,
        phone: normalized,
        verified: false,
        expiresAt: { gte: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!verification) {
      return res.status(400).json({ error: 'کد تایید منقضی شده یا یافت نشد. لطفا دوباره درخواست کنید' });
    }

    if (verification.attempts >= 5) {
      return res.status(400).json({ error: 'تعداد تلاش‌ها بیش از حد مجاز است. لطفا کد جدید درخواست کنید' });
    }

    // Increment attempts
    await prisma.phoneVerification.update({
      where: { id: verification.id },
      data: { attempts: { increment: 1 } },
    });

    if (verification.code !== code) {
      return res.status(400).json({ error: 'کد تایید اشتباه است' });
    }

    // Mark as verified
    await prisma.phoneVerification.update({
      where: { id: verification.id },
      data: { verified: true },
    });

    // Generate verification token (15 min)
    const verificationToken = jwt.sign(
      {
        userId: req.user!.id,
        phone: normalized,
        verificationId: verification.id,
      },
      JWT_SECRET,
      { expiresIn: '15m' }
    );

    res.json({ verificationToken });
  } catch (error) {
    console.error('Confirm OTP error:', error);
    res.status(500).json({ error: 'خطا در تایید کد' });
  }
});

export default router;
