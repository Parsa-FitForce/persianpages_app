import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import passport from '../config/passport.js';
import { authenticate, generateToken } from '../middleware/auth.js';
import { sendVerificationEmail, sendPasswordResetEmail } from '../services/email.js';

const router = Router();
const prisma = new PrismaClient();

const LOCKOUT_THRESHOLD = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

// Register
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'لطفا تمام فیلدها را پر کنید' });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'این ایمیل قبلا ثبت شده است' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const emailVerifyToken = crypto.randomUUID();
    const emailVerifyExp = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        emailVerifyToken,
        emailVerifyExp,
      },
    });

    // Send verification email (non-blocking)
    sendVerificationEmail(email, emailVerifyToken).catch((err) => {
      console.error('Failed to send verification email:', err);
    });

    const token = generateToken(user.id);
    res.status(201).json({
      user: { id: user.id, email: user.email, name: user.name, emailVerified: false },
      token,
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'خطا در ثبت نام' });
  }
});

// Login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'لطفا ایمیل و رمز عبور را وارد کنید' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.password) {
      return res.status(401).json({ error: 'ایمیل یا رمز عبور اشتباه است' });
    }

    // Check lockout
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      return res.status(429).json({ error: 'تعداد تلاش‌ها بیش از حد مجاز است. لطفا بعدا تلاش کنید' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      const failedLogins = user.failedLogins + 1;
      const updateData: any = { failedLogins };

      if (failedLogins >= LOCKOUT_THRESHOLD) {
        updateData.lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MS);
      }

      await prisma.user.update({ where: { id: user.id }, data: updateData });
      return res.status(401).json({ error: 'ایمیل یا رمز عبور اشتباه است' });
    }

    // Successful login — reset lockout counters
    if (user.failedLogins > 0 || user.lockedUntil) {
      await prisma.user.update({
        where: { id: user.id },
        data: { failedLogins: 0, lockedUntil: null },
      });
    }

    const token = generateToken(user.id);
    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        emailVerified: user.emailVerified,
        googleId: user.googleId || undefined,
      },
      token,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'خطا در ورود' });
  }
});

// Get current user
router.get('/me', authenticate, async (req: Request, res: Response) => {
  const user = req.user!;
  res.json({
    id: user.id,
    email: user.email,
    name: user.name,
    emailVerified: user.emailVerified,
    googleId: user.googleId || undefined,
    hasPassword: !!user.password,
  });
});

// Verify email
router.get('/verify-email', async (req: Request, res: Response) => {
  try {
    const { token } = req.query;
    if (!token || typeof token !== 'string') {
      return res.status(400).json({ error: 'توکن نامعتبر است' });
    }

    const user = await prisma.user.findFirst({
      where: {
        emailVerifyToken: token,
        emailVerifyExp: { gt: new Date() },
      },
    });

    if (!user) {
      return res.status(400).json({ error: 'لینک تایید نامعتبر یا منقضی شده است' });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerifyToken: null,
        emailVerifyExp: null,
      },
    });

    res.json({ message: 'ایمیل شما با موفقیت تایید شد' });
  } catch (error) {
    console.error('Verify email error:', error);
    res.status(500).json({ error: 'خطا در تایید ایمیل' });
  }
});

// Resend verification email
router.post('/resend-verification', authenticate, async (req: Request, res: Response) => {
  try {
    const user = req.user!;

    if (user.emailVerified) {
      return res.status(400).json({ error: 'ایمیل شما قبلا تایید شده است' });
    }

    // Rate limit: 1 per 2 minutes
    if (user.emailVerifyExp && user.emailVerifyExp > new Date(Date.now() - 2 * 60 * 1000)) {
      // Token was set less than 22 hours ago (24h - 2h buffer), check if it was recently resent
      const tokenAge = user.emailVerifyExp.getTime() - Date.now();
      // If token expires in more than 23h58m, it was just created/resent
      if (tokenAge > 24 * 60 * 60 * 1000 - 2 * 60 * 1000) {
        return res.status(429).json({ error: 'لطفا ۲ دقیقه صبر کنید و دوباره تلاش کنید' });
      }
    }

    const emailVerifyToken = crypto.randomUUID();
    const emailVerifyExp = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerifyToken, emailVerifyExp },
    });

    await sendVerificationEmail(user.email, emailVerifyToken);

    res.json({ message: 'ایمیل تایید مجددا ارسال شد' });
  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({ error: 'خطا در ارسال ایمیل تایید' });
  }
});

// Forgot password
router.post('/forgot-password', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'لطفا ایمیل خود را وارد کنید' });
    }

    // Always return success to avoid revealing account existence
    const successMsg = { message: 'اگر حساب کاربری با این ایمیل وجود داشته باشد، لینک بازیابی ارسال می‌شود' };

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.password) {
      return res.json(successMsg);
    }

    // Rate limit: check if a recent token exists (less than 20 min old)
    if (user.resetTokenExp && user.resetTokenExp > new Date(Date.now() + 40 * 60 * 1000)) {
      // Token expires in more than 40min means it was set less than 20min ago
      return res.json(successMsg);
    }

    const resetToken = crypto.randomUUID();
    const resetTokenExp = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.user.update({
      where: { id: user.id },
      data: { resetToken, resetTokenExp },
    });

    await sendPasswordResetEmail(user.email, resetToken);

    res.json(successMsg);
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'خطا در ارسال ایمیل بازیابی' });
  }
});

// Reset password
router.post('/reset-password', async (req: Request, res: Response) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ error: 'اطلاعات ناقص است' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'رمز عبور باید حداقل ۶ کاراکتر باشد' });
    }

    const user = await prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExp: { gt: new Date() },
      },
    });

    if (!user) {
      return res.status(400).json({ error: 'لینک بازیابی نامعتبر یا منقضی شده است' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExp: null,
        failedLogins: 0,
        lockedUntil: null,
      },
    });

    res.json({ message: 'رمز عبور با موفقیت تغییر کرد' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'خطا در تغییر رمز عبور' });
  }
});

// Update profile
router.put('/profile', authenticate, async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const { name, email } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'نام الزامی است' });
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'فرمت ایمیل نامعتبر است' });
    }

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedName = name.trim();

    // Google users cannot change their email
    if (trimmedEmail !== user.email && user.googleId) {
      return res.status(400).json({ error: 'ایمیل حساب‌های متصل به گوگل قابل تغییر نیست' });
    }

    // Check if email is taken by another user
    if (trimmedEmail !== user.email) {
      const existing = await prisma.user.findUnique({ where: { email: trimmedEmail } });
      if (existing) {
        return res.status(400).json({ error: 'این ایمیل قبلا ثبت شده است' });
      }
    }

    const updateData: any = { name: trimmedName };

    // If email changed, mark as unverified and send verification
    if (trimmedEmail !== user.email) {
      const emailVerifyToken = crypto.randomUUID();
      const emailVerifyExp = new Date(Date.now() + 24 * 60 * 60 * 1000);
      updateData.email = trimmedEmail;
      updateData.emailVerified = false;
      updateData.emailVerifyToken = emailVerifyToken;
      updateData.emailVerifyExp = emailVerifyExp;

      sendVerificationEmail(trimmedEmail, emailVerifyToken).catch((err) => {
        console.error('Failed to send verification email:', err);
      });
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: updateData,
    });

    res.json({
      id: updated.id,
      email: updated.email,
      name: updated.name,
      emailVerified: updated.emailVerified,
      googleId: updated.googleId || undefined,
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'خطا در بروزرسانی پروفایل' });
  }
});

// Change password
router.put('/change-password', authenticate, async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const { currentPassword, newPassword } = req.body;

    if (!user.password) {
      return res.status(400).json({ error: 'حساب شما با گوگل ایجاد شده و رمز عبوری ندارد' });
    }

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'لطفا تمام فیلدها را پر کنید' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'رمز عبور جدید باید حداقل ۶ کاراکتر باشد' });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'رمز عبور فعلی اشتباه است' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    res.json({ message: 'رمز عبور با موفقیت تغییر کرد' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'خطا در تغییر رمز عبور' });
  }
});

// Google OAuth
router.get(
  '/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/login' }),
  (req: Request, res: Response) => {
    const user = req.user as { id: string };
    const token = generateToken(user.id);
    // Redirect to frontend with token
    res.redirect(`${process.env.CLIENT_URL}/auth/callback?token=${token}`);
  }
);

export default router;
