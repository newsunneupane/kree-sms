# KreeSMS Backend — Node.js/Express

Production-grade Node.js/Express reimplementation of the original PHP `sms-backend` with security hardening, proper architecture, and zero frontend changes required.

---

## Architecture

```
backend/
├── server.js              Entry point — Express app, CORS, Helmet, route mounting
├── migrate.js             Sequelize schema sync (alter mode — safe for existing DB)
├── seed.js                Auto-creates admin user + system settings on startup
├── .env                   All config: DB, JWT, Aakash SMS, SMTP, CORS
│
├── config/
│   └── db.js              Sequelize + pg PostgreSQL connection pool
│
├── middleware/
│   ├── auth.js            JWT Bearer token verification
│   ├── adminAuth.js       Admin role gate
│   ├── errorHandler.js    Centralized error → JSON response
│   ├── rateLimiter.js     express-rate-limit (auth: 10/15min, SMS: 20/min, API: 100/15min)
│   └── validate.js        express-validator result handler
│
├── models/                Sequelize models (9 tables)
│   ├── index.js           Associations + barrel export
│   ├── User.js
│   ├── PendingRegistration.js
│   ├── Contact.js
│   ├── Group.js
│   ├── ContactGroupRelation.js
│   ├── SmsLog.js
│   ├── CreditRequest.js
│   ├── ScheduledSms.js
│   └── SystemSetting.js
│
├── controllers/
│   ├── authController.js       Login
│   ├── registerController.js   Registration (submit + OTP verify)
│   ├── userController.js       Send SMS, buy credits, profile, history, purchases
│   ├── adminController.js      Approve users, manage credits, balances
│   ├── phonebookController.js  Contacts, groups, bulk import
│   └── scheduleController.js   Schedule SMS + fetch scheduled
│
├── routes/               RESTful Express routers
│   ├── authRoutes.js
│   ├── userRoutes.js
│   ├── adminRoutes.js
│   ├── phonebookRoutes.js
│   ├── scheduleRoutes.js
│   └── historyRoutes.js
│
├── compat/               PHP-compatible routes — frontend sends same URLs as before
│   ├── authCompat.js          POST /sms-backend/auth.php
│   ├── registerCompat.js      POST /sms-backend/register.php
│   ├── userCompat.js          GET|POST /sms-backend/user.php
│   ├── adminCompat.js         GET|POST /sms-backend/admin.php
│   ├── phonebookCompat.js     GET|POST /sms-backend/phonebook.php
│   ├── scheduleCompat.js      GET|POST /sms-backend/schedule.php
│   └── historyCompat.js       GET /sms-backend/getuser_history.php
│
├── services/
│   ├── aakashSmsService.js    HTTP client for Aakash SMS gateway v3 API
│   ├── emailService.js        Nodemailer — OTP dispatch (mock logs in dev if no SMTP)
│   └── creditCalculator.js    160-char SMS credit cost calculation
│
├── cron/
│   ├── scheduler.js           Processes pending scheduled_sms rows
│   └── index.js               node-cron — every minute
│
├── validators/
│   └── schemas.js             express-validator rule chains
│
└── utils/
    └── helpers.js              JWT token generation, user sanitizer
```

---

## Quick Start

```bash
cd backend
npm install          # already done
npm run migrate      # sync schema with existing DB (safe alter)
npm run dev          # nodemon — auto-restart on changes
npm start            # production
```

---

## Environment Variables (`.env`)

| Variable | Default | Purpose |
|----------|---------|---------|
| `PORT` | `5000` | Server listen port |
| `NODE_ENV` | `production` | Enables/disables dev logging |
| `DB_HOST` | `localhost` | PostgreSQL host |
| `DB_PORT` | `5432` | PostgreSQL port |
| `DB_NAME` | `sms-backend` | Database name |
| `DB_USER` | `postgres` | Database user |
| `DB_PASS` | `newsun` | Database password |
| `DB_SSL` | *(empty)* | Set `"true"` for cloud Postgres with SSL |
| `JWT_SECRET` | *(required)* | JWT signing key (min 32 chars in production) |
| `JWT_EXPIRES_IN` | `7d` | Token expiry |
| `AAKASH_SMS_TOKEN` | *(pre-filled)* | Aakash SMS gateway auth token |
| `AAKASH_API_URL` | `https://sms.aakashsms.com/sms/v3/send` | SMS send endpoint |
| `AAKASH_CREDIT_URL` | `https://sms.aakashsms.com/sms/v3/credit` | Balance check endpoint |
| `CORS_ORIGIN` | `http://localhost:3000` | Allowed frontend origin |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` | *(optional)* | SMTP for OTP emails |
| `EMAIL_FROM` | `no-reply@kreesms.com` | From address for OTP |

> **Note:** The `.env` file is pre-filled with the local PostgreSQL credentials matching the original PHP setup and the Aakash SMS token. Change `JWT_SECRET` to a unique value in production.

---

## API Endpoints

### PHP-Compatible (`/sms-backend/*.php`)
Frontend sends the same URLs as before — **zero changes required**.

| Method | Path | Action (body/query) | Purpose |
|--------|------|---------------------|---------|
| POST | `/sms-backend/auth.php` | `action=login` | Login |
| POST | `/sms-backend/auth.php` | `action=register` | Legacy register (direct) |
| POST | `/sms-backend/register.php` | `action=submit_registration` | Register with OTP |
| POST | `/sms-backend/register.php` | `action=verify_otp` | Verify OTP code |
| GET | `/sms-backend/user.php` | `action=get_profile` | Fetch SMS balance |
| GET | `/sms-backend/user.php` | `action=get_history` | SMS send logs |
| GET | `/sms-backend/user.php` | `action=get_purchases` | Credit purchase history |
| POST | `/sms-backend/user.php` | `action=send_sms` | Send single/bulk/dynamic SMS |
| POST | `/sms-backend/user.php` | `action=buy_credits` | Request credit purchase |
| GET | `/sms-backend/admin.php` | `action=get_gateway_balance` | System balances |
| GET | `/sms-backend/admin.php` | `action=get_requests` | Pending credit requests |
| GET | `/sms-backend/admin.php` | `action=get_pending_registrations` | Pending user registrations |
| POST | `/sms-backend/admin.php` | `action=add_gateway_credit` | Add to unallocated pool |
| POST | `/sms-backend/admin.php` | `action=approve_request` | Approve credit request |
| POST | `/sms-backend/admin.php` | `action=approve_new_user` | Approve new user registration |
| GET | `/sms-backend/phonebook.php` | `action=get_phonebook` | Paginated contacts + groups |
| POST | `/sms-backend/phonebook.php` | `action=add_contact` | Add single contact |
| POST | `/sms-backend/phonebook.php` | `action=add_bulk_contacts` | Bulk contact import |
| POST | `/sms-backend/phonebook.php` | `action=add_group_with_relations` | Create group from selected contacts |
| GET | `/sms-backend/phonebook.php` | `action=get_group_contacts` | List members of a group |
| POST | `/sms-backend/schedule.php` | `action=schedule_sms` | Schedule an SMS |
| GET | `/sms-backend/schedule.php` | `action=get_scheduled` | List scheduled SMS |
| GET | `/sms-backend/getuser_history.php` | `?user_id=N` | Purchase history |

### RESTful (`/api/sms-backend/...`)
Modern REST routes available alongside PHP compatibility.

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/sms-backend/auth/login` | Login → returns JWT token |
| POST | `/api/sms-backend/auth/register` | Register with OTP |
| POST | `/api/sms-backend/auth/verify-otp` | Verify OTP |
| GET | `/api/sms-backend/user/profile?user_id=N` | User balance |
| GET | `/api/sms-backend/user/history?user_id=N` | SMS logs |
| GET | `/api/sms-backend/user/purchases?user_id=N` | Credit history |
| POST | `/api/sms-backend/user/send-sms` | Send SMS |
| POST | `/api/sms-backend/user/buy-credits` | Request credits |
| GET | `/api/sms-backend/admin/requests` | Pending credit requests |
| GET | `/api/sms-backend/admin/gateway-balance` | System balances |
| GET | `/api/sms-backend/admin/pending-registrations` | Pending users |
| POST | `/api/sms-backend/admin/add-credit` | Add unallocated credit |
| POST | `/api/sms-backend/admin/approve-request` | Approve credit request |
| POST | `/api/sms-backend/admin/approve-user` | Approve new user |
| GET | `/api/sms-backend/phonebook/get-phonebook` | Contacts + groups |
| POST | `/api/sms-backend/phonebook/add-contact` | Add contact |
| POST | `/api/sms-backend/phonebook/add-bulk-contacts` | Bulk import |
| POST | `/api/sms-backend/phonebook/add-group-with-relations` | Create group |
| GET | `/api/sms-backend/phonebook/get-group-contacts` | Group members |
| GET | `/api/sms-backend/schedule/get-scheduled` | Scheduled SMS list |
| POST | `/api/sms-backend/schedule/schedule-sms` | Schedule SMS |
| GET | `/api/sms-backend/history/history?user_id=N` | Purchase history |
| GET | `/api/sms-backend/health` | Health check |

---

## Security Features

| Feature | Implementation |
|---------|---------------|
| **SQL Injection** | Sequelize parameterized queries — no raw string interpolation |
| **Password Storage** | bcryptjs with cost factor 12 |
| **Auth** | JWT Bearer tokens (7-day expiry in `.env`) |
| **Rate Limiting** | Auth: 10 requests/15min, SMS: 20/min, API: 100/15min |
| **HTTP Headers** | Helmet — XSS, clickjacking, MIME sniffing, HSTS |
| **CORS** | Restricted to `CORS_ORIGIN` env var |
| **Input Validation** | express-validator on all sensitive endpoints |
| **Error Handling** | Centralized — no stack traces in production |
| **Transaction Safety** | Sequelize transactions on financial operations (credit approval, user approval) |
| **Body Limits** | 10MB max JSON/URL-encoded body |
| **SSL** | Optional — controlled by `DB_SSL` env var |

---

## Database

Reuses the **existing PostgreSQL database** (`sms-backend`) created by the original PHP backend. Schema is synced via `sequelize.sync({ alter: true })` — adds new columns without dropping existing data.

### Tables (9)

| Table | Purpose |
|-------|---------|
| `users` | User accounts (user/admin roles, SMS balance) |
| `pending_registrations` | Registration staging with OTP flow |
| `contacts` | Phonebook entries |
| `groups` | Contact grouping |
| `contact_group_relations` | Many-to-many junction |
| `sms_logs` | Delivery audit trail |
| `credit_requests` | Purchase order ledger |
| `scheduled_sms` | Future-dated SMS queue |
| `system_settings` | Gateway balance + unallocated pool |

---

## Cron: Scheduled SMS Processing

Runs every minute via `node-cron` in `cron/scheduler.js`:

1. Finds all `scheduled_sms` rows where `status = 'pending'` and `scheduled_at <= NOW()`
2. Verifies user has sufficient SMS balance
3. Deducts credits upfront
4. Sends each message through the Aakash SMS gateway
5. Logs success/failure per message
6. Marks job as `sent` or `failed`

---

## Differences from the PHP Backend

| Area | PHP (`sms-backend/`) | Node.js (`backend/`) |
|------|---------------------|---------------------|
| **Auth** | Plain user object in localStorage | JWT Bearer tokens available |
| **Password** | password_hash (bcrypt) | bcryptjs with hook-based auto-hashing |
| **SQL** | Raw PDO queries | Sequelize ORM — parameterized |
| **Rate limiting** | None | express-rate-limit |
| **Security headers** | Manual CORS only | Helmet (full OWASP coverage) |
| **Validation** | None | express-validator |
| **Error handling** | Inline try/catch per endpoint | Centralized error middleware |
| **Transactions** | Manual beginTransaction/commit | Sequelize managed |
| **Cron** | Standalone php cron-worker.php | In-process node-cron |
| **Architecture** | Monolithic action-switch files | MVC: models/controllers/routes |
| **Config** | Hardcoded in api.php | `.env` via dotenv |
| **Email** | PHP mail() | Nodemailer (mock in dev) |
| **SMS gateway** | cURL | Native https/http modules |

---

## Running

```bash
# Development (with auto-reload)
npm run dev

# Production
npm start

# Manual schema sync
npm run migrate

# Seed admin + settings (auto-runs on server start)
npm run seed
```

The server auto-creates the admin account if missing:
- **Email:** `admin@kreesms.com`
- **Password:** `Admin@123`

Frontend connects at `http://localhost:5000` (updated from `localhost:80`).