import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import { runScrape, ScrapeResult } from '../services/scrape.js';

const router = Router();
const prisma = new PrismaClient();

// In-memory job tracking
const jobs: Map<string, { status: string; result?: ScrapeResult; error?: string }> = new Map();

// POST /api/scrape
// Starts scrape job asynchronously, returns job ID
router.post('/', (req: Request, res: Response) => {
  const apiKey = req.headers['x-scrape-key'];
  const expectedKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey || apiKey !== expectedKey) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { city, limit = 10, dryRun = false, country } = req.body;
  const jobId = `scrape-${Date.now()}`;

  jobs.set(jobId, { status: 'running' });

  // Fire and forget — runs in background
  runScrape(prisma, { city, limit, dryRun, country })
    .then(result => {
      jobs.set(jobId, { status: 'completed', result });
      console.log(`Scrape job ${jobId} completed: ${result.imported} imported for ${result.city}`);
    })
    .catch(err => {
      jobs.set(jobId, { status: 'failed', error: err.message });
      console.error(`Scrape job ${jobId} failed:`, err);
    });

  res.json({ jobId, status: 'started', city: city || 'auto' });
});

// GET /api/scrape/:jobId — check job status
router.get('/:jobId', (req: Request, res: Response) => {
  const apiKey = req.headers['x-scrape-key'];
  const expectedKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey || apiKey !== expectedKey) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const job = jobs.get(req.params.jobId);
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  res.json({ jobId: req.params.jobId, ...job });
});

// POST /api/scrape/fix-phones — one-time migration to normalize phone numbers to E.164
const countryHints: Record<string, string> = {
  'آمریکا': 'US', 'کانادا': 'CA', 'انگلستان': 'GB', 'آلمان': 'DE',
  'فرانسه': 'FR', 'استرالیا': 'AU', 'سوئد': 'SE', 'هلند': 'NL',
  'ترکیه': 'TR', 'امارات': 'AE', 'اتریش': 'AT', 'دانمارک': 'DK',
  'نروژ': 'NO', 'بلژیک': 'BE', 'ایتالیا': 'IT', 'اسپانیا': 'ES',
};

router.post('/fix-phones', async (req: Request, res: Response) => {
  const apiKey = req.headers['x-scrape-key'];
  const expectedKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey !== expectedKey) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const dryRun = req.body.dryRun === true;
  const listings = await prisma.listing.findMany({
    where: { phone: { not: null } },
    select: { id: true, phone: true, country: true, title: true },
  });

  let fixed = 0, alreadyOk = 0, failed = 0;
  const changes: string[] = [];

  for (const listing of listings) {
    const phone = listing.phone!;
    const cleaned = phone.replace(/[\s\-\(\)]/g, '');
    if (/^\+[1-9]\d{6,14}$/.test(cleaned)) { alreadyOk++; continue; }

    const hint = countryHints[listing.country] || undefined;
    const parsed = parsePhoneNumberFromString(phone, hint as any);
    if (parsed && parsed.isValid()) {
      const e164 = parsed.format('E.164');
      changes.push(`${listing.title}: "${phone}" → "${e164}"`);
      if (!dryRun) {
        await prisma.listing.update({ where: { id: listing.id }, data: { phone: e164 } });
      }
      fixed++;
    } else {
      changes.push(`FAILED: ${listing.title}: "${phone}"`);
      failed++;
    }
  }

  res.json({ dryRun, fixed, alreadyOk, failed, total: listings.length, changes });
});

export default router;
