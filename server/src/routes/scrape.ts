import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { runScrape } from '../../scripts/scrape.js';

const router = Router();
const prisma = new PrismaClient();

// POST /api/scrape
// Protected by SCRAPE_API_KEY header check
// Body: { city?: string, limit?: number, dryRun?: boolean, country?: string }
router.post('/', async (req: Request, res: Response) => {
  const apiKey = req.headers['x-scrape-key'];
  const expectedKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey || apiKey !== expectedKey) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { city, limit = 10, dryRun = false, country } = req.body;

  try {
    const result = await runScrape(prisma, { city, limit, dryRun, country });
    res.json(result);
  } catch (err: any) {
    console.error('Scrape error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
