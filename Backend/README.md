# SolCacao Backend (Phase 3)

REST API for the SolCacao bilingual D2C retail & B2B wholesale platform.
It implements every endpoint the Phase 2 frontend already calls, on top of the
Phase 1 MySQL schema.

**Stack:** Node.js 20.19+ · Express 5 · MySQL 8 (mysql2) · JWT sign-in · bcrypt · Multer uploads · Nodemailer

---

## 1. Setup

You need **Node.js 20.19+** and **MySQL 8.0.16+** running locally.

```bash
cd solcacao-backend
npm install
```

Create your `.env` file from the template:

```bash
copy .env.example .env      # Windows
cp .env.example .env        # macOS / Linux
```

Open `.env` and fill in:

| Setting | What to put |
|---|---|
| `DB_USER`, `DB_PASSWORD` | Your MySQL login (for example `root` and your root password) |
| `JWT_SECRET` | Run `npm run secret` and paste the output |
| `ADMIN_API_KEY` | Any long random text (turns on `/api/reports`) |

Build the database (runs the four SQL files in `database/`, in order):

```bash
npm run db:setup
```

> ⚠️ `db:setup` **deletes and rebuilds** the database named in `DB_NAME`. Run it again any time you want fresh demo data.

Start the API:

```bash
npm run dev        # restarts on file changes
# or
npm start
```

Check it: open <http://localhost:3000/api/health> and you should see `{"status":"ok","database":"connected"}`.

### Connect the frontend

Create `solcacao-frontend/.env` with these three lines, then restart `npm run dev` in the frontend:

```env
VITE_API_BASE_URL=http://localhost:3000
VITE_USE_DEMO_PRODUCTS=false
VITE_USE_DEMO_AUTH=false
```

The frontend now loads products from MySQL, and sign-in, cart, B2B quotes and the Contact form all go to this API.

### Demo accounts

| Account | Email | Password |
|---|---|---|
| Retail | `maria.garcia@example.com` | `Cacao2026!` |
| B2B | `ramon.torres@chocolatier.com` | `Cacao2026!` |

You can also register new accounts from the frontend.

---

## 2. Tests

```bash
npm test
```

58 automated tests cover every endpoint, including the error cases (wrong password, duplicate email, bad files,
invalid sampler picks, and so on). The tests use a **separate database, `solcacao_test`**, that is rebuilt on every run,
so your `solcacao` data is never touched. Your MySQL user needs permission to create that database (`root` has it).

---

## 3. API endpoints

All responses are JSON. Errors always look like `{ "code": "...", "message": "...", "details": [...] }`.
🔒 = needs `Authorization: Bearer <token>` (the frontend sends it automatically).

### Auth: `/api/auth`
| Method | Path | What it does |
|---|---|---|
| POST | `/register` | `{ name, email, password, accountType: "retail" \| "b2b", companyName?, taxId? }` → `201 { accessToken, user }`. B2B needs `companyName` and `taxId`. Duplicate email → `409 account_exists` |
| POST | `/login` | `{ email, password }` → `{ accessToken, user }`. Wrong email or password → `401 invalid_credentials` |
| GET 🔒 | `/me` | The signed-in account |
| PATCH 🔒 | `/me` | Update `name`, `email`, and (B2B only) `companyName`, `taxId` |

### Products: `/api/products`
| Method | Path | What it does |
|---|---|---|
| GET | `/` | Catalog. Filters: `search`, `origin` (repeatable), `cacaoPctMin`, `cacaoPctMax`, `priceMin`, `priceMax`, `seasonal`, `samplerEligible` |
| GET | `/:sku` | One product |

Search is case- and accent-insensitive in both languages (`jazmin` finds "jazmín").

### Cart: `/api/cart` 🔒
| Method | Path | What it does |
|---|---|---|
| GET | `/` | The account's saved cart |
| POST | `/sync` | Body `[{ productId, quantity }]`. Merges the browser cart into the account cart (called on sign-in and page reload). Keeps the larger quantity per product, so syncing twice never doubles items |
| POST | `/persist` | Same body. Replaces the account cart (called on sign-out) |

Unknown products are skipped and listed in `skipped`. `unitPrice` is the price when the item was first added.

### B2B quotes: `/api/b2b` 🔒 B2B accounts only
| Method | Path | What it does |
|---|---|---|
| POST | `/quote` | `multipart/form-data`: `origin`, `targetPercentage`, `roast`, `moldRequired`, `packagingTier`, `estimatedUnits`, optional file `brandVector` (AI/PDF/SVG/EPS, max 10 MB) → `201 { quoteId, status }`. Retail accounts → `403` |
| GET | `/quotes` | The company's own quote requests and their status |

### Contact inquiries: `/api/inquiries` (public)
| Method | Path | What it does |
|---|---|---|
| POST | `/` | `{ name, email, category, message, samplerSelections? }` → `201 { inquiryId }`. Categories: `sampler`, `wholesale`, `gifts`, `support`. For `sampler`, `samplerSelections` must hold 1–4 IDs of products marked `samplerEligible`. Message: 10–5,000 characters |

The team is emailed about every new inquiry and quote. Without SMTP settings the email is printed in the terminal instead.

### Localization: `/api/localization` (public)
| Method | Path | What it does |
|---|---|---|
| GET | `/` | Supported languages (`en`, `es`) |
| GET | `/:lang` | The full dictionary for one language, with the same 206 keys the frontend's `t('key')` uses |

### Reports: `/api/reports` (send header `X-Admin-Key: <ADMIN_API_KEY>`)
| Method | Path | What it does |
|---|---|---|
| GET | `/low-stock` | Products at or below their restock threshold (view `v_low_stock`) |
| GET | `/quotes` | Quote count and total units per status |
| GET | `/inquiries` | Inquiries per category, plus the most-picked sampler chocolates |
| GET | `/carts` | Active carts and their value (view `v_cart_total`) |

Example: `curl -H "X-Admin-Key: your-key" http://localhost:3000/api/reports/low-stock`

---

## 4. Database

`npm run db:setup` runs these files in order:

| File | Phase | Contents |
|---|---|---|
| `solcacao_schema.sql` | 1 | Original schema, **unchanged** |
| `solcacao_seed_data.sql` | 1 | Original seed data, **unchanged** |
| `phase3_migration.sql` | 3 | Additions the frontend needs (below) |
| `phase3_seed_data.sql` | 3 | Catalog products, images, stock, demo passwords, translations |

**What Phase 3 adds to the schema.** All changes are additive, so every Phase 1 row stays valid.

| Table | Change | Why |
|---|---|---|
| `product` | `is_sampler_eligible`, `is_seasonal` | Frontend shows sampler choices and a seasonal showcase |
| `b2b_quote_request` | `origin`, `target_percentage`, `roast`, `mold_required`, `vector_original_name` | The wizard sends these as separate fields; Phase 1 had only free text |
| `inquiry` | Categories `sampler` and `gifts` added | Contact page offers them |
| **new** `inquiry_sampler_selection` | `(inquiry_id, slot_number, sku)` | Weak entity of INQUIRY: one row per chocolate picked for a sampler flight (1NF) |

The Phase 3 seed also gives both Phase 1 users a known password. The Phase 1 hashes were placeholders that matched no
known password. It also stores all 206 frontend translation keys in `translation`.

**Wizard value mapping:** packaging `Standard Kraft` → `standard`, `Luxury Rigid Box` → `premium`,
`Custom Foil Stamped` → `custom` (the Phase 1 ENUM). The frontend's single `name` is split into `first_name` / `last_name`.

---

## 5. Project structure

```
solcacao-backend/
├── database/            SQL files (Phase 1 + Phase 3)
├── public/images/       Product photos served at /images/...
├── scripts/
│   ├── db-setup.js      npm run db:setup
│   └── generate-secret.js
├── src/
│   ├── server.js        Starts the API
│   ├── app.js           Middleware + routes
│   ├── config.js        Reads .env
│   ├── db.js            MySQL pool + transactions
│   ├── routes/          HTTP layer: validation, responses (one file per resource)
│   ├── models/          SQL layer: one file per table group
│   ├── middleware/      auth (JWT), upload (Multer), rate limits, errors
│   ├── services/        mailer
│   └── utils/           validator, row → JSON mappers, HttpError
├── tests/api.test.js    npm test
└── uploads/             Uploaded tech packs (private, not served)
```

Requests flow **route → model → MySQL**. Routes validate input and shape responses; models hold all SQL.

---

## 6. Security

- Passwords hashed with **bcrypt**. Login takes the same time whether or not the email exists.
- **JWT** sign-in tokens (HS256, 1-day expiry). The account is re-read from the database on every request.
- Every SQL query uses **placeholders** (no string concatenation of user input).
- **Role check:** only B2B accounts can request quotes. Reports need an admin key.
- **Uploads:** extension allow-list, 10 MB limit, file contents checked against the extension, random file names,
  and files are never served publicly. Files from failed requests are deleted.
- **CORS** limited to the frontend origin. **Helmet** security headers. **Rate limits** on sign-in (20 per 15 min) and
  the Contact form (10 per 15 min).
- Inquiry and quote rows are written in **transactions**, so a sampler inquiry is saved completely or not at all.

## 7. Not included

- **Checkout / orders:** the frontend's checkout page does not call an API, and the Phase 1 schema has no order table.
- The frontend saves the cart to the account only on sign-in, page reload and sign-out. An item removed while signed in
  can come back after a reload. The fix is on the frontend: call `POST /api/cart/persist` whenever the cart changes.
