import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

const source = await readFile(new URL('../src/utils/businessHours.ts', import.meta.url), 'utf8');
const output = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2020,
  },
}).outputText;

const temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), 'persianpages-hours-'));
const modulePath = path.join(temporaryDirectory, 'businessHours.mjs');

try {
  await writeFile(modulePath, output);
  const { openingHoursSpecification } = await import(pathToFileURL(modulePath).href);

  assert.deepEqual(openingHoursSpecification({
    friday: { open: '11:00', close: '21:00' },
    sunday: { open: '11:00', close: '19:00' },
  }), [
    {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: 'Friday',
      opens: '11:00',
      closes: '21:00',
    },
    {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: 'Sunday',
      opens: '11:00',
      closes: '19:00',
    },
  ]);

  assert.deepEqual(openingHoursSpecification({ monday: '09:00 - 17:00' }), [{
    '@type': 'OpeningHoursSpecification',
    dayOfWeek: 'Monday',
    opens: '09:00',
    closes: '17:00',
  }]);

  assert.equal(openingHoursSpecification({ monday: 'closed' }), undefined);
  assert.equal(openingHoursSpecification({ monday: { open: '09:00' } }), undefined);
  assert.equal(openingHoursSpecification(undefined), undefined);

  console.log('Business-hours structured data checks passed.');
} finally {
  await rm(temporaryDirectory, { recursive: true, force: true });
}
