import fs from 'node:fs';
import path from 'node:path';

const clientRoot = path.resolve(import.meta.dirname, '..');
const filesToCheck = [
  path.join(clientRoot, 'index.html'),
  path.join(clientRoot, 'dist', 'index.html'),
].filter((file) => fs.existsSync(file));

const globalNoindexPattern = /<meta\s+[^>]*name=["']robots["'][^>]*content=["'][^"']*\bnoindex\b[^"']*["'][^>]*>/i;
const routeOwnedPatterns = [
  { label: 'canonical', pattern: /<link\s+[^>]*rel=["']canonical["'][^>]*>/i },
  { label: 'description', pattern: /<meta\s+[^>]*name=["']description["'][^>]*>/i },
  { label: 'Open Graph', pattern: /<meta\s+[^>]*property=["']og:[^"']+["'][^>]*>/i },
  { label: 'Twitter card', pattern: /<meta\s+[^>]*name=["']twitter:[^"']+["'][^>]*>/i },
];

let failed = false;

for (const file of filesToCheck) {
  const html = fs.readFileSync(file, 'utf8');
  const match = html.match(globalNoindexPattern);
  if (match) {
    failed = true;
    console.error(`SEO shell check failed: ${path.relative(clientRoot, file)} contains a global robots noindex tag:`);
    console.error(match[0]);
  }
  for (const { label, pattern } of routeOwnedPatterns) {
    const routeOwnedMatch = html.match(pattern);
    if (!routeOwnedMatch) continue;
    failed = true;
    console.error(`SEO shell check failed: ${path.relative(clientRoot, file)} contains route-owned ${label} metadata:`);
    console.error(routeOwnedMatch[0]);
  }
}

if (failed) {
  console.error('\nPublic indexable routes must not inherit noindex from the static app shell.');
  console.error('Use route-specific Helmet tags or the SEO prerender Lambda for private/error/thin pages instead.');
  process.exit(1);
}

console.log(`SEO shell check passed (${filesToCheck.length} file${filesToCheck.length === 1 ? '' : 's'} checked).`);
