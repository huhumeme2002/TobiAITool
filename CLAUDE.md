# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This repository is a Vietnamese AI product store:
- Public landing page for selling AI development tools/packages
- Admin dashboard for product/order operations and financial reporting

Stack and runtime model:
- Node.js + Express (server-rendered, no frontend SPA build step)
- EJS templates for UI
- SQLite via `better-sqlite3` (synchronous queries)
- Session auth via `express-session` + `connect-flash`
- File uploads via `multer`

## Development Commands

```bash
# Install dependencies
npm install

# Create/update schema + seed default data
npm run seed

# Run in development (nodemon)
npm run dev

# Run in production mode
npm start
```

Current command gaps (important):
- No build script (`npm run build` is not defined)
- No lint script (`npm run lint` is not defined)
- No test script (`npm test` is not defined)
- No in-repo app test suite currently, so “run a single test” is not applicable yet

## Environment and Local Defaults

From `.env.example`:
- `PORT` (default `3000`)
- `NODE_ENV` (`development`/`production`)
- `SESSION_SECRET`
- `COOKIE_SECURE` (set `false` when local HTTP)
- `DB_PATH` (default `./data/database.sqlite`)

Operational defaults:
- Default admin credentials after seed: `admin / admin123`
- Landing page: `http://localhost:3000`
- Admin: `http://localhost:3000/admin`

## Big-Picture Architecture

### 1) App bootstrap and middleware (`app.js`)
- Loads env config, sets `trust proxy = 1`
- Applies `helmet` (with CSP disabled for inline Chart.js usage)
- Applies compression, JSON/urlencoded body parsing
- Serves static assets from `/public` and uploaded files from `/uploads`
- Configures EJS views
- Configures session + flash + `res.locals` (`success_msg`, `error_msg`, `user`)
- Mounts route modules by bounded domains

### 2) Route-first MVC (thin controllers, model-driven SQL)
Route modules in `routes/` handle:
- Admin auth/session flow
- CRUD for products, orders, transaction proofs, fixed costs
- Financial reporting and CSV/Excel export
- Landing page rendering

Model modules in `models/`:
- Use synchronous `better-sqlite3` prepared statements
- Encapsulate SQL access and basic domain queries
- Return plain objects used directly by EJS views

### 3) Main route domains
- Public:
  - `routes/landing.js`: `/`, `/tonghop`, `/huongdan`, `/huongdan1`, `/huongdan2`, `/huongdan3`
- Admin:
  - `routes/auth.js`: login/logout under `/admin`
  - `routes/dashboard.js`: `/admin/dashboard`
  - `routes/products.js`: `/admin/products`
  - `routes/orders.js`: `/admin/orders`
  - `routes/reports.js`: `/admin/reports`
  - `routes/settings.js`: `/admin/settings`
  - `routes/transactionProofs.js`: `/admin/transaction-proofs`
  - `routes/fixedCosts.js`: `/admin/fixed-costs`

All admin business routes are guarded with `isAuthenticated` middleware (`middleware/auth.js`). The inverse `isNotAuthenticated` guard redirects already-logged-in users away from the login page.

### 4) Data model relationships and invariants
Core tables:
- `users`
- `products`
- `product_packages` (FK `product_id` → `products.id`, `ON DELETE CASCADE`)
- `orders` (FK `product_id` → `products.id`, `ON DELETE SET NULL`)
- `settings` (key-value)
- `transaction_proofs`
- `fixed_costs`

Important business semantics:
- Order economics:
  - `listed_price`: niêm yết
  - `actual_price`: thực thu
  - `cost`: giá vốn
  - `profit = actual_price - cost`
- Revenue/cost/profit metrics in dashboard/reports are computed from `status = 'paid'`
- Fixed costs are subtracted to produce net profit in dashboard/reports

### 5) Critical product-package workflow
When creating/updating products:
- Route helper `savePackagesFromBody()` (in `routes/products.js`) parses package arrays from form data
- `ProductPackage.saveAll(productId, packages)` replaces package rows in a DB transaction

This delete-and-reinsert pattern is the canonical package update mechanism in current code.

### 6) File upload architecture
- Product images: `uploads/products/` (5MB limit)
- Transaction proof images: `uploads/transaction-proofs/` (5MB limit)
- Brand logo uploads (settings): `uploads/` (2MB limit)

Routes handle old-file cleanup on update/delete.

### 7) Reporting flow
`routes/reports.js`:
- Aggregates orders by date range (`day/week/month` grouping)
- Computes gross and net margins
- Exports order data to CSV (`json2csv`) or Excel (`exceljs`)

`models/FixedCost.getTotalByDateRange()` uses overlap logic:
- Any active fixed-cost record whose effective range overlaps the report range contributes full `amount`.

## Seed and Schema Evolution Notes

`config/seed.js` both initializes schema and performs incremental `ALTER TABLE` additions (wrapped in `try/catch`), then inserts default admin/settings/sample data when absent. It is intended to be rerunnable.

Database connection (`config/database.js`):
- Ensures `data/` directory exists
- Uses SQLite WAL mode + foreign keys pragma

## UI / Localization Conventions

- UI copy and flash messages are Vietnamese
- Admin and landing are Bootstrap-based EJS templates with some inline JavaScript (including Chart.js)
- No layout engine — each EJS view is self-contained with full HTML boilerplate; partials are included manually via `<%- include(...) %>`
- Currency formatting uses inline `.toLocaleString('vi-VN')` directly in templates (the `helpers/format.js` file exists but is unused dead code)
- `transaction_proofs` has `sort_order` and `is_visible` fields controlling landing page display

## Utility Scripts

- `change_admin.js` — standalone script to reset admin credentials directly via DB. Edit credentials at the top of the file, then run `node change_admin.js`.
- `DEPLOY.md` — VPS deployment guide covering aaPanel, PM2, Nginx reverse proxy, and Let's Encrypt SSL.

## Repository Instruction Files

- Existing repository guidance file: this `CLAUDE.md`
- No `.cursorrules`, `.cursor/rules/`, or `.github/copilot-instructions.md` files were found in this repo