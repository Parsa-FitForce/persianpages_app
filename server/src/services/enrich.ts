import { PrismaClient } from '@prisma/client';
import { resolve } from 'path';

export interface EnrichOptions {
  limit?: number;
  city?: string;
  dryRun?: boolean;
  id?: string;
  force?: boolean;
}

export interface EnrichStats {
  total: number;
  scraped: number;
  descriptionsUpdated: number;
  titlesFixed: number;
  photosAdded: number;
  socialLinksAdded: number;
  websitesDiscovered: number;
  phonesUpdated: number;
  hoursUpdated: number;
  failed: number;
  details: string[];
}

export async function enrichListings(
  prisma: PrismaClient,
  options: EnrichOptions,
): Promise<EnrichStats> {
  const scriptPath = resolve(__dirname, '../../scripts/enrich.js');
  const mod = require(scriptPath);
  return mod.enrichListings(prisma, options);
}
