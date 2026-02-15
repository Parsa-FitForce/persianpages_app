import { PrismaClient } from '@prisma/client';
import { resolve } from 'path';

export interface ScrapeOptions {
  city?: string;
  dryRun?: boolean;
  limit?: number;
  country?: string;
}

export interface ScrapeResult {
  city: string;
  googleResults: number;
  alreadyInDb: number;
  classified: number;
  persian: number;
  highConfidence: number;
  imported: number;
  filtered: number;
  listings: string[];
}

export async function runScrape(
  prisma: PrismaClient,
  options: ScrapeOptions,
): Promise<ScrapeResult> {
  // Resolve the compiled scrape script relative to the app root
  // In production: /app/scripts/scrape.js (esbuild-compiled)
  // In dev (tsx): resolves to scripts/scrape.ts
  const scriptPath = resolve(__dirname, '../../scripts/scrape.js');
  const mod = require(scriptPath);
  return mod.runScrape(prisma, options);
}
