# KreeSMS — single Next.js app (frontend + API)

One `npm run dev` / one Vercel project, no CORS, no `NEXT_PUBLIC_API_URL`.

## Quick start (local)

```bash
cd kreesms
cp .env.example .env.local   # then fill in DB + JWT + Aakash values
npm install
npm run migrate              # create/alter Postgres tables
npm run seed                 # admin@kreesms.com / Admin@123 + system settings
npm run dev                  # http://localhost:3000
# optional, second terminal: npm run cron:local   # minute scheduler without Vercel
```

Login flow: register → OTP email → login. JWT is set as an `httpOnly` cookie
(`kreesms_token`); `localStorage["sms_session"]` keeps only the public profile.

## Environment (all server-only — never `NEXT_PUBLIC_`)

| Key | Purpose |
|---|---|
| `DB_HOST/DB_PORT/DB_NAME/DB_USER/DB_PASS`, `DB_SSL` | PostgreSQL (set `DB_SSL=true` on hosted DBs) |
| `JWT_SECRET` (min 32 chars), `JWT_EXPIRES_IN` | auth |
| `AAKASH_SMS_TOKEN`, `AAKASH_API_URL`, `AAKASH_CREDIT_URL` | SMS gateway — read only in `src/lib/aakash.js` |
| `SMTP_HOST/PORT/USER/PASS`, `EMAIL_FROM` | OTP mail (unset = console mock log) |
| `CRON_SECRET` | guards `/api/cron/dispatch-sms` |
| `CRON_LOCAL_ENABLED=true` | run minute scheduler inside `next dev` (alt: `npm run cron:local`) |
| `SMS_HMAC_PEPPER` | signs/verifies public-gateway API keys — rotating it invalidates all issued keys |
| `UPSTASH_REDIS_REST_URL/TOKEN` | cross-instance rate limiting for the public gateway (unset = in-memory fallback) |

`npm run env-check` fails the build if secrets are missing or leaked via `NEXT_PUBLIC_`.

## API map (all require the auth cookie except login/register/verify-otp/health/cron)

```
GET  /api/health
POST /api/auth/login | /api/auth/register | /api/auth/verify-otp
POST /api/auth/logout
GET  /api/auth/me
GET  /api/user/profile | /api/user/history | /api/user/purchases
POST /api/user/send-sms (single|bulk|dynamic, optional scheduled_at) | /api/user/buy-credits
GET  /api/admin/users | /api/admin/requests | /api/admin/gateway-balance (live from Aakash v4 API, `live:true/false`) | /api/admin/pending-registrations
POST /api/admin/add-credit | /api/admin/approve-request | /api/admin/approve-user
GET  /api/phonebook/get-phonebook (?page&limit) | /api/phonebook/get-group-contacts (?group_id)
POST /api/phonebook/add-contact | /api/phonebook/add-bulk-contacts | /api/phonebook/add-group-with-relations
GET  /api/schedule/get-scheduled
POST /api/schedule/schedule-sms
GET  /api/cron/dispatch-sms   (Bearer CRON_SECRET; Vercel Cron every minute — see vercel.json)
```

Third-party gateway (HMAC, no session — see [`docs/public-api.md`](docs/public-api.md)
for the integration guide handed to product teams):

```
POST /api/public/send-sms   (x-api-key, x-timestamp, x-signature, x-request-id)
POST /api/public/send-bulk  (same message to 2–100, all-or-nothing, same HMAC headers, x-request-id = batch ID)
GET  /api/client/profile | /api/client/stats | /api/client/logs   (API holder panel session)
GET  /api/admin/api-clients | /api/admin/public-logs | /api/admin/public-stats
POST /api/admin/api-clients (issue: returns key + secret + panel login once)
POST /api/admin/api-clients/[id]/topup | /api/admin/api-clients/[id]/status
```

Identity comes from the verified JWT, never from a `user_id`/`admin_id` request
field (the old Express code trusted those — hardened during the merge).

## Where the old backend went

| Express | Next.js |
|---|---|
| `server.js` routes + `routes/*` + `compat/*` (compat dropped — clean `/api` only) | `src/app/api/*/route.js` |
| `controllers/*` | logic inside each `route.js` |
| `middleware/auth.js`, `adminAuth.js` | `src/lib/auth.js` (`requireUser`/`requireAdmin`) + `src/proxy.js` presence guard |
| `middleware/rateLimiter.js` (+ `express-rate-limit`) | `src/lib/rate-limit.js` (per-instance; use Upstash Redis for prod) |
| `middleware/errorHandler.js`, `validate.js`, `validators/schemas.js` | `src/lib/api.js` + `src/lib/validators.js` (zod) |
| `utils/helpers.js`, `services/creditCalculator.js` | `src/lib/auth.js` + `src/lib/credits.js` |
| `services/aakashSmsService.js`, `emailService.js` | `src/lib/aakash.js`, `src/lib/email.js` |
| `cron/*` (`node-cron` every minute) | `src/lib/scheduled.js` + `/api/cron/dispatch-sms` + `vercel.json` crons; local via `instrumentation.js`/`cron:local` |
| `config/db.js`, `models/*`, `migrate.js`, `seed.js` | `src/lib/db.js` (singleton, small pool on Vercel), `src/lib/models/*`, `scripts/*.mjs` |
| `helmet`, `cors` | `next.config.mjs` security headers; same-origin so no CORS |

Fixes vs the old backend: bulk-via-group used a non-existent `contacts.group_id`
column — now resolved through the `contact_group_relations` join table; dynamic
CSV messages containing commas are parsed quote-aware.

## Credit counting (matches Aakash)

- Pre-send estimate: proper SMS segmentation in `src/lib/sms-segments.js`
  (GSM-7 160/153, Unicode incl. Nepali 70/67, extended chars double-counted) —
  shared by the server pre-check and all UI cost badges.
- Post-send truth: Aakash's v3 send response carries the exact per-message
  `credit` charged — `actualSmsCredit()` in `src/lib/aakash.js` deducts that
  instead of the estimate, and rejected numbers cost 0. Scheduled jobs reserve
  the estimate up front, then refund the difference after dispatch.

## Deploy on Vercel

Set root directory to `kreesms` (or move its contents to repo root), add all env
vars above in the dashboard, and give the Cron job an `Authorization:
Bearer <CRON_SECRET>` header for `/api/cron/dispatch-sms`. Point `DB_*` at a
hosted Postgres (Supabase/Neon, `DB_SSL=true`).

Future MongoDB move: all routes go through
`src/lib/models/index.js`, so only that seam + `src/lib/db.js` need swapping.

## Notes

- `npm run lint` reports pre-existing `setState`-in-`useEffect` / render-component
  warnings from the original UI code (Next 16 strict rules); they don't block `build`.
- `next build` may warn about workspace root (stray lockfile at `C:\Users\newsu`);
  harmless.
