# SolCacao

SolCacao is an online store for a small chocolate maker. Normal customers can browse the chocolates and buy them, and businesses (cafes, hotels, shops) can request wholesale quotes for custom bars with their own branding. The whole site works in English and Spanish.

We built it as a team project for CSE 5335 (Web Data Management) at UT Arlington. My part was the B2B quote wizard, the Contact page, the English/Spanish localization and the reports.

## What it does

- Product catalog with search and filters (origin, cacao %, price). Search ignores accents, so `jazmin` finds "jazmín".
- Retail and B2B accounts. Sign in uses JWT and passwords are hashed with bcrypt.
- Cart that works without an account and then merges into your account cart when you sign in.
- B2B quote wizard: pick the cacao origin, %, roast, packaging and quantity, and upload your logo or tech pack (AI, PDF, SVG or EPS, up to 10 MB). Only B2B accounts can send quotes.
- Contact form with categories (sampler, wholesale, gifts, support). For a sampler you pick 1 to 4 chocolates.
- Every new quote and inquiry sends an email to the team.
- Reports for the admin: low stock, quotes by status, inquiries by category and active carts.
- All the text comes from one translation dictionary (206 keys) and the user can switch language at any time.

## Tech

- **Frontend:** React 19, Vite, Tailwind CSS
- **Backend:** Node.js, Express 5, MySQL 8 (mysql2)
- **Other:** JWT, bcrypt, Multer for uploads, Nodemailer, Helmet, express-rate-limit
- **Tests:** 58 API tests with Node's built-in test runner

## How it's organized

```
Frontend/         React app
  src/pages/      Home, Catalog, B2B wizard, Contact, Checkout, Auth, Profile
  src/context/    cart and language state
  src/services/   one file per API (auth, products, cart, b2b, inquiries)

Backend/          REST API
  src/routes/     one file per resource, validates input and sends responses
  src/models/     all the SQL lives here
  src/middleware/ auth, uploads, rate limits, error handling
  database/       schema, migration and seed data
  tests/          API tests
```

A request goes route -> model -> MySQL. Routes check the input, models run the queries, and every query uses placeholders so user input never goes straight into SQL.

## Running it locally

You need Node.js 20.19+ and MySQL 8.

**Backend**

```bash
cd Backend
npm install
cp .env.example .env     # then put your MySQL login in it, and run "npm run secret" for JWT_SECRET
npm run db:setup         # creates the database and loads demo data
npm run dev
```

Check http://localhost:3000/api/health. It should say the database is connected.

**Frontend**

```bash
cd Frontend
npm install
cp .env.example .env
npm run dev
```

Demo accounts (password `Cacao2026!` for both):
- Retail: `maria.garcia@example.com`
- B2B: `ramon.torres@chocolatier.com`

**Tests**

```bash
cd Backend
npm test
```

The tests use a separate `solcacao_test` database, so your normal data isn't touched.

The full list of API endpoints is in [Backend/README.md](Backend/README.md).

## Not done yet

- Checkout doesn't place real orders. There's no order table in the database yet.
- The cart is only saved to the account on sign in, reload and sign out, so an item removed while signed in can come back after a reload.
