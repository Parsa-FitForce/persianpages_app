import https from 'https';

const BOT_UA_PATTERN = /googlebot|google-inspectiontool|adsbot-google|mediapartners-google|storebot-google|googleother|bingbot|yandex|baiduspider|facebookexternalhit|twitterbot|linkedinbot|slackbot|whatsapp|telegrambot|applebot|duckduckbot|seznambot|pinterestbot/i;

// Each entry returns a distinct metaPath so no two routes dedupe.
// Ordering matters: more-specific patterns must come before generic ones.
const ROUTE_PATTERNS = [
  { pattern: /^\/listing\/([^/]+)\/?$/,
    build: (m) => ({ type: 'listing', metaPath: `/api/meta/listing/${m[1]}` }) },
  { pattern: /^\/category\/([^/]+)\/?$/,
    build: (m) => ({ type: 'category', metaPath: `/api/meta/category/${m[1]}` }) },
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

function parseRoute(uri) {
  for (const route of ROUTE_PATTERNS) {
    const match = uri.match(route.pattern);
    if (match) {
      return route.build(match);
    }
  }
  if (uri === '/' || uri === '/index.html') {
    return { type: 'home' };
  }
  // Strip trailing slash for static-page lookup
  const normalized = uri.length > 1 && uri.endsWith('/') ? uri.slice(0, -1) : uri;
  if (STATIC_PAGES[normalized]) {
    return { type: 'static', staticPath: normalized };
  }
  return null;
}

function getHeader(request, name) {
  const header = request.headers[name.toLowerCase()];
  if (header && header.length > 0) {
    return header[0].value;
  }
  return '';
}

function isBot(ua) {
  return BOT_UA_PATTERN.test(ua);
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
      timeout: 3000,
      headers: { 'Accept': 'application/json' },
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
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
      timeout: 3000,
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => resolve(body));
    });

    req.on('error', () => resolve(null));
    req.on('timeout', () => { req.destroy(); resolve(null); });
    req.end();
  });
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

  // Robots directive (override the static index.html default of "index, follow")
  if (data.noindex) {
    tags.push(`<meta name="robots" content="noindex, follow">`);
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

const HOMEPAGE_META = {
  title: 'PersianPages | دایرکتوری مشاغل ایرانی',
  description: 'دایرکتوری آنلاین مشاغل ایرانی در کانادا - رستوران، پزشک، وکیل، املاک و خدمات ایرانی',
  image: 'https://persianpages.com/og-default.png',
  url: 'https://persianpages.com',
  type: 'website',
  jsonLd: {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'PersianPages',
    url: 'https://persianpages.com',
    description: 'دایرکتوری آنلاین مشاغل ایرانی در کانادا',
  },
};

export async function handler(event) {
  const response = event.Records[0].cf.response;
  const request = event.Records[0].cf.request;

  // Parse the URI to determine page type
  const route = parseRoute(request.uri);
  if (!route) {
    return response;
  }

  // Check if it's a bot (User-Agent is forwarded via CloudFront config)
  const ua = getHeader(request, 'user-agent');
  if (!isBot(ua)) {
    return response;
  }

  // For SPA routes, S3 returns 403/404 because the path doesn't exist as a file.
  // CloudFront's custom_error_response would normally handle this, but Lambda@Edge
  // origin-response runs BEFORE custom error pages are applied.
  // So we need to handle both cases:
  //   - 200 with HTML body (direct hit on index.html or /)
  //   - 403/404 from S3 (SPA route like /listing/abc123)
  const isSpaFallback = response.status === '403' || response.status === '404';
  const isDirectHtml = response.status === '200' && isHtmlResponse(response);

  if (!isSpaFallback && !isDirectHtml) {
    return response;
  }

  // Fetch meta data
  let data;
  if (route.type === 'home') {
    data = HOMEPAGE_META;
  } else if (route.type === 'static') {
    data = STATIC_PAGES[route.staticPath];
  } else {
    data = await fetchJson('api.persianpages.com', route.metaPath);
  }

  if (!data) {
    return response;
  }

  // Get the HTML body — either from the response (200) or fetch index.html
  let html;
  if (isDirectHtml && response.body) {
    html = response.body;
  } else if (isSpaFallback) {
    // Fetch index.html through CloudFront itself (S3 is private/OAC-only)
    html = await fetchHtml('persianpages.com', '/index.html');
    if (!html) {
      return response;
    }
  } else {
    return response;
  }

  // Inject meta tags and return enriched HTML
  const enrichedHtml = injectMeta(html, data);

  response.status = '200';
  response.statusDescription = 'OK';
  response.body = enrichedHtml;
  response.headers['content-type'] = [{ key: 'Content-Type', value: 'text/html; charset=utf-8' }];
  // Remove content-length since body size changed
  delete response.headers['content-length'];

  return response;
}
