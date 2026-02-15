import express from 'express';
import cors from 'cors';
import passport from './config/passport.js';
import path from 'path';
import authRoutes from './routes/auth.js';
import listingsRoutes from './routes/listings.js';
import categoriesRoutes from './routes/categories.js';
import sitemapRoutes from './routes/sitemap.js';
import uploadRoutes, { UPLOADS_DIR } from './routes/upload.js';
import verificationRoutes from './routes/verification.js';
import metaRoutes from './routes/meta.js';
import scrapeRoutes from './routes/scrape.js';
import { PrismaClient } from '@prisma/client';

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 5000;

// Trust proxy (behind ALB)
app.set('trust proxy', 1);

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());
app.use(passport.initialize());
app.use('/uploads', express.static(UPLOADS_DIR));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/listings', listingsRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api', sitemapRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/verification', verificationRoutes);
app.use('/api/meta', metaRoutes);
app.use('/api/scrape', scrapeRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'سرور در حال اجرا است' });
});

// Start server
async function main() {
  try {
    await prisma.$connect();
    console.log('Connected to database');

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

main();
