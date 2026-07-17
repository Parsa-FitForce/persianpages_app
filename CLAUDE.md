# PersianPages App

Community/business directory for Persian-owned and Persian-serving businesses, with public search/browse pages, claimed listings, phone verification, SEO metadata, and scraping/enrichment admin tools.

## Quick Start

```bash
make up          # Start all services (Docker, background)
make dev         # Start all services (Docker, foreground with logs)
make down        # Stop all services
make db-push     # Push Prisma schema changes to DB
make db-seed     # Seed categories + scraped unclaimed listings
make db-reset    # Reset database and seed
make logs        # Tail all logs
make logs-server # Tail server logs only
make logs-client # Tail client logs only
make logs-db     # Tail Postgres logs only
```

Local app URLs:

- Client: http://localhost:3000
- Server: http://localhost:5001
- Postgres: localhost:5432, database `persianpages`
- Health check: http://localhost:5001/api/health

## Stack

| Layer | Tech |
|-------|------|
| Frontend | React 18 + Vite + TypeScript + Tailwind 3 |
| Backend | Express + TypeScript + Prisma ORM |
| Database | PostgreSQL 15 (Docker) |
| Auth | JWT in localStorage, bcrypt passwords, Google OAuth, email verification |
| Verification | Twilio Verify preferred, Twilio SMS/voice fallback |
| Maps/Search | Google Maps client key, Google Places/Yelp admin scraping keys |
| Uploads | Multer local disk in dev, optional S3 in production |
| Support | Shared support widget via `VITE_SUPPORT_URL` / `SUPPORT_SERVICE_URL` |

## Project Structure

```text
├── client/
│   ├── src/
│   │   ├── App.tsx                    # Routes, ProtectedRoute, GuestRoute, SupportChat
│   │   ├── main.tsx                   # Entry point; AuthProvider wraps App
│   │   ├── components/
│   │   │   ├── Header.tsx / Footer.tsx
│   │   │   ├── ListingCard.tsx / CategoryCard.tsx
│   │   │   ├── AddressAutocomplete.tsx # Google Maps/Places UI
│   │   │   ├── OtpVerifyModal.tsx      # Phone verification flow
│   │   │   └── SupportChat.tsx
│   │   ├── hooks/
│   │   │   ├── useAuth.tsx
│   │   │   └── useGoogleMaps.ts
│   │   ├── pages/
│   │   │   ├── Home.tsx / Search.tsx / BrowsePage.tsx
│   │   │   ├── ListingDetail.tsx / ListingForm.tsx
│   │   │   ├── Dashboard.tsx / Settings.tsx
│   │   │   ├── SelectCountry.tsx
│   │   │   └── Login.tsx / Register.tsx / AuthCallback.tsx / ForgotPassword.tsx / ResetPassword.tsx / VerifyEmail.tsx
│   │   ├── services/api.ts            # Axios instance + API wrappers
│   │   ├── types/index.ts
│   │   ├── utils/image.ts
│   │   └── utils/structuredData.ts
│   └── tailwind.config.js
├── server/
│   ├── prisma/
│   │   ├── schema.prisma              # User, Category, Listing, PhoneVerification
│   │   ├── seed.ts                    # Categories + scraped unclaimed listings
│   │   └── seed-data.ts
│   ├── scripts/                       # Scrape/enrich implementation used by services
│   └── src/
│       ├── index.ts                   # Express setup, CORS, route mounting
│       ├── config/passport.ts         # Google OAuth strategy
│       ├── middleware/auth.ts         # authenticate, optionalAuth, generateToken
│       ├── routes/
│       │   ├── auth.ts                # Password auth, Google OAuth, email verification
│       │   ├── listings.ts            # Public listing search/detail + owner CRUD + claim
│       │   ├── categories.ts
│       │   ├── verification.ts        # Twilio OTP send/confirm
│       │   ├── upload.ts              # Listing photo uploads
│       │   ├── sitemap.ts             # Sitemap XML endpoints + cache invalidation
│       │   ├── meta.ts                # SEO metadata endpoints
│       │   └── scrape.ts              # Admin scrape/enrich/fix endpoints
│       ├── services/
│       │   ├── email.ts
│       │   ├── twilio.ts
│       │   ├── scrape.ts
│       │   └── enrich.ts
│       └── utils/
│           ├── phone.ts
│           └── slug.ts
├── docker-compose.yml
└── Makefile
```

## Data Models

```text
User ──< Listing
User ──< PhoneVerification
Category ──< Listing
```

- `Listing.slug` is unique and is generated from title/city.
- `Listing.source` is `"user"` or `"scraped"`.
- Scraped listings are seeded/imported as `isClaimed: false`, `userId: null`.
- Claiming a scraped listing requires phone verification against the listing phone.
- User-owned listing create/edit normalizes phone numbers to E.164 where possible.

## API Routes

All API routes are under `/api` unless noted.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/register` | No | Register with email/password; sends verification email |
| POST | `/auth/login` | No | Login; 5 failed attempts locks for 15 minutes |
| GET | `/auth/me` | Yes | Current user |
| GET | `/auth/verify-email` | No | Verify email by query `token` |
| POST | `/auth/resend-verification` | Yes | Resend email verification |
| POST | `/auth/forgot-password` | No | Send reset email when account exists |
| POST | `/auth/reset-password` | No | Reset password by token |
| PUT | `/auth/profile` | Yes | Update name/email |
| PUT | `/auth/change-password` | Yes | Change password |
| GET | `/auth/google` | No | Start Google OAuth |
| GET | `/auth/google/callback` | No | Google OAuth callback |
| GET | `/categories` | No | List categories |
| GET | `/listings` | Optional | Public listing search/filter with pagination |
| GET | `/listings/:idOrSlug` | No | Listing detail by slug first, then id |
| POST | `/listings` | Yes | Create listing |
| PUT/DELETE | `/listings/:id` | Yes owner | Update/delete listing |
| POST | `/listings/:id/claim` | Yes | Claim scraped listing with verification token |
| GET | `/listings/user/me` | Yes | Current user's listings |
| GET | `/verification/phone-hint/:listingId` | Yes | Masked phone for claim flow |
| POST | `/verification/send` | Yes | Send OTP by SMS or call |
| POST | `/verification/confirm` | Yes | Confirm OTP and receive 15-minute verification token |
| POST | `/upload` | Yes | Upload up to 6 listing images |
| GET | `/sitemap.xml` and related sitemap routes | No | Sitemap XML |
| GET | `/meta/*` | No | SEO metadata for browse/listing pages |
| POST/GET | `/scrape/*` | Admin key | Scrape, enrich, backfill photos, fix phones |

## Key Patterns

### RTL/Farsi UI
- `body` is RTL by default in `client/src/index.css`.
- Farsi copy is common in UI and server errors; preserve Persian text when editing related flows.
- Fonts are `Vazirmatn` for Persian and `Inter` for Latin/mixed content.
- Primary theme is green (`primary-600` is `#16a34a`) on a light gray/white UI.

### Auth
- JWT is stored in `localStorage` under `token`.
- `useAuth()` owns user state and auth actions.
- Google OAuth is configured in `server/src/config/passport.ts` and returns through `/auth/callback`.
- Email verification and password reset use AWS SES helpers in `server/src/services/email.ts`.

### Listing Ownership and Claims
- Public listing detail accepts slug or id. Slug lookup runs first.
- Owner-only edits/deletes compare `listing.userId` with `req.user!.id`.
- If a listing phone changes, `phoneVerified` is reset unless a matching verification token is supplied.
- Claim flow uses `PhoneVerification` plus a short-lived JWT `verificationToken`.

### Phone Verification
- Twilio Verify is used when `TWILIO_VERIFY_SID` is set.
- Without Verify, the app falls back to generated OTP codes sent with Twilio Messaging/Voice.
- OTP send is rate-limited to 3 requests per user per 10 minutes.
- Confirmation allows 5 attempts and returns a 15-minute verification token.
- Phone numbers must be international/E.164 format for verification.

### Uploads
- `server/src/routes/upload.ts` uses S3 only when `S3_UPLOADS_BUCKET` is set.
- Without S3, files are written to `server/uploads` and served from `/uploads`.
- Upload field name is `photos`; max 6 images, 5 MB each.

### SEO and Sitemaps
- `server/src/routes/meta.ts` powers browse/listing metadata.
- `server/src/routes/sitemap.ts` serves sitemap XML and caches generated output.
- Listing create/update/delete invalidates the sitemap cache via `invalidateSitemapCache()`.
- Production sitemaps are served on the apex host via CloudFront to the API-backed sitemap routes. `robots.txt` should advertise only `https://persianpages.com/sitemap.xml`; avoid reintroducing deploy-time static sitemap generation.
- Do not add browse URLs by taking the Cartesian product of configured countries/cities/categories. Only sitemap combinations with active listings; empty combinations create thin, indexable pages at scale.
- Missing SPA routes must return a real 404 or a `noindex` error page. CloudFront's blanket 403/404-to-200 fallback otherwise creates soft 404s.
- Lambda@Edge dynamically prerenders public routes. Test the exact Googlebot HTML for homepage, listing, browse, empty, and missing URLs after SEO changes; do not rely only on browser-rendered React metadata.
- Keep `/index.html` as an unmodified app shell for the edge renderer to fetch. Do not set CloudFront `default_root_object = "index.html"`; that makes `/` bypass prerendering through the special `/index.html` cache behavior and serves an empty `<div id="root"></div>` homepage.
- Keep bot and user content materially equivalent. Public prerendered pages should expose crawlable links and a concise body that matches the React page's subject matter.
- The `www` host has redirected to the apex with HTTP 301 since May 30, 2026. Preserve that redirect and keep all canonicals/sitemaps on the apex.
- Search Console's Page Indexing, Manual Actions, URL Inspection, and submitted sitemap reports are required to distinguish technical exclusion from a quality/manual-action issue.
- Search Console snapshot on July 16, 2026: Overview showed 1 total web search click, 931 not indexed pages, and 2 indexed pages. Page Indexing last update was July 9, 2026; the main bucket was `Crawled - currently not indexed` with 912 URLs and validation `Started`. Manual Actions and Security Issues both reported no issues. Links report showed 0 external links and only 76 internal links, all to the homepage. Submitted sitemaps were apex-only and successful: root sitemap 1,456 URLs, listings 1,216, browse 238, static 2, all last read June 28, 2026.
- URL Inspection on July 16, 2026: homepage was indexed; `https://persianpages.com/listing/kateh-restaurant` was not indexed (`Crawled - currently not indexed`), last crawled June 28, 2026 as Googlebot smartphone, fetch successful, indexing allowed, canonical set to the inspected URL, and "No referring sitemaps detected" despite the URL appearing in the live listing sitemap.
- SEO remediation deploy on July 16/17, 2026: Terraform removed `default_root_object = "index.html"` from the CloudFront distribution and published Lambda@Edge version 9. CloudFront invalidation `I7R6B8TGD1FSEEKD601DG72QT` cleared `/` and `/index.html`. Post-deploy Googlebot curl confirmed `/` returns prerendered homepage HTML with listing links and country browse links, while `/index.html` remains the raw app shell.
- After the deploy, Search Console indexing requests were accepted for `https://persianpages.com/`, `https://persianpages.com/browse/us`, and `https://persianpages.com/browse/us/los-angeles/restaurant`. The root sitemap was resubmitted using the full URL `https://persianpages.com/sitemap.xml`; GSC showed "Sitemap submitted successfully" and updated the Submitted date to July 16, 2026, with Last read still pending from June 28, 2026.

### Scraping and Enrichment
- `/api/scrape/*` endpoints require `x-scrape-key` matching `ADMIN_API_KEY`.
- Jobs are tracked in memory only; restarting the server loses job status.
- `server/src/routes/scrape.ts` starts background jobs and returns a `jobId`.
- `server/src/services/enrich.ts` delegates to built JS under `server/scripts/enrich.js`; watch build/runtime paths when changing enrichment code.
- `make db-seed` upserts categories and scraped seed listings, then deletes demo `source: "user"` listings with a user.

## Environment Variables

Docker Compose supplies local defaults for DB, ports, support URL, and client API URL. Optional integrations come from `.env`.

Server:

- `DATABASE_URL`
- `JWT_SECRET`
- `PORT` (Docker uses 5001)
- `CLIENT_URL` (`http://localhost:3000` locally)
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`, `TWILIO_MESSAGING_SID`, `TWILIO_VERIFY_SID`
- `SES_FROM_EMAIL`, `SES_REGION`, `AWS_REGION`
- `S3_UPLOADS_BUCKET`, `S3_UPLOADS_REGION`
- `ADMIN_API_KEY`
- `GOOGLE_PLACES_API_KEY`, `YELP_API_KEY`
- `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `LLM_PROVIDER`
- `SUPPORT_SERVICE_URL`

Client:

- `VITE_API_URL` (`http://localhost:5001/api` in Docker)
- `VITE_SUPPORT_URL`
- `VITE_GOOGLE_MAPS_API_KEY`

## Common Tasks

### Add a Listing Field
1. Update `server/prisma/schema.prisma`.
2. Run `make db-push`.
3. Update server create/update/select logic in `server/src/routes/listings.ts`.
4. Update `client/src/types/index.ts`.
5. Update `client/src/services/api.ts` only if request/response shapes change.
6. Update `client/src/pages/ListingForm.tsx` and display surfaces such as `ListingDetail.tsx`, `ListingCard.tsx`, or `BrowsePage.tsx`.

### Add or Change a Public Route
1. Add the React route in `client/src/App.tsx`.
2. Check `Header.tsx` / `Footer.tsx` navigation if discoverability changes.
3. Add or update metadata in `server/src/routes/meta.ts` when the page should be SEO-indexable.
4. Add or update sitemap coverage in `server/src/routes/sitemap.ts`.

### Change Listing Slugs
1. Update slug logic in `server/src/utils/slug.ts`.
2. Verify create/update behavior in `server/src/routes/listings.ts`.
3. Check seeded scraped listing slugs in `server/prisma/seed.ts`.
4. Confirm `/listing/:id` still works with both slug and id.

### Work on Scrape/Enrich
1. Keep `ADMIN_API_KEY` protection on any admin endpoint.
2. Prefer `dryRun: true` first for scrape/enrich/fix jobs.
3. Remember job status is in memory, not persisted.
4. Recheck sitemap cache invalidation if listing visibility or slug data changes.

## Testing and Verification

- There are currently no dedicated test scripts in `client/package.json` or `server/package.json`.
- Use `npm run build` inside `client` and `server` for TypeScript/build verification.
- Use `make up` for full local smoke testing, then check client, server health, auth, search/browse, listing create/edit, OTP-related paths when touched, and logs.
