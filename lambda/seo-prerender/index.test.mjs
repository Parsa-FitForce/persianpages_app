import assert from 'node:assert/strict';
import test from 'node:test';
import { createHandler } from './index.mjs';

const SHELL = '<!doctype html><html><head><title>App</title></head><body><div id="root"></div></body></html>';
const META = {
  title: 'کسب‌وکارهای ایرانی در آمریکا',
  description: 'راهنمای آزمایشی',
  url: 'https://persianpages.com/browse/us',
  type: 'website',
  bodyHtml: '<main><h1>کسب‌وکارهای ایرانی در آمریکا</h1></main>',
};

function event(uri = '/browse/us') {
  return {
    Records: [{
      cf: {
        request: { uri },
        response: {
          status: '403',
          statusDescription: 'Forbidden',
          headers: {
            'content-type': [{ key: 'Content-Type', value: 'application/xml' }],
            'content-length': [{ key: 'Content-Length', value: '111' }],
          },
        },
      },
    }],
  };
}

test('renders a dynamic route from metadata and the app shell', async () => {
  const handler = createHandler({
    fetchJsonFn: async () => META,
    getShellHtmlFn: async () => SHELL,
  });

  const response = await handler(event());

  assert.equal(response.status, '200');
  assert.match(response.body, /<main><h1>کسب‌وکارهای ایرانی در آمریکا<\/h1><\/main>/);
  assert.match(response.body, /rel="canonical" href="https:\/\/persianpages\.com\/browse\/us"/);
  assert.equal(response.headers['cache-control'][0].value, 'public, max-age=3600');
});

test('returns readable SSR HTML when the app shell fetch fails', async () => {
  const handler = createHandler({
    fetchJsonFn: async () => META,
    getShellHtmlFn: async () => null,
  });

  const response = await handler(event());

  assert.equal(response.status, '200');
  assert.match(response.body, /^<!doctype html>/);
  assert.match(response.body, /<main><h1>کسب‌وکارهای ایرانی در آمریکا<\/h1><\/main>/);
  assert.equal(response.headers['cache-control'][0].value, 'public, max-age=60');
});

test('returns a retryable 503 instead of leaking the S3 403 when metadata fails', async () => {
  const handler = createHandler({
    fetchJsonFn: async () => null,
    getShellHtmlFn: async () => SHELL,
  });

  const response = await handler(event());

  assert.equal(response.status, '503');
  assert.equal(response.headers['cache-control'][0].value, 'no-store');
  assert.equal(response.headers['retry-after'][0].value, '60');
  assert.match(response.body, /noindex, nofollow/);
  assert.match(response.body, /صفحه موقتاً در دسترس نیست/);
});

test('country selector is a noindex navigation utility', async () => {
  const handler = createHandler({
    fetchJsonFn: async () => {
      throw new Error('static routes must not fetch metadata');
    },
    getShellHtmlFn: async () => SHELL,
  });

  const response = await handler(event('/select-country'));

  assert.equal(response.status, '200');
  assert.match(response.body, /noindex, follow/);
});
