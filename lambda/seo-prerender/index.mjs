import https from 'https';

const REQUEST_TIMEOUT_MS = 10000;
const SHELL_CACHE_TTL_MS = 60000;
const HTTPS_AGENT = new https.Agent({ keepAlive: true, maxSockets: 4 });
let cachedShellHtml = null;
let cachedShellAt = 0;
let shellRequest = null;

// Ordering matters: more-specific patterns must come before generic ones.
const ROUTE_PATTERNS = [
  { pattern: /^\/listing\/([^/]+)\/?$/,
    build: (m) => ({ type: 'listing', metaPath: `/api/meta/listing/${m[1]}` }) },
  { pattern: /^\/browse\/([a-z]{2})\/category\/([^/]+)\/?$/,
    build: (m) => ({ type: 'browse-country-category', metaPath: `/api/meta/browse/${m[1]}/category/${m[2]}` }) },
  { pattern: /^\/browse\/([a-z]{2})\/([^/]+)\/([^/]+)\/?$/,
    build: (m) => ({ type: 'browse-city-category', metaPath: `/api/meta/browse/${m[1]}/${m[2]}/${m[3]}` }) },
  { pattern: /^\/browse\/([a-z]{2})\/([^/]+)\/?$/,
    build: (m) => ({ type: 'browse-city', metaPath: `/api/meta/browse/${m[1]}/${m[2]}` }) },
  { pattern: /^\/browse\/([a-z]{2})\/?$/,
    build: (m) => ({ type: 'browse-country', metaPath: `/api/meta/browse/${m[1]}` }) },
];

const STATIC_PAGES = {
  '/select-country': {
    title: 'انتخاب کشور | PersianPages',
    description: 'کشور خود را انتخاب کنید و کسب‌وکارهای ایرانی نزدیک خود را پیدا کنید.',
    url: 'https://persianpages.com/select-country',
    type: 'website',
    noindex: true,
    bodyHtml: '<main><h1>کسب‌وکارهای ایرانی را بر اساس کشور پیدا کنید</h1><p>کشور مورد نظر را برای مشاهده شهرها، دسته‌بندی‌ها و اطلاعات تماس کسب‌وکارهای ایرانی انتخاب کنید.</p><nav aria-label="کشورها"><ul><li><a href="/browse/us">آمریکا</a></li><li><a href="/browse/ca">کانادا</a></li><li><a href="/browse/gb">انگلستان</a></li><li><a href="/browse/ae">امارات</a></li><li><a href="/browse/es">اسپانیا</a></li><li><a href="/browse/se">سوئد</a></li><li><a href="/browse/it">ایتالیا</a></li></ul></nav><p><a href="/">بازگشت به صفحه اصلی</a></p></main>',
  },
  '/terms': {
    title: 'Terms & Conditions | شرایط استفاده | PersianPages',
    description: 'PersianPages terms and conditions of use.',
    url: 'https://persianpages.com/terms',
    type: 'website',
    noindex: true,
  },
  '/privacy': {
    title: 'Privacy Policy | حریم خصوصی | PersianPages',
    description: 'PersianPages privacy policy - how we collect, use, and protect your personal information.',
    url: 'https://persianpages.com/privacy',
    type: 'website',
    noindex: true,
  },
};

const NOINDEX_PATTERNS = [
  /^\/search\/?$/,
  /^\/login\/?$/,
  /^\/register\/?$/,
  /^\/auth\/callback\/?$/,
  /^\/forgot-password\/?$/,
  /^\/reset-password\/?$/,
  /^\/verify-email\/?$/,
  /^\/dashboard\/?$/,
  /^\/settings\/?$/,
  /^\/listings\/new\/?$/,
  /^\/listings\/[^/]+\/edit\/?$/,
];

const NOT_FOUND_META = {
  title: 'صفحه یافت نشد | PersianPages',
  description: 'صفحه مورد نظر پیدا نشد.',
  url: 'https://persianpages.com/404',
  type: 'website',
  noindex: true,
  statusCode: 404,
  bodyHtml: '<main><h1>صفحه یافت نشد</h1><p><a href="/">بازگشت به صفحه اصلی</a></p></main>',
};

function parseRoute(uri) {
  for (const route of ROUTE_PATTERNS) {
    const match = uri.match(route.pattern);
    if (match) {
      return route.build(match);
    }
  }
  if (uri === '/' || uri === '/index.html') {
    return { type: 'home', metaPath: '/api/meta/home' };
  }
  // Strip trailing slash for static-page lookup
  const normalized = uri.length > 1 && uri.endsWith('/') ? uri.slice(0, -1) : uri;
  if (STATIC_PAGES[normalized]) {
    return { type: 'static', staticPath: normalized };
  }
  if (NOINDEX_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return { type: 'noindex', staticPath: normalized };
  }
  return null;
}

function isHtmlResponse(response) {
  const contentType = response.headers['content-type'];
  if (contentType && contentType.length > 0) {
    return contentType[0].value.includes('text/html');
  }
  return false;
}

function fetchJson(hostname, path) {
  return new Promise((resolve) => {
    const options = {
      hostname,
      port: 443,
      path,
      method: 'GET',
      timeout: REQUEST_TIMEOUT_MS,
      agent: HTTPS_AGENT,
      headers: { 'Accept': 'application/json' },
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 300) {
          resolve(null);
          return;
        }
        try {
          const parsed = JSON.parse(body);
          resolve({
            ...parsed,
            statusCode: parsed.statusCode || res.statusCode,
          });
        } catch {
          resolve(null);
        }
      });
    });

    req.on('error', () => resolve(null));
    req.on('timeout', () => { req.destroy(); resolve(null); });
    req.end();
  });
}

function fetchHtml(hostname, path) {
  return new Promise((resolve) => {
    const options = {
      hostname,
      port: 443,
      path,
      method: 'GET',
      timeout: REQUEST_TIMEOUT_MS,
      agent: HTTPS_AGENT,
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        if (
          res.statusCode === 200
          && body.includes('<div id="root"></div>')
          && body.includes('</html>')
        ) {
          resolve(body);
          return;
        }
        resolve(null);
      });
    });

    req.on('error', () => resolve(null));
    req.on('timeout', () => { req.destroy(); resolve(null); });
    req.end();
  });
}

async function getShellHtml() {
  if (cachedShellHtml && Date.now() - cachedShellAt < SHELL_CACHE_TTL_MS) {
    return cachedShellHtml;
  }
  if (!shellRequest) {
    shellRequest = fetchHtml('persianpages.com', '/index.html')
      .then((html) => {
        if (html) {
          cachedShellHtml = html;
          cachedShellAt = Date.now();
        }
        return html;
      })
      .finally(() => {
        shellRequest = null;
      });
  }
  return shellRequest;
}

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function buildMetaTags(data) {
  const tags = [];

  tags.push(`<title>${escapeHtml(data.title)}</title>`);
  tags.push(`<meta name="description" content="${escapeHtml(data.description)}">`);

  // Open Graph
  tags.push(`<meta property="og:title" content="${escapeHtml(data.title)}">`);
  tags.push(`<meta property="og:description" content="${escapeHtml(data.description)}">`);
  tags.push(`<meta property="og:url" content="${escapeHtml(data.url)}">`);
  tags.push(`<meta property="og:type" content="${data.type === 'LocalBusiness' ? 'business.business' : 'website'}">`);
  tags.push(`<meta property="og:site_name" content="PersianPages">`);
  if (data.image) {
    tags.push(`<meta property="og:image" content="${escapeHtml(data.image)}">`);
  }

  // Twitter Card
  tags.push(`<meta name="twitter:card" content="summary_large_image">`);
  tags.push(`<meta name="twitter:title" content="${escapeHtml(data.title)}">`);
  tags.push(`<meta name="twitter:description" content="${escapeHtml(data.description)}">`);
  if (data.image) {
    tags.push(`<meta name="twitter:image" content="${escapeHtml(data.image)}">`);
  }

  // Canonical URL
  tags.push(`<link rel="canonical" href="${escapeHtml(data.url)}">`);

  // Robots directive. Indexable pages intentionally omit a robots tag; private,
  // missing, and thin pages get explicit noindex signals here or via React Helmet.
  if (data.noindex) {
    tags.push(`<meta name="robots" content="noindex, ${data.nofollow ? 'nofollow' : 'follow'}">`);
  }

  // JSON-LD
  if (data.jsonLd) {
    tags.push(`<script type="application/ld+json">${JSON.stringify(data.jsonLd)}</script>`);
  }

  return tags.join('\n    ');
}

function injectMeta(html, data) {
  const metaTags = buildMetaTags(data);

  // Replace existing <title> if present
  html = html.replace(/<title>[^<]*<\/title>/, '');

  // Strip existing canonical / robots / description / OG / Twitter tags from
  // the static index.html so our per-route versions are the only signal.
  html = html.replace(/<link[^>]+rel=["']canonical["'][^>]*>\s*/gi, '');
  html = html.replace(/<meta[^>]+name=["']robots["'][^>]*>\s*/gi, '');
  html = html.replace(/<meta[^>]+name=["']description["'][^>]*>\s*/gi, '');
  html = html.replace(/<meta[^>]+property=["']og:[^"']+["'][^>]*>\s*/gi, '');
  html = html.replace(/<meta[^>]+name=["']twitter:[^"']+["'][^>]*>\s*/gi, '');

  // Inject after <head>
  const headMatch = html.match(/<head[^>]*>/i);
  if (headMatch) {
    const insertPos = headMatch.index + headMatch[0].length;
    html = html.slice(0, insertPos) + '\n    ' + metaTags + '\n' + html.slice(insertPos);
  }

  // Inject body content into the empty React root so bots see real HTML
  // (not just meta tags). Without this, Google sees thousands of pages
  // with identical empty bodies and treats them as thin/duplicate content.
  if (data.bodyHtml) {
    html = html.replace(
      /<div id="root"><\/div>/,
      `<div id="root">${data.bodyHtml}</div>`
    );
  }

  return html;
}

function buildStandaloneHtml(data) {
  const bodyHtml = data.bodyHtml || '<main><h1>PersianPages</h1><p><a href="/">بازگشت به صفحه اصلی</a></p></main>';
  return `<!doctype html>
<html lang="fa" dir="rtl">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    ${buildMetaTags(data)}
    <style>body{margin:0;background:#f8fafc;color:#172033;font-family:system-ui,-apple-system,sans-serif;line-height:1.8}main{max-width:72rem;margin:auto;padding:2rem}a{color:#164e9a}li{margin:.5rem 0}article{padding:1rem 0;border-bottom:1px solid #dbe3ee}</style>
  </head>
  <body><div id="root">${bodyHtml}</div></body>
</html>`;
}

function applyRenderedResponse(response, data, html, { shellFallback = false } = {}) {
  const statusCode = Number(data.statusCode) || 200;
  response.status = String(statusCode);
  response.statusDescription = statusCode === 404
    ? 'Not Found'
    : statusCode === 503
      ? 'Service Unavailable'
      : 'OK';
  response.body = html;
  response.headers['content-type'] = [{ key: 'Content-Type', value: 'text/html; charset=utf-8' }];
  response.headers['cache-control'] = [{
    key: 'Cache-Control',
    value: statusCode === 503
      ? 'no-store'
      : data.noindex
        ? 'public, max-age=300'
        : shellFallback
          ? 'public, max-age=60'
          : 'public, max-age=3600',
  }];
  if (statusCode === 503) {
    response.headers['retry-after'] = [{ key: 'Retry-After', value: '60' }];
  } else {
    delete response.headers['retry-after'];
  }
  delete response.headers['content-length'];
  return response;
}

export function createHandler({
  fetchJsonFn = fetchJson,
  getShellHtmlFn = getShellHtml,
} = {}) {
  return async function seoPrerenderHandler(event) {
    const response = event.Records[0].cf.response;
    const request = event.Records[0].cf.request;

    const isSpaFallback = response.status === '403' || response.status === '404';
    const isDirectHtml = response.status === '200' && isHtmlResponse(response);
    if (!isSpaFallback && !isDirectHtml) {
      return response;
    }

    const route = parseRoute(request.uri);

    let dataPromise;
    if (!route) {
      dataPromise = Promise.resolve({
        ...NOT_FOUND_META,
        url: `https://persianpages.com${request.uri}`,
      });
    } else if (route.type === 'static') {
      dataPromise = Promise.resolve(STATIC_PAGES[route.staticPath]);
    } else if (route.type === 'noindex') {
      dataPromise = Promise.resolve({
        title: 'PersianPages',
        description: 'PersianPages',
        url: `https://persianpages.com${route.staticPath}`,
        type: 'website',
        noindex: true,
        nofollow: true,
      });
    } else {
      dataPromise = fetchJsonFn('api.persianpages.com', route.metaPath);
    }

    // These network requests used to run sequentially inside a five-second
    // Lambda. On a cold edge invocation that regularly returned the raw S3 403
    // before either request finished. Run them together and retain a readable
    // standalone document if the app shell is temporarily unavailable.
    const [data, shellHtml] = await Promise.all([
      dataPromise,
      getShellHtmlFn(),
    ]);

    if (!data) {
      const transientData = {
        title: 'PersianPages temporarily unavailable',
        description: 'Please try this page again shortly.',
        url: `https://persianpages.com${request.uri}`,
        type: 'website',
        noindex: true,
        nofollow: true,
        statusCode: 503,
        bodyHtml: '<main><h1>صفحه موقتاً در دسترس نیست</h1><p>لطفاً کمی بعد دوباره تلاش کنید.</p></main>',
      };
      const transientHtml = shellHtml
        ? injectMeta(shellHtml, transientData)
        : buildStandaloneHtml(transientData);
      return applyRenderedResponse(response, transientData, transientHtml, {
        shellFallback: !shellHtml,
      });
    }

    const usedStandaloneShell = !shellHtml;
    const enrichedHtml = shellHtml
      ? injectMeta(shellHtml, data)
      : buildStandaloneHtml(data);

    return applyRenderedResponse(response, data, enrichedHtml, {
      shellFallback: usedStandaloneShell,
    });
  };
}

export const handler = createHandler();
