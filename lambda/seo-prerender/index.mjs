import https from 'https';

const BOT_UA_PATTERN = /googlebot|bingbot|yandex|baiduspider|facebookexternalhit|twitterbot|linkedinbot|slackbot|whatsapp|telegrambot|applebot|duckduckbot|seznambot|pinterestbot/i;

const ROUTE_PATTERNS = [
  { pattern: /^\/listing\/([^/]+)\/?$/, type: 'listing', idIndex: 1 },
  { pattern: /^\/category\/([^/]+)\/?$/, type: 'category', idIndex: 1 },
];

function parseRoute(uri) {
  for (const route of ROUTE_PATTERNS) {
    const match = uri.match(route.pattern);
    if (match) {
      return { type: route.type, id: match[route.idIndex] };
    }
  }
  if (uri === '/' || uri === '/index.html') {
    return { type: 'home', id: '' };
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

  // Inject after <head>
  const headMatch = html.match(/<head[^>]*>/i);
  if (headMatch) {
    const insertPos = headMatch.index + headMatch[0].length;
    return html.slice(0, insertPos) + '\n    ' + metaTags + '\n' + html.slice(insertPos);
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
  } else {
    const apiHost = 'api.persianpages.com';
    data = await fetchJson(apiHost, `/api/meta/${route.type}/${route.id}`);
  }

  if (!data) {
    return response;
  }

  // Get the HTML body — either from the response (200) or fetch index.html from S3 (403/404)
  let html;
  if (isDirectHtml && response.body) {
    html = response.body;
  } else if (isSpaFallback) {
    // Fetch index.html from the S3 origin via CloudFront's own domain
    const s3Domain = request.origin.s3.domainName;
    html = await fetchHtml(s3Domain, '/index.html');
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
