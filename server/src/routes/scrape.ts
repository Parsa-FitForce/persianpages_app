import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
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

export default router;
